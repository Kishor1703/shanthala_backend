const mongoose = require('mongoose');

const BlogSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  authorName: { type: String, required: true, trim: true },
  authorEmail: { type: String, required: true, trim: true, lowercase: true },
  excerpt: { type: String, required: true, trim: true },
  content: { type: String, required: true, trim: true },
  thumbnailFilename: { type: String, default: '' },
  thumbnailAlt: { type: String, trim: true, default: '' },
  thumbnailUrl: { type: String, required: true },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Blog', BlogSchema);
