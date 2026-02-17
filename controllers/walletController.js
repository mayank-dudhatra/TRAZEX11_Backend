const Wallet = require('../models/Wallet');

// User: Top up wallet (dev helper)
const topUpWallet = async (req, res) => {
  try {
    const amount = Number(req.body?.amount);

    if (!Number.isFinite(amount) || amount <= 0) {
      return res.status(400).json({
        success: false,
        message: 'amount must be a positive number'
      });
    }

    let wallet = await Wallet.findOne({ userId: req.user.id });
    if (!wallet) {
      wallet = await Wallet.create({
        userId: req.user.id,
        balance: 0,
        transactions: []
      });
    }

    wallet.balance += amount;
    wallet.transactions.push({
      type: 'CREDIT',
      amount,
      reason: 'Manual top-up'
    });

    await wallet.save();

    return res.json({
      success: true,
      message: 'Wallet topped up',
      data: {
        balance: wallet.balance
      }
    });
  } catch (error) {
    console.error('Top up wallet error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to top up wallet',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  topUpWallet
};
