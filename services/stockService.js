const Stock = require('../models/Stock');
const YahooFinance = require('yahoo-finance2').default;
const nseSymbols = require('../config/nseSysmbol');

const yahooFinance = new YahooFinance();

class StockService {
  constructor() {
    this.BATCH_SIZE = 10;
    this.PRICE_PRECISION = 2;
    this.MAX_GRAPH_POINTS = 200;
    this.MIN_PRICE_DELTA = 0;
    this.SEED_COOLDOWN_MS = 30000;
    this.lastSeedAttempt = 0;
    this.NSE_STOCKS = Array.isArray(nseSymbols) && nseSymbols.length
      ? nseSymbols
      : [
          'RELIANCE.NS', 'TCS.NS', 'INFY.NS', 'HINDUNILVR.NS', 'LT.NS',
          'MARUTI.NS', 'AXISBANK.NS', 'HDFCBANK.NS', 'ICICIBANK.NS', 'BAJAJFINSV.NS'
        ];
    this.BSE_STOCKS = [
      'RELIANCE.BO', 'TCS.BO', 'INFY.BO', 'HINDUNILVR.BO', 'LT.BO'
    ];
    this.DEFAULT_SYMBOLS = [...this.NSE_STOCKS, ...this.BSE_STOCKS];
  }

  async updateActiveStocks(io, symbolsOverride = null) {
    let activeStocks = symbolsOverride && symbolsOverride.length
      ? await Stock.find({ symbol: { $in: symbolsOverride }, isActive: true })
        .select('symbol price')
        .lean()
      : await Stock.find({ isActive: true })
        .select('symbol price')
        .lean();

    if (!activeStocks.length && !symbolsOverride) {
      const now = Date.now();
      if (now - this.lastSeedAttempt > this.SEED_COOLDOWN_MS) {
        this.lastSeedAttempt = now;
        console.log('No active stocks found. Seeding default symbols.');
        const seedResult = await this.initializeDefaultStocks();
        if (seedResult?.errors?.length) {
          console.error('Seed errors:', seedResult.errors);
        }
      }
      activeStocks = await Stock.find({ isActive: true })
        .select('symbol price')
        .lean();
    }

    if (!activeStocks.length) {
      return { updated: 0, errors: [] };
    }

    const priceMap = new Map(activeStocks.map((s) => [s.symbol, s.price]));
    const symbols = activeStocks.map((s) => s.symbol);
    const errors = [];
    let updated = 0;

    for (let i = 0; i < symbols.length; i += this.BATCH_SIZE) {
      const batch = symbols.slice(i, i + this.BATCH_SIZE);

      try {
        const results = await Promise.allSettled(
          batch.map((symbol) => this.fetchStockQuote(symbol))
        );

        const bulkOps = [];
        const changedStocks = [];

        results.forEach((result, index) => {
          const symbol = batch[index];

          if (result.status === 'fulfilled' && result.value) {
            const stockData = result.value;
            const previousPrice = priceMap.get(symbol);
            const priceChanged =
              typeof previousPrice === 'number'
                ? stockData.price !== previousPrice
                : true;

            if (priceChanged) {
              bulkOps.push({
                updateOne: {
                  filter: { symbol },
                  update: {
                    $set: {
                      ...stockData,
                      lastUpdated: new Date(),
                      lastError: null,
                      lastErrorTime: null
                    },
                    $inc: { updateCount: 1 },
                    $push: {
                      dailyGraph: {
                        $each: [{ timestamp: new Date(), price: stockData.price }],
                        $slice: -this.MAX_GRAPH_POINTS
                      }
                    }
                  }
                }
              });
              changedStocks.push(stockData);
              updated += 1;
            }
          } else {
            const error = result.reason || new Error('Unknown error');
            errors.push({ symbol, error: error.message });
            console.error(`Error fetching ${symbol}:`, error.message);
            bulkOps.push({
              updateOne: {
                filter: { symbol },
                update: {
                  $set: {
                    lastError: error.message,
                    lastErrorTime: new Date()
                  }
                }
              }
            });
          }
        });

        if (bulkOps.length) {
          await Stock.bulkWrite(bulkOps, { ordered: false });
        }

        if (io && changedStocks.length) {
          changedStocks.forEach((stock) => {
            io.to(stock.symbol).emit('stockUpdate', stock);
          });
        }
      } catch (error) {
        errors.push({ batch, error: error.message });
      }
    }

    return { updated, errors };
  }

  async fetchStockQuote(symbol) {
    try {
      let quote;
      try {
        quote = await yahooFinance.quote(symbol, { region: 'IN' });
      } catch (error) {
        quote = await yahooFinance.quote(symbol);
      }
      const formatted = this._formatQuoteData(quote, symbol);
      if (!formatted) {
        throw new Error('No price data');
      }
      return formatted;
    } catch (error) {
      throw error;
    }
  }

  async initializeDefaultStocks() {
    const symbols = this.DEFAULT_SYMBOLS;
    const result = await this.updateSymbols(symbols, { forceUpdate: true });
    if (result?.errors?.length) {
      console.error('Initialization errors:', result.errors);
    }
    return result;
  }

  async updateSpecificStocks(symbols) {
    return this.updateSymbols(symbols, { forceUpdate: true });
  }

  async updateSymbols(symbols, { forceUpdate = false } = {}) {
    if (!Array.isArray(symbols) || !symbols.length) {
      return { updated: 0, errors: [] };
    }

    const errors = [];
    let updated = 0;

    for (let i = 0; i < symbols.length; i += this.BATCH_SIZE) {
      const batch = symbols.slice(i, i + this.BATCH_SIZE);

      try {
        const results = await Promise.allSettled(
          batch.map((symbol) => this.fetchStockQuote(symbol))
        );

        const bulkOps = [];

        results.forEach((result, index) => {
          const symbol = batch[index];

          if (result.status === 'fulfilled' && result.value) {
            const stockData = result.value;
            bulkOps.push({
              updateOne: {
                filter: { symbol },
                update: {
                  $set: {
                    ...stockData,
                    lastUpdated: new Date(),
                    lastError: null,
                    lastErrorTime: null
                  },
                  $setOnInsert: {
                    isActive: true
                  },
                  $inc: { updateCount: 1 },
                  $push: {
                    dailyGraph: {
                      $each: [{ timestamp: new Date(), price: stockData.price }],
                      $slice: -this.MAX_GRAPH_POINTS
                    }
                  }
                },
                upsert: true
              }
            });
            updated += 1;
          } else {
            const error = result.reason || new Error('Unknown error');
            errors.push({ symbol, error: error.message });
            console.error(`Error fetching ${symbol}:`, error.message);
            if (!forceUpdate) {
              bulkOps.push({
                updateOne: {
                  filter: { symbol },
                  update: {
                    $set: {
                      lastError: error.message,
                      lastErrorTime: new Date()
                    }
                  }
                }
              });
            }
          }
        });

        if (bulkOps.length) {
          await Stock.bulkWrite(bulkOps, { ordered: false });
        }
      } catch (error) {
        errors.push({ batch, error: error.message });
        console.error('Batch update error:', error.message);
      }
    }

    if (errors.length) {
      console.error('Update errors:', errors);
    }
    return { updated, errors };
  }

  _formatQuoteData(quote, symbol) {
    if (!quote || quote.regularMarketPrice === undefined || quote.regularMarketPrice === null) {
      return null;
    }

    const exchange = symbol.endsWith('.NS') ? 'NSE' : 'BSE';
    const baseSymbol = symbol.replace(/\.NS$|\.BO$/, '');
    const price = parseFloat((quote.regularMarketPrice || 0).toFixed(this.PRICE_PRECISION));
    const previousClose = parseFloat((quote.regularMarketPreviousClose || 0).toFixed(this.PRICE_PRECISION));
    const change = parseFloat((price - previousClose).toFixed(this.PRICE_PRECISION));
    const percentChange = previousClose
      ? parseFloat(((change / previousClose) * 100).toFixed(2))
      : 0;

    return {
      symbol: symbol.toUpperCase(),
      name: quote.longName || quote.shortName || baseSymbol,
      exchange,
      sector: quote.sector || null,
      industry: quote.industry || null,
      marketCap: quote.marketCap || null,
      image: quote.logoUrl || null,
      price,
      change,
      percentChange,
      volume: quote.volume || 0,
      openPrice: parseFloat((quote.regularMarketOpen || 0).toFixed(this.PRICE_PRECISION)),
      previousClose,
      dayHigh: parseFloat((quote.regularMarketDayHigh || 0).toFixed(this.PRICE_PRECISION)),
      dayLow: parseFloat((quote.regularMarketDayLow || 0).toFixed(this.PRICE_PRECISION)),
      week52High: parseFloat((quote.fiftyTwoWeekHigh || 0).toFixed(this.PRICE_PRECISION)),
      week52Low: parseFloat((quote.fiftyTwoWeekLow || 0).toFixed(this.PRICE_PRECISION)),
      lastTradeTime: quote.regularMarketTime
        ? new Date(quote.regularMarketTime * 1000)
        : new Date()
    };
  }

  async getStockStats() {
    try {
      const stats = await Stock.aggregate([
        {
          $facet: {
            totalStocks: [{ $count: 'count' }],
            activeStocks: [
              { $match: { isActive: true } },
              { $count: 'count' }
            ],
            topGainers: [
              { $sort: { percentChange: -1 } },
              { $limit: 5 },
              { $project: { symbol: 1, price: 1, percentChange: 1 } }
            ],
            topLosers: [
              { $sort: { percentChange: 1 } },
              { $limit: 5 },
              { $project: { symbol: 1, price: 1, percentChange: 1 } }
            ]
          }
        }
      ]);

      return stats[0] || {};
    } catch (error) {
      console.error('Error getting stock stats:', error.message);
      return {};
    }
  }
}

module.exports = new StockService();
