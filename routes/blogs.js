const express = require('express');
const multer = require('multer');
const path = require('path');
const Blog = require('../models/Blog');
const auth = require('../middleware/auth');

const router = express.Router();

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const types = /jpeg|jpg|png|webp/;
    if (types.test(path.extname(file.originalname).toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('Only image files allowed'));
    }
  },
  limits: { fileSize: MAX_FILE_SIZE }
});

const uploadThumbnail = (req, res, next) => {
  upload.single('thumbnail')(req, res, (err) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
      res.status(413).json({ message: 'Thumbnail must be 15MB or smaller on the deployed site' });
      return;
    }

    res.status(400).json({ message: err.message || 'Invalid upload' });
  });
};

router.get('/', async (_req, res) => {
  try {
    const blogs = await Blog.find().sort({ createdAt: -1 });
    res.json(blogs);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

router.post('/', uploadThumbnail, async (req, res) => {
  try {
    const { title, authorName, authorEmail, excerpt, content } = req.body;

    if (!title?.trim() || !authorName?.trim() || !authorEmail?.trim() || !excerpt?.trim() || !content?.trim()) {
      return res.status(400).json({ message: 'Title, author name, email, excerpt, and content are required' });
    }

    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a blog thumbnail image' });
    }

    const base64Image = req.file.buffer.toString('base64');
    const thumbnailUrl = `data:${req.file.mimetype};base64,${base64Image}`;

    const blog = new Blog({
      title: title.trim(),
      authorName: authorName.trim(),
      authorEmail: authorEmail.trim(),
      excerpt: excerpt.trim(),
      content: content.trim(),
      thumbnailFilename: req.file.originalname || '',
      thumbnailAlt: title.trim(),
      thumbnailUrl
    });

    await blog.save();
    res.status(201).json(blog);
  } catch (err) {
    console.error('Blog submission error:', err);
    res.status(500).json({ message: err.message || 'Unable to submit blog' });
  }
});

router.delete('/:id', auth, async (req, res) => {
  try {
    const blog = await Blog.findByIdAndDelete(req.params.id);
    if (!blog) {
      return res.status(404).json({ message: 'Blog not found' });
    }

    res.json({ message: 'Blog deleted successfully' });
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
