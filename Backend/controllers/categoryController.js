const Category = require('../models/Category');

exports.getAllCategories = async (req, res) => {
  try {
    const { type } = req.query;
    let query = { isActive: true };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    if (type) {
      query.type = type;
    }
    const categories = await Category.find(query).sort({ name: 1 });
    res.status(200).json({ success: true, count: categories.length, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProductCategories = async (req, res) => {
  try {
    const query = { type: 'product', isActive: true };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const categories = await Category.find(query).sort({ name: 1 });
    res.status(200).json({ success: true, count: categories.length, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getExpenseCategories = async (req, res) => {
  try {
    const query = { type: 'expense', isActive: true };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const categories = await Category.find(query).sort({ name: 1 });
    res.status(200).json({ success: true, count: categories.length, categories });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getCategory = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const category = await Category.findOne(query);
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createCategory = async (req, res) => {
  try {
    const category = await Category.create({ ...req.body, owner: req.user.ownerId || req.user._id });
    res.status(201).json({ success: true, message: 'Category created', category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateCategory = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const category = await Category.findOneAndUpdate(query, req.body, { new: true, runValidators: true });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, message: 'Category updated', category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteCategory = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const category = await Category.findOneAndUpdate(query, { isActive: false }, { new: true });
    if (!category) {
      return res.status(404).json({ success: false, message: 'Category not found' });
    }
    res.status(200).json({ success: true, message: 'Category deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};