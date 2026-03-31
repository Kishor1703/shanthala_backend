const jwt = require('jsonwebtoken');
const { getAuthConfig } = require('../config');

module.exports = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ message: 'No token, authorization denied' });

  try {
    const { jwtSecret } = getAuthConfig();
    const decoded = jwt.verify(token, jwtSecret);
    req.admin = decoded;
    next();
  } catch {
    res.status(401).json({ message: 'Token is not valid' });
  }
};
