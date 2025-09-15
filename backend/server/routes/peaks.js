const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const GpxFile = require('../models/GpxFile');
const { getPeaks } = require('../controllers/peaksController');
const peaksService = require('../services/peaksService');

router.get('/', async (req, res) => {
  const startTime = Date.now();
  try {
    console.log(`[DEBUG] /api/peaks - Starting query`);

    
    await getPeaks(req, res);

    const queryTime = Date.now() - startTime;
    console.log(`[DEBUG] /api/peaks - Query completed in ${queryTime}ms`);
  } catch (error) {
    const queryTime = Date.now() - startTime;
    console.error(`[DEBUG] /api/peaks - Error after ${queryTime}ms:`, error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Ошибка получения пиков' });
    }
  }
});


router.get('/database', async (req, res) => {
  try {
    const userId = req.user ? req.user.id : null;
    const peaks = await peaksService.getAllPeaks(userId);
    res.json(peaks);
  } catch (error) {
    console.error('Error fetching peaks:', error);
    res.status(500).json({ error: 'Ошибка получения пиков' });
  }
});


router.get('/difficulty/:difficulty', protect, async (req, res) => {
  try {
    const { difficulty } = req.params;
    const userId = req.user.id;
    const peaks = await peaksService.getPeaksByDifficulty(difficulty, userId);
    res.json(peaks);
  } catch (error) {
    console.error('Error fetching peaks by difficulty:', error);
    res.status(500).json({ error: 'Ошибка получения пиков по сложности' });
  }
});


router.get('/region/:region', protect, async (req, res) => {
  try {
    const { region } = req.params;
    const userId = req.user.id;
    const peaks = await peaksService.getPeaksByRegion(decodeURIComponent(region), userId);
    res.json(peaks);
  } catch (error) {
    console.error('Error fetching peaks by region:', error);
    res.status(500).json({ error: 'Ошибка получения пиков по региону' });
  }
});


router.get('/range/:minDifficulty/:maxDifficulty', protect, async (req, res) => {
  try {
    const { minDifficulty, maxDifficulty } = req.params;
    const userId = req.user.id;
    const peaks = await peaksService.getPeaksByDifficultyRange(minDifficulty, maxDifficulty, userId);
    res.json(peaks);
  } catch (error) {
    console.error('Error fetching peaks by difficulty range:', error);
    res.status(500).json({ error: 'Ошибка получения пиков по диапазону сложности' });
  }
});


router.get('/search/:query', protect, async (req, res) => {
  try {
    const { query } = req.params;
    const userId = req.user.id;
    const peaks = await peaksService.searchPeaks(decodeURIComponent(query), userId);
    res.json(peaks);
  } catch (error) {
    console.error('Error searching peaks:', error);
    res.status(500).json({ error: 'Ошибка поиска пиков' });
  }
});


router.get('/id/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const peak = await peaksService.getPeakById(id, userId);
    if (peak) {
      res.json(peak);
    } else {
      res.status(404).json({ error: 'Пик не найден' });
    }
  } catch (error) {
    console.error('Error fetching peak by ID:', error);
    res.status(500).json({ error: 'Ошибка получения пика' });
  }
});


router.get('/regions/list', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const regions = await peaksService.getRegions(userId);
    res.json(regions);
  } catch (error) {
    console.error('Error fetching regions:', error);
    res.status(500).json({ error: 'Ошибка получения списка регионов' });
  }
});


router.get('/stats/difficulty', protect, async (req, res) => {
  try {
    const userId = req.user.id;
    const stats = await peaksService.getDifficultyStats(userId);
    res.json(stats);
  } catch (error) {
    console.error('Error fetching difficulty stats:', error);
    res.status(500).json({ error: 'Ошибка получения статистики по сложности' });
  }
});


router.get('/nearby/:lat/:lng', protect, async (req, res) => {
  try {
    const { lat, lng } = req.params;
    const radius = req.query.radius || 5;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const radiusKm = parseFloat(radius);
    const userId = req.user.id;

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Неверные координаты' });
    }

    const peaks = await peaksService.findPeaksNearby(latitude, longitude, radiusKm, userId);
    res.json(peaks);
  } catch (error) {
    console.error('Error finding nearby peaks:', error);
    res.status(500).json({ error: 'Ошибка поиска ближайших пиков' });
  }
});


router.get('/closest/:lat/:lng', protect, async (req, res) => {
  try {
    const { lat, lng } = req.params;
    const latitude = parseFloat(lat);
    const longitude = parseFloat(lng);
    const userId = req.user.id;

    if (isNaN(latitude) || isNaN(longitude)) {
      return res.status(400).json({ error: 'Неверные координаты' });
    }

    const peak = await peaksService.findClosestPeak(latitude, longitude, userId);
    if (peak) {
      res.json(peak);
    } else {
      res.status(404).json({ error: 'Ближайший пик не найден' });
    }
  } catch (error) {
    console.error('Error finding closest peak:', error);
    res.status(500).json({ error: 'Ошибка поиска ближайшего пика' });
  }
});


router.get('/gpx/:id', protect, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const filePath = await peaksService.getGpxFilePathByPeakId(id, userId);
    if (filePath) {
      res.download(filePath, `${id}.gpx`);
    } else {
      res.status(404).send('GPX file not found');
    }
  } catch (error) {
    console.error('Error fetching GPX file:', error);
    res.status(500).send('Ошибка получения GPX файла');
  }
});

module.exports = router;