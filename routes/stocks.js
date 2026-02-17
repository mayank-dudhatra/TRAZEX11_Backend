const express = require('express');
const router = express.Router();
const {
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
} = require('../controllers/stockController');

/**
 * Stock Routes
 * Public endpoints for stock data and live updates
 */

// Public endpoints
router.get('/', getAllStocks);
router.get('/search', searchStocks);
router.get('/stats', getMarketStats);
router.get('/gainers', getTopGainers);
router.get('/losers', getTopLosers);
router.get('/active', getMostActive);
router.get('/history/:symbol', getStockHistory);
router.get('/:symbol', getStockBySymbol);

// Admin endpoints
router.post('/admin/initialize', initializeStocks);
router.post('/admin/force-update', forceUpdateStocks);

module.exports = router;
