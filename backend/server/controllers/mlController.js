const mlService = require('../services/mlService');

async function renderForest(req, res) {
  try {
    const userId = req.user._id;
    const additionalData = req.body || {};

    console.log('[ML-API] Render forest request for user:', userId);
    console.log('[ML-API] Additional data:', additionalData);

    const result = await mlService.renderForestAlgorithm(userId, additionalData);

    console.log('[ML-API] Render forest response:', {
      userId,
      hasRiskAssessment: !!result.riskAssessment,
      riskLevel: result.riskAssessment?.riskLevel,
      confidence: result.confidence?.toFixed(3),
      predictedLocation: result.lat && result.lng ? {
        lat: result.lat.toFixed(6),
        lng: result.lng.toFixed(6)
      } : null
    });

    res.json(result);
  } catch (error) {
    console.error('[ML-API] Render forest error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

async function predictRisk(req, res) {
  try {
    const { features } = req.body;

    console.log('[ML-API] Risk prediction request with features:', features);

    if (!features || !Array.isArray(features) || features.length !== 6) {
      console.error('[ML-API] Invalid features array:', features);
      return res.status(400).json({ error: 'Invalid features array. Expected 6 features: [timeSinceLastLocation, speed, distanceFromRoute, batteryLevel, isNight, terrainDifficulty]' });
    }

    const result = mlService.predictRisk(features);

    console.log('[ML-API] Risk prediction response:', {
      riskLevel: result.riskLevel,
      confidence: result.confidence?.toFixed(3),
      probabilities: {
        low: result.probabilities?.low?.toFixed(3),
        medium: result.probabilities?.medium?.toFixed(3),
        high: result.probabilities?.high?.toFixed(3)
      }
    });

    res.json(result);
  } catch (error) {
    console.error('[ML-API] Risk prediction error:', error.message);
    res.status(500).json({ error: error.message });
  }
}

module.exports = { renderForest, predictRisk };