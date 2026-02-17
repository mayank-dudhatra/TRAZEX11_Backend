const express = require('express');
const router = express.Router();
const { authenticate, userOnly } = require('../middleware/auth');
const { getWallet, topUpWallet } = require('../controllers/walletController');

// Apply user authentication to all routes
router.use(authenticate, userOnly);

// @route   GET /api/wallet
// @desc    Get wallet summary
// @access  Private (User only)
router.get('/', getWallet);

// @route   POST /api/wallet/topup
// @desc    Dev helper to add wallet balance
// @access  Private (User only)
router.post('/topup', topUpWallet);

module.exports = router;
