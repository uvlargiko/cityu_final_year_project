const express = require('express');
const router = express.Router();
const Order = require('../models/Order.js');

// Create new order
router.post('/create', async (req, res) => {
  try {
    console.log('[Order] Create payload:', req.body);
    const order = new Order(req.body);
    const order_Saved = await order.save();
    console.log('[Order] Saved:', order_Saved._id);
    res.status(201).json(order_Saved);
  } catch (error) {
    console.error('[Order] Create error:', error.message);
    res.status(400).json({ error: error.message, details: error.errors || null });
  }
});

// Get all orders
router.get('/getall', async (req, res) => {
  try {
    const orders = await Order.find({});
    res.json(orders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get orders by user identifier (id, _id, or stored username fallback)
router.get('/user/:userId', async (req, res) => {
  try {
    const userId = (req.params.userId || '').toString().trim();
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const orders = await Order.find({ user: userId }).sort({ createdAt: -1 }).lean();
    return res.json(orders);
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

// Get order by ID
router.get('/:id', async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);
    if (order) {
      res.json(order);
    } else {
      res.status(404).json({ error: 'Order not found' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;