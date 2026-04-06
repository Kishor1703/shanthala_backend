const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const Photo = require('../models/Photo');
const auth = require('../middleware/auth');

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const upload = multer({ 
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const types = /jpeg|jpg|png|webp/;
    if (types.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'));
    }
  },
  limits: { fileSize: MAX_FILE_SIZE }
});

const uploadPhoto = (req, res, next) => {
  upload.single('photo')(req, res, (err) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ message: 'Photo must be 15MB or smaller on the deployed site' });
      return;
    }

    res.status(400).json({ message: err.message || 'Invalid upload' });
  });
};

// Get all photos (public)
router.get('/', async (req, res) => {
  try {
    const { category } = req.query;
    const filter = category ? { category } : {};
    const photos = await Photo.find(filter).sort({ createdAt: -1 });
    res.json(photos);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Upload photo (admin)
router.post('/', auth, uploadPhoto, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    
    const { title, category, featured, altText } = req.body;
    if (!title || !category) {
      return res.status(400).json({ message: 'Title and category are required' });
    }

    const base64Image = req.file.buffer.toString('base64');
    const imageUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    const photo = new Photo({
      title: title.trim(),
      category: category.trim(),
      filename: req.file.originalname || '',
      altText: altText?.trim() || '',
      url: imageUrl,
      featured: featured === 'true' || featured === true
    });
    
    await photo.save();
    res.status(201).json(photo);
  } catch (err) {
    console.error('Photo upload error:', err);
    res.status(500).json({ message: err.message || 'Upload failed' });
  }
});

// Update photo (admin)
router.patch('/:id', auth, async (req, res) => {
  try {
    const update = {
      title: req.body.title?.trim(),
      category: req.body.category?.trim(),
      altText: req.body.altText?.trim() || '',
      featured: req.body.featured === true || req.body.featured === 'true'
    };

    const photo = await Photo.findByIdAndUpdate(req.params.id, update, {
      new: true,
      runValidators: true
    });

    if (!photo) {
      return res.status(404).json({ message: 'Photo not found' });
    }

    res.json(photo);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Delete photo (admin)
router.delete('/:id', auth, async (req, res) => {
  try {
    const photo = await Photo.findById(req.params.id);
    if (!photo) return res.status(404).json({ message: 'Photo not found' });

    // Delete from database
    await Photo.findByIdAndDelete(req.params.id);
    res.json({ message: 'Photo deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
