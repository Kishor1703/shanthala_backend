const dns = require('dns');
// Configure DNS
dns.setServers(['8.8.8.8','8.8.4.4']);

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
require('dotenv').config();
const { requireEnv } = require('../config');

const app = express();
let isConnected = false;
let startupConfigError = null;
const isVercel = Boolean(process.env.VERCEL);

try {
  requireEnv('MONGO_URI');
  requireEnv('JWT_SECRET');
  requireEnv('ADMIN_USERNAME');
  requireEnv('ADMIN_PASSWORD');
} catch (error) {
  startupConfigError = error;
  console.error('Startup configuration error:', error.message);
}

const uploadsDir = isVercel
  ? path.join('/tmp', 'shanthala-uploads')
  : path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const defaultOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://shanthala.vercel.app',
  'https://www.shanthala.vercel.app'
];

const envOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

const allowedOrigins = [...new Set([...defaultOrigins, ...envOrigins])];

function isAllowedOrigin(origin) {
  if (!origin) return true;
  return allowedOrigins.includes(origin);
}

app.disable('x-powered-by');
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});

app.use(cors({
  origin(origin, callback) {
    if (isAllowedOrigin(origin)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '10mb' }));
app.use('/uploads', express.static(uploadsDir));

app.get('/api/health', (_req, res) => {
  res.status(startupConfigError ? 500 : 200).json({
    ok: !startupConfigError,
    config: startupConfigError ? startupConfigError.message : 'ok',
    dbState: mongoose.connection.readyState
  });
});

app.use('/api/auth', require('../routes/auth'));

const connectToDatabase = async () => {
  if (isConnected && mongoose.connection.readyState === 1) return;

  await mongoose.connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 5000,
    dbName: process.env.MONGO_DB_NAME || undefined,
  });

  isConnected = true;
};

mongoose.connection.on('disconnected', () => {
  isConnected = false;
});

mongoose.connection.on('error', () => {
  isConnected = false;
});

app.use(async (req, res, next) => {
  if (startupConfigError) {
    return res.status(500).json({ message: startupConfigError.message });
  }

  try {
    await connectToDatabase();

    if (mongoose.connection.readyState !== 1) {
      return res.status(500).json({ message: 'Database is not connected' });
    }

    next();
  } catch (err) {
    console.error('MongoDB Error:', err);
    res.status(500).json({ message: `Database connection failed: ${err.message}` });
  }
});

app.use('/api/queries', require('../routes/queries'));
app.use('/api/photos', require('../routes/photos'));

app.use((err, _req, res, _next) => {
  console.error('Unhandled API error:', err);
  res.status(500).json({ message: err.message || 'Internal server error' });
});

module.exports = app;
