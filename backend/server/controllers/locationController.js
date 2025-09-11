const Location = require('../models/Location');

async function savePoint(req, res) {
  const user = req.user;
  const body = req.body;
  if (!body || typeof body.lat !== 'number' || typeof body.lng !== 'number') {
    return res.status(400).json({ error: 'lat and lng required (numbers)' });
  }

  const loc = await Location.create({
    userId: user._id,
    coords: { type: 'Point', coordinates: [body.lng, body.lat] },
    accuracy: body.accuracy,
    altitude: body.altitude,
    speed: body.speed,
    provider: body.provider,
    recordedAt: body.recordedAt ? new Date(body.recordedAt) : new Date()
  });

  res.json({ ok: true, loc });
}

async function getLast(req, res) {
  const user = req.user;
  const loc = await Location.findOne({ userId: user._id }).sort({ recordedAt: -1 });
  if (!loc) return res.status(404).json({ error: 'No locations found' });
  res.json({ loc });
}

async function getHistory(req, res) {
  const user = req.user;
  const limit = Math.min(1000, parseInt(req.query.limit || '200'));
  const since = req.query.since ? new Date(req.query.since) : null;

  const query = { userId: user._id };
  if (since) query.recordedAt = { $gte: since };

  const list = await Location.find(query).sort({ recordedAt: -1 }).limit(limit);
  res.json({ count: list.length, list });
}

module.exports = { savePoint, getLast, getHistory };