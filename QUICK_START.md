# 🚀 Quick Start - Live Stock System

## ⚡ 5-Minute Setup

### Backend

```bash
# 1. Install dependencies
npm install socket.io yahoo-finance2

# 2. Start backend
npm start

# Expected output:
# ✅ Connected to live stock server
# 🚀 Starting live update scheduler...
# 📦 Initializing default stocks...
# ✅ Live stock update system initialized
```

### Frontend

```bash
# 1. Install Socket.io client
npm install socket.io-client

# 2. Start frontend
npm start
```

---

## 📊 Display Live Stocks

### Simple Usage

```jsx
import { useStockLive } from './hooks/useStockLive';

export function StockPrice() {
  const { stock } = useStockLive('RELIANCE.NS');

  return (
    <div>
      <h2>{stock?.symbol}</h2>
      <h1 style={{ color: stock?.percentChange > 0 ? 'green' : 'red' }}>
        ₹{stock?.price}
      </h1>
      <p>{stock?.percentChange}%</p>
    </div>
  );
}
```

### Market Overview

```jsx
import { useMarketStats } from './hooks/useStockLive';

export function MarketView() {
  const { stats, loading } = useMarketStats();

  if (loading) return <p>Loading...</p>;

  return (
    <div>
      <h2>🔥 Top Gainers</h2>
      {stats?.topGainers?.map(s => (
        <div key={s.symbol}>
          {s.symbol}: ₹{s.price} (+{s.percentChange}%)
        </div>
      ))}

      <h2>📉 Top Losers</h2>
      {stats?.topLosers?.map(s => (
        <div key={s.symbol}>
          {s.symbol}: ₹{s.price} ({s.percentChange}%)
        </div>
      ))}
    </div>
  );
}
```

### Watchlist

```jsx
import { useMultipleStocks } from './hooks/useStockLive';

export function Watchlist() {
  const { stocks } = useMultipleStocks([
    'RELIANCE.NS',
    'TCS.NS',
    'INFY.NS'
  ]);

  return (
    <table>
      <thead>
        <tr>
          <th>Symbol</th>
          <th>Price</th>
          <th>Change</th>
        </tr>
      </thead>
      <tbody>
        {Object.entries(stocks).map(([symbol, data]) => (
          <tr key={symbol}>
            <td>{symbol}</td>
            <td>₹{data?.price}</td>
            <td>{data?.percentChange}%</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
```

---

## 🔌 Raw Socket Usage

```javascript
import { stockSocket } from './services/stockSocket';

// Connect
stockSocket.connect();

// Watch a stock
stockSocket.onStockUpdate('RELIANCE.NS', (data) => {
  console.log('Price:', data.price);
  console.log('Change:', data.percentChange + '%');
});

// Get market stats
stockSocket.requestStats((stats) => {
  console.log('Top Gainers:', stats.data.topGainers);
});
```

---

## 🧪 API Testing

### Get All Stocks
```bash
curl http://localhost:3001/api/stocks
```

### Get Specific Stock
```bash
curl http://localhost:3001/api/stocks/RELIANCE.NS
```

### Search
```bash
curl "http://localhost:3001/api/stocks/search?query=RELIANCE"
```

### Top Gainers
```bash
curl "http://localhost:3001/api/stocks/gainers?limit=5&exchange=NSE"
```

### Market Stats
```bash
curl http://localhost:3001/api/stocks/stats
```

---

## 🎯 What You Get

✅ Real-time stock prices (updated every 7 seconds)  
✅ Top gainers/losers  
✅ Market statistics  
✅ Price graphs (200-point intraday data)  
✅ 20 NSE + 10 BSE stocks pre-loaded  
✅ WebSocket for instant updates  
✅ React hooks for easy integration  
✅ Optimized database queries  
✅ Error handling & recovery  
✅ Production-ready code  

---

## 📁 Files Created/Updated

### Backend
- ✅ `models/Stock.js` - Updated schema
- ✅ `services/stockService.js` - Core logic
- ✅ `services/liveUpdateScheduler.js` - Update manager
- ✅ `controllers/stockController.js` - API handlers
- ✅ `routes/stocks.js` - REST endpoints
- ✅ `server.js` - Socket.io setup
- ✅ `LIVE_STOCK_SYSTEM.md` - Full documentation

### Frontend  
- ✅ `services/stockSocket.js` - WebSocket client
- ✅ `hooks/useStockLive.js` - React hooks
- ✅ `QUICK_START.md` - This file!

---

## 🔄 How It Works

1. **Backend** fetches stock data from Yahoo Finance every 7 seconds
2. **Scheduler** processes data in batches (15 stocks at a time)
3. **Database** updates only on significant price changes
4. **WebSocket** broadcasts updates to all connected clients
5. **Frontend hooks** trigger React re-renders with new data

---

## 🎨 Example Components

### Stock Card
```jsx
function StockCard({ symbol }) {
  const { stock } = useStockLive(symbol);

  return (
    <div style={{ border: '1px solid #ccc', padding: '1rem' }}>
      <h3>{symbol}</h3>
      {stock && (
        <>
          <div style={{ fontSize: '2em', fontWeight: 'bold' }}>
            ₹{stock.price.toFixed(2)}
          </div>
          <div style={{ 
            color: stock.percentChange > 0 ? 'green' : 'red',
            fontSize: '1.2em'
          }}>
            {stock.percentChange > 0 ? '📈' : '📉'} 
            {stock.percentChange.toFixed(2)}%
          </div>
          <div style={{ fontSize: '0.8em', color: '#666' }}>
            Volume: {stock.volume.toLocaleString()}
          </div>
        </>
      )}
    </div>
  );
}
```

### Market Dashboard
```jsx
function Dashboard() {
  const { stats, loading } = useMarketStats();
  
  if (loading) return <div>📊 Loading market data...</div>;

  return (
    <div>
      <h1>Market Overview</h1>
      
      <section>
        <h2>🟢 Top Gainers</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
          {stats?.topGainers?.map(s => (
            <StockCard key={s.symbol} symbol={s.symbol} />
          ))}
        </div>
      </section>

      <section>
        <h2>🔴 Top Losers</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
          {stats?.topLosers?.map(s => (
            <StockCard key={s.symbol} symbol={s.symbol} />
          ))}
        </div>
      </section>
    </div>
  );
}
```

---

## 🚨 Common Issues

**Problem**: "Cannot find module 'socket.io'"  
**Solution**: Run `npm install socket.io` in backend

**Problem**: "No stocks showing"  
**Solution**: Wait 10 seconds for initial load, then refresh

**Problem**: "Socket connection refused"  
**Solution**: Make sure backend is running on port 3001

**Problem**: "Real-time updates not working"  
**Solution**: Check browser console, verify Socket.io is connected

---

## 📈 Next: Add to Contest

Once working, connect to your contest system:

```jsx
// In ContestDetails or Team Builder
import { useStockLive } from './hooks/useStockLive';

function SelectStocks() {
  const { stock: stockPrice } = useStockLive('RELIANCE.NS');
  
  return (
    <div>
      <h3>RELIANCE (Current: ₹{stockPrice?.price})</h3>
      <p>24h Change: {stockPrice?.percentChange}%</p>
      <button>Add to Team</button>
    </div>
  );
}
```

---

## 💡 Pro Tips

1. **Don't connect too many stocks** - Start with top 10-20
2. **Use memoization** for expensive components
3. **Filter data on backend** - Don't fetch all and filter frontend
4. **Cache common queries** - Gainers/losers rarely change every 7 secs
5. **Debounce re-renders** - Use React.memo for stable data

---

## 📞 Need Help?

- Check `LIVE_STOCK_SYSTEM.md` for detailed docs
- Look at Socket.io events: `io.on('connection', ...)`
- Check browser Network tab for WebSocket frames
- Review backend console logs: `npm start`

---

**Happy Coding! 📈🎉**
