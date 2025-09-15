const express = require('express');
const router = express.Router();
const hikeController = require('../controllers/hikeController');
const { protect: authMiddleware } = require('../middleware/authMiddleware');


router.post('/start', hikeController.startHike);


router.put('/:hikeId', hikeController.updateHike);


router.post('/:hikeId/end', hikeController.endHike);


router.get('/', authMiddleware, hikeController.getHikeSessions);


router.post('/ai-interaction', hikeController.addAIInteraction);


router.post('/weather-alert', hikeController.logWeatherAlert);


router.post('/:hikeId/location', hikeController.updateHikeLocation);


router.post('/:hikeId/sync', hikeController.syncOfflineData);

module.exports = router;