const Stock = require('../models/Stock');
const stockService = require('../services/stockService');

const withDailyScoringFields = (stock) => ({
  ...stock,
  dailyBuyPoints: stock.dailyBuyPoints ?? stock.buyPoints ?? 0,
  dailySellPoints: stock.dailySellPoints ?? stock.sellPoints ?? 0,
  dailyMilestonesHit: stock.dailyMilestonesHit ?? stock.dailyMilestones ?? {
    m2: false,
    m5: false,
    m10: false,
    m15: false,
    dayHigh: false,
    dayLow: false,
    volume2x: false,
    volume3x: false
  },
  lastResetDate: stock.lastResetDate ?? stock.lastDailyReset ?? null
});

/**
 * Stock Controller
 * Handles stock-related API endpoints
 */

// Get all active stocks
const getAllStocks = async (req, res) => {
  try {
    const { exchange, limit = 50, skip = 0, sort = '-percentChange' } = req.query;
    
    const filter = { isActive: true };
    if (exchange && ['NSE', 'BSE'].includes(exchange.toUpperCase())) {
      filter.exchange = exchange.toUpperCase();
    }

    const stocks = await Stock.find(filter)
      .sort(sort)
      .limit(parseInt(limit))
      .skip(parseInt(skip))
      .select('-dailyGraph') // Exclude graph for list view
      .lean();

    const total = await Stock.countDocuments(filter);

    res.json({
      success: true,
      data: stocks.map(withDailyScoringFields),
      pagination: {
        total,
        limit: parseInt(limit),
        skip: parseInt(skip),
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Error getting stocks:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stocks',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get single stock by symbol
const getStockBySymbol = async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const stock = await Stock.findOne({ 
      symbol: symbol.toUpperCase() 
    }).lean();

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stock not found'
      });
    }

    res.json({
      success: true,
      data: withDailyScoringFields(stock)
    });
  } catch (error) {
    console.error('Error getting stock:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get top gainers
const getTopGainers = async (req, res) => {
  try {
    const { limit = 10, exchange } = req.query;
    
    const filter = { isActive: true };
    if (exchange && ['NSE', 'BSE'].includes(exchange.toUpperCase())) {
      filter.exchange = exchange.toUpperCase();
    }

    const gainers = await Stock.find(filter)
      .sort({ percentChange: -1 })
      .limit(parseInt(limit))
      .select('-dailyGraph')
      .lean();

    res.json({
      success: true,
      data: gainers.map(withDailyScoringFields)
    });
  } catch (error) {
    console.error('Error getting top gainers:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top gainers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get top losers
const getTopLosers = async (req, res) => {
  try {
    const { limit = 10, exchange } = req.query;
    
    const filter = { isActive: true };
    if (exchange && ['NSE', 'BSE'].includes(exchange.toUpperCase())) {
      filter.exchange = exchange.toUpperCase();
    }

    const losers = await Stock.find(filter)
      .sort({ percentChange: 1 })
      .limit(parseInt(limit))
      .select('-dailyGraph')
      .lean();

    res.json({
      success: true,
      data: losers.map(withDailyScoringFields)
    });
  } catch (error) {
    console.error('Error getting top losers:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch top losers',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get most active stocks by volume
const getMostActive = async (req, res) => {
  try {
    const { limit = 10, exchange } = req.query;
    
    const filter = { isActive: true };
    if (exchange && ['NSE', 'BSE'].includes(exchange.toUpperCase())) {
      filter.exchange = exchange.toUpperCase();
    }

    const active = await Stock.find(filter)
      .sort({ volume: -1 })
      .limit(parseInt(limit))
      .select('-dailyGraph')
      .lean();

    res.json({
      success: true,
      data: active.map(withDailyScoringFields)
    });
  } catch (error) {
    console.error('Error getting most active:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch most active stocks',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get market statistics
const getMarketStats = async (req, res) => {
  try {
    const stats = await stockService.getStockStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error getting market stats:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch market statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Search stocks
const searchStocks = async (req, res) => {
  try {
    const { query, exchange, limit = 20 } = req.query;

    if (!query || query.length < 2) {
      return res.status(400).json({
        success: false,
        message: 'Query must be at least 2 characters'
      });
    }

    const filter = { 
      isActive: true,
      $or: [
        { symbol: { $regex: query, $options: 'i' } },
        { name: { $regex: query, $options: 'i' } }
      ]
    };

    if (exchange && ['NSE', 'BSE'].includes(exchange.toUpperCase())) {
      filter.exchange = exchange.toUpperCase();
    }

    const results = await Stock.find(filter)
      .limit(parseInt(limit))
      .select('-dailyGraph')
      .lean();

    res.json({
      success: true,
      data: results.map(withDailyScoringFields),
      count: results.length
    });
  } catch (error) {
    console.error('Error searching stocks:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to search stocks',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Get stock price history (intraday graph)
const getStockHistory = async (req, res) => {
  try {
    const { symbol } = req.params;
    
    const stock = await Stock.findOne({ 
      symbol: symbol.toUpperCase() 
    }).select('daily Graph lastUpdated').lean();

    if (!stock) {
      return res.status(404).json({
        success: false,
        message: 'Stock not found'
      });
    }

    res.json({
      success: true,
      data: {
        symbol,
        dailyGraph: stock.dailyGraph || [],
        lastUpdated: stock.lastUpdated
      }
    });
  } catch (error) {
    console.error('Error getting stock history:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch stock history',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Initialize stocks (admin only)
const initializeStocks = async (req, res) => {
  try {
    const result = await stockService.initializeDefaultStocks();
    
    res.json({
      success: true,
      message: 'Stock initialization started',
      data: result
    });
  } catch (error) {
    console.error('Error initializing stocks:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize stocks',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// Force update stocks (admin only)
const forceUpdateStocks = async (req, res) => {
  try {
    const { symbols } = req.body;

    if (!Array.isArray(symbols) || symbols.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Symbols array is required'
      });
    }

    const result = await stockService.updateSpecificStocks(symbols);
    
    res.json({
      success: true,
      message: 'Force update triggered',
      data: result
    });
  } catch (error) {
    console.error('Error forcing update:', error.message);
    res.status(500).json({
      success: false,
      message: 'Failed to force update',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getAllStocks,
  getStockBySymbol,
  getTopGainers,
  getTopLosers,
  getMostActive,
  getMarketStats,
  searchStocks,
  getStockHistory,
  initializeStocks,
  forceUpdateStocks
};
