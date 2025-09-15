const jwt = require('jsonwebtoken');
const User = require('../models/User');

async function authMiddleware(req, res, next) {
  console.log(`Auth middleware: ${req.method} ${req.path}`);
  const header = req.headers.authorization;
  console.log('Authorization header:', header ? 'present' : 'missing');
  if (!header) {
    console.log('No authorization header');
    return res.status(401).json({ error: 'No authorization header' });
  }
  const parts = header.split(' ');
  console.log('Header parts:', parts.length, parts[0]);
  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    console.log('Bad authorization format');
    return res.status(401).json({ error: 'Bad authorization format' });
  }
  const token = parts[1];
  console.log('Token present:', !!token);
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    console.log('JWT payload:', payload);
    const authQueryStart = Date.now();
    const user = await User.findById(payload.id).select('-passwordHash');
    const authQueryTime = Date.now() - authQueryStart;
    console.log(`Auth DB query completed in ${authQueryTime}ms, User found:`, !!user);
    if (!user) {
      console.log('User not found for ID:', payload.id);
      return res.status(401).json({ error: 'User not found' });
    }
    req.user = user;
    console.log('Auth successful for user:', user._id);
    next();
  } catch (err) {
    console.error('Auth error:', err.message);
    return res.status(401).json({ error: 'Invalid token' });
  }
}

module.exports = { protect: authMiddleware };