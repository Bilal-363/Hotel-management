const DailyLog = require('../models/DailyLog');

exports.createOrUpdateLog = async (req, res) => {
  try {
    const { date, note } = req.body;

    // Normalize date to start of day (00:00:00) so we have one log per day
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    
    const endOfDay = new Date(startOfDay);
    endOfDay.setDate(endOfDay.getDate() + 1);

    // Find if a log already exists for this day
    let log = await DailyLog.findOne({
      date: { $gte: startOfDay, $lt: endOfDay },
      $or: [{ owner: req.user.ownerId || req.user._id }, { owner: { $exists: false } }, { owner: null }]
    });

    if (log) {
      // Update existing log
      log.note = note;
      await log.save();
    } else {
      // Create new log
      log = await DailyLog.create({
        date: startOfDay,
        note,
        createdBy: req.user?.id,
        owner: req.user.ownerId || req.user._id
      });
    }

    res.status(200).json({ success: true, log });
  } catch (error) {
    console.error('createOrUpdateLog error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLogs = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    let query = {};

    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }

    if (startDate && endDate) {
      query.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
    }

    const logs = await DailyLog.find(query).sort({ date: -1 });
    res.status(200).json({ success: true, logs });
  } catch (error) {
    console.error('getLogs error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteLog = async (req, res) => {
  try {
    const { id } = req.params;
    const query = { _id: id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    await DailyLog.findOneAndDelete(query);
    res.status(200).json({ success: true, message: 'Log deleted' });
  } catch (error) {
    console.error('deleteLog error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};