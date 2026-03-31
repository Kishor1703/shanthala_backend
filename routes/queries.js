const express = require('express');
const router = express.Router();
const Query = require('../models/Query');
const auth = require('../middleware/auth');

// Submit query (public)
router.post('/', async (req, res) => {
  try {
    const { name, email, phone, message } = req.body;

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return res.status(400).json({ message: 'Name, email, and message are required' });
    }

    const query = new Query({
      name: name.trim(),
      email: email.trim(),
      phone: phone?.trim() || '',
      message: message.trim()
    });

    await query.save();
    res.status(201).json({ message: 'Query submitted successfully', query });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get all queries (admin)
router.get('/', auth, async (req, res) => {
  try {
    const queries = await Query.find().sort({ createdAt: -1 });
    res.json(queries);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Get single query (admin)
router.get('/:id', auth, async (req, res) => {
  try {
    const query = await Query.findById(req.params.id);
    if (!query) return res.status(404).json({ message: 'Query not found' });
    
    // Mark as read
    if (query.status === 'new') {
      query.status = 'read';
      await query.save();
    }
    res.json(query);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Update query status (admin)
router.patch('/:id/status', auth, async (req, res) => {
  try {
    if (!['new', 'read', 'replied'].includes(req.body.status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const query = await Query.findByIdAndUpdate(
      req.params.id, 
      { status: req.body.status },
      { new: true }
    );

    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    res.json(query);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete query (admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const query = await Query.findByIdAndDelete(req.params.id);
    if (!query) {
      return res.status(404).json({ message: 'Query not found' });
    }

    res.json({ message: 'Query deleted' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
