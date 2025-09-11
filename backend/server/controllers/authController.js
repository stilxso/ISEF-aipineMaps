const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10');

async function register(req, res) {
  const { email, password, name } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({ email, passwordHash: hash, name });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '7d' });
  res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '7d' });
  res.json({ token, user: { id: user._id, email: user.email, name: user.name } });
}

module.exports = { register, login };
