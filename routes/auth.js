const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { getAuthConfig } = require('../config');

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map();

function getClientKey(req, username = '') {
  const forwardedFor = req.headers['x-forwarded-for'];
  const ip = Array.isArray(forwardedFor)
    ? forwardedFor[0]
    : forwardedFor?.split(',')[0]?.trim() || req.ip || 'unknown';

  return `${ip}:${String(username).trim().toLowerCase()}`;
}

function getAttemptState(key) {
  const now = Date.now();
  const existing = attempts.get(key);

  if (!existing || now > existing.expiresAt) {
    const freshState = { count: 0, expiresAt: now + WINDOW_MS };
    attempts.set(key, freshState);
    return freshState;
  }

  return existing;
}

router.post('/login', (req, res) => {
  const { username, password } = req.body;
  const attemptKey = getClientKey(req, username);
  const attemptState = getAttemptState(attemptKey);

  if (attemptState.count >= MAX_ATTEMPTS) {
    const retryAfterSeconds = Math.ceil((attemptState.expiresAt - Date.now()) / 1000);
    res.set('Retry-After', String(Math.max(retryAfterSeconds, 1)));
    return res.status(429).json({ message: 'Too many login attempts. Please try again later.' });
  }

  let authConfig;
  try {
    authConfig = getAuthConfig();
  } catch (error) {
    return res.status(500).json({ message: error.message });
  }

  if (username === authConfig.adminUsername && password === authConfig.adminPassword) {
    attempts.delete(attemptKey);
    const token = jwt.sign({ username }, authConfig.jwtSecret, { expiresIn: '12h' });
    return res.json({
      token,
      admin: { username }
    });
  }

  attemptState.count += 1;
  res.status(401).json({ message: 'Invalid credentials' });
});

module.exports = router;
