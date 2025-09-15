const Peak = require('../models/Peak');

async function getPeaks(req, res) {
  try {
    const peaks = await Peak.find({});

    // Transform to frontend expected format
    const formattedPeaks = peaks.map(peak => ({
      id: peak.id,
      title: peak.name,
      latitude: peak.latitude,
      longitude: peak.longitude,
      elevation: peak.elevation,
      difficulty: peak.diffGrade || peak.difficulty,
      description: peak.description,
      gpx_download_url: peak.gpxUrl,
      source: 'database',
      uploadedAt: peak.createdAt,
      type: 'peak'
    }));

    res.json(formattedPeaks);
  } catch (error) {
    console.error('Error fetching peaks:', error);
    res.status(500).json({ error: 'Failed to fetch peaks' });
  }
}

module.exports = { getPeaks };