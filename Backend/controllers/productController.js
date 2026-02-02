const Product = require('../models/Product');

exports.getAllProducts = async (req, res) => {
  try {
    const { category, search, lowStock } = req.query;
    let query = { isActive: true };

    if (category && category !== 'All') {
      query.category = category;
    }

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    if (lowStock === 'true') {
      query.$expr = { $lte: ['$stock', '$minStock'] };
    }

    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }

    const products = await Product.find(query).sort({ name: 1 });
    const validProducts = products.filter(p => p && p.name);
    res.status(200).json({ success: true, count: validProducts.length, products: validProducts });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getProduct = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user && req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const product = await Product.findOne(query);
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create({ ...req.body, owner: req.user.ownerId || req.user._id });
    res.status(201).json({ success: true, message: 'Product created', product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateProduct = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const product = await Product.findOneAndUpdate(query, req.body, { new: true, runValidators: true });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, message: 'Product updated', product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.deleteProduct = async (req, res) => {
  try {
    const query = { _id: req.params.id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const product = await Product.findOneAndUpdate(query, { isActive: false }, { new: true });
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }
    res.status(200).json({ success: true, message: 'Product deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.updateStock = async (req, res) => {
  try {
    const { quantity } = req.body;
    const query = { _id: req.params.id };
    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const product = await Product.findOne(query);

    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    product.stock += parseInt(quantity);
    await product.save();

    res.status(200).json({ success: true, message: 'Stock updated', product });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

exports.getLowStockProducts = async (req, res) => {
  try {
    let query = {
      isActive: true,
      $expr: { $lte: ['$stock', '$minStock'] }
    };

    if (req.user.role !== 'superadmin') {
      const ownerId = req.user.ownerId || req.user._id;
      query.$or = [{ owner: ownerId }, { owner: { $exists: false } }, { owner: null }];
    }
    const products = await Product.find(query).sort({ stock: 1 });

    res.status(200).json({ success: true, count: products.length, products });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};