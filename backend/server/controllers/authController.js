const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS || '10');

async function register(req, res) {
  const { email, password, name, phoneNumber, fullName, equipment, route, departureDateTime, role } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  const existing = await User.findOne({ email });
  if (existing) return res.status(400).json({ error: 'Email already registered' });

  const hash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await User.create({
    email,
    passwordHash: hash,
    name,
    phoneNumber,
    fullName,
    equipment,
    route,
    departureDateTime,
    role: role || 'user'
  });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '7d' });
  res.json({
    token,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      equipment: user.equipment,
      route: user.route,
      departureDateTime: user.departureDateTime,
      role: user.role
    }
  });
}

async function login(req, res) {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: 'Invalid credentials' });

  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(400).json({ error: 'Invalid credentials' });

  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || '7d' });
  res.json({
    token,
    user: {
      id: user._id,
      email: user.email,
      name: user.name,
      phoneNumber: user.phoneNumber,
      fullName: user.fullName,
      equipment: user.equipment,
      route: user.route,
      departureDateTime: user.departureDateTime,
      role: user.role
    }
  });
}

async function updatePreparation(req, res) {
  try {
    const { hikeSession, dataRetentionConsent } = req.body;
    const userId = req.user.id;

    const updateData = {};
    if (hikeSession) {
      updateData.hikeSession = hikeSession;
    }
    if (dataRetentionConsent !== undefined) {
      updateData.dataRetentionConsent = dataRetentionConsent;
    }

    const user = await User.findByIdAndUpdate(userId, updateData, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      message: 'Preparation data updated successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        hikeSession: user.hikeSession,
        dataRetentionConsent: user.dataRetentionConsent
      }
    });
  } catch (error) {
    console.error('Error updating preparation:', error);
    res.status(500).json({ error: 'Failed to update preparation data' });
  }
}

async function getProfile(req, res) {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    res.json({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        phoneNumber: user.phoneNumber,
        fullName: user.fullName,
        equipment: user.equipment,
        route: user.route,
        departureDateTime: user.departureDateTime,
        role: user.role,
        hikeSession: user.hikeSession,
        dataRetentionConsent: user.dataRetentionConsent
      }
    });
  } catch (error) {
    console.error('Error getting profile:', error);
    res.status(500).json({ error: 'Failed to get profile' });
  }
}

module.exports = { register, login, updatePreparation, getProfile };
