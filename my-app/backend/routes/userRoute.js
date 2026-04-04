const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User.js');
const router = express.Router();

// Register
router.post('/register', async (req, res) => {
  try {
    console.log('[User] Register payload:', req.body);
    const { name, email, password } = req.body;
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ error: 'User already exists' });

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new User({ name, email, password: hashedPassword });
    const savedUser = await user.save();
    console.log('[User] Saved:', savedUser._id);
    res.status(201).json({ message: 'User registered' });
  } catch (error) {
    console.error('[User] Register error:', error.message);
    res.status(500).json({ error: error.message, details: error.errors || null });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid credentials' });

    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin },
      'your_jwt_secret', // Replace with env variable in production
      { expiresIn: '1d' }
    );
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, isAdmin: user.isAdmin } });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user profile
router.get('/profile', async (req, res) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'No token' });
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, 'your_jwt_secret');
    const user = await User.findById(decoded.userId).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;