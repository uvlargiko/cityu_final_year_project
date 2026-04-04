const express = require('express');
const router = express.Router();
const Good = require('../models/Good.js');

router.get('/getallgoods', async (req, res) => {
    try {
        const goods = await Good.find({});
        res.json(goods);
    } catch (error) {
        console.error('Error fetching goods:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

router.get('/:id', async (req, res) => {
    try {
        const good = await Good.findById(req.params.id).lean();
        if (!good) {
            return res.status(404).json({ error: 'Product not found' });
        }
        return res.json(good);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});

router.post('/', async (req, res) => {
    try {
        const payload = req.body || {};
        const created = await Good.create(payload);
        return res.status(201).json(created);
    } catch (error) {
        return res.status(400).json({ error: error.message, details: error.errors || null });
    }
});

router.put('/:id', async (req, res) => {
    try {
        const payload = req.body || {};
        const updated = await Good.findByIdAndUpdate(
            req.params.id,
            payload,
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ error: 'Product not found' });
        }

        return res.json(updated);
    } catch (error) {
        return res.status(400).json({ error: error.message, details: error.errors || null });
    }
});

router.delete('/:id', async (req, res) => {
    try {
        const deleted = await Good.findByIdAndDelete(req.params.id);
        if (!deleted) {
            return res.status(404).json({ error: 'Product not found' });
        }
        return res.json({ success: true, id: req.params.id });
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
});


module.exports = router;
