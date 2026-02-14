const DateContest = require('../models/DateContest');

const createDateContest = async (req, res) => {
  try {
    const { contestDurationType, marketType, startDate, endDate } = req.body;

    if (!contestDurationType || !marketType || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Missing required date contest fields'
      });
    }

    const parsedStart = new Date(startDate);
    const parsedEnd = new Date(endDate);
    if (Number.isNaN(parsedStart.getTime()) || Number.isNaN(parsedEnd.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date values'
      });
    }
    if (parsedEnd < parsedStart) {
      return res.status(400).json({
        success: false,
        message: 'End date must be on or after the start date'
      });
    }

    const dateContest = await DateContest.create({
      contestDurationType,
      marketType,
      startDate: parsedStart,
      endDate: parsedEnd
    });

    res.status(201).json({
      success: true,
      message: 'Date contest created successfully',
      dateContest
    });
  } catch (error) {
    console.error('Create date contest error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create date contest',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

const getDateContests = async (req, res) => {
  try {
    const { isActive } = req.query;
    const filter = {};

    if (isActive !== undefined) {
      filter.isActive = isActive === 'true';
    }

    const dateContests = await DateContest.find(filter)
      .sort({ startDate: -1 })
      .lean();

    res.json({
      success: true,
      dateContests
    });
  } catch (error) {
    console.error('Get date contests error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch date contests',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  createDateContest,
  getDateContests
};
