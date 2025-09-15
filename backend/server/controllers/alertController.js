const Alert = require('../models/Alert');
const User = require('../models/User');
const mlService = require('../services/mlService');
const notificationService = require('../services/notificationService');

exports.createSOS = async (req, res) => {
  try {
    const {
      location,
      batteryLevel,
      terrainDifficulty,
      routeId
    } = req.body;

    console.log('[ALERT] Creating SOS alert for user:', req.user?.id || 'unknown');
    console.log('[ALERT] SOS data:', { location, batteryLevel, terrainDifficulty, routeId });

    // Get ML predictions
    let riskAssessment = null;
    let predictedLocation = null;

    try {
      // Prepare features for risk prediction
      const timeSinceLast = 0; // For SOS, assume current time
      const speed = location?.speed || 0;
      const distanceFromRoute = 0; // Assume on route for SOS
      const isNight = new Date().getHours() >= 22 || new Date().getHours() <= 6 ? 1 : 0;

      const features = [
        timeSinceLast,
        speed,
        distanceFromRoute,
        batteryLevel || 50,
        isNight,
        terrainDifficulty || 2
      ];

      riskAssessment = mlService.predictRisk(features);

      // Get predicted location if we have user data
      if (req.user && req.user._id) {
        const locationPrediction = await mlService.renderForestAlgorithm(req.user._id, {
          batteryLevel: batteryLevel || 50,
          terrainDifficulty: terrainDifficulty || 2
        });

        if (locationPrediction) {
          predictedLocation = {
            latitude: locationPrediction.lat,
            longitude: locationPrediction.lng,
            confidence: locationPrediction.confidence
          };
        }
      }
    } catch (mlError) {
      console.warn('ML prediction failed:', mlError.message);
      // Continue without ML predictions
    }

    const alert = await Alert.create({
      user: req.user.id,
      type: 'SOS',
      location,
      riskAssessment,
      predictedLocation,
      additionalData: {
        batteryLevel,
        terrainDifficulty,
        routeId
      }
    });

    console.log('[ALERT] SOS alert created successfully:', {
      alertId: alert._id,
      userId: req.user.id,
      riskLevel: riskAssessment?.riskLevel || 'unknown',
      riskConfidence: riskAssessment?.confidence?.toFixed(3) || '0.000',
      hasPredictedLocation: !!predictedLocation,
      predictedLocation: predictedLocation ? {
        lat: predictedLocation.latitude?.toFixed(6),
        lng: predictedLocation.longitude?.toFixed(6),
        confidence: predictedLocation.confidence?.toFixed(3)
      } : null
    });

    // Notify rescuers
    const user = await User.findById(req.user.id);
    await notificationService.notifyAlert(alert, user);

    res.status(201).json(alert);
  } catch (error) {
    console.error('Error creating SOS alert:', error);
    res.status(500).json({ message: 'Failed to create SOS alert', error: error.message });
  }
};

exports.getUserAlerts = async (req, res) => {
    try {
      const alerts = await Alert.find({ user: req.user.id }).sort({ createdAt: -1 });
      res.json(alerts);
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch alerts', error: err.message });
    }
  };

exports.resolveAlert = async (req, res) => {
 try {
   const alert = await Alert.findById(req.params.id);
   if (!alert) return res.status(404).json({ message: 'Alert not found' });
   if (alert.user.toString() !== req.user.id) return res.status(403).json({ message: 'Not authorized' });

   alert.status = 'resolved';
   await alert.save();
   res.json(alert);
 } catch (err) {
   res.status(500).json({ message: 'Failed to resolve alert', error: err.message });
 }
};

  exports.createCheckinMissed = async (req, res) => {
    try {
      const {
        controlTimeId,
        routeId,
        batteryLevel,
        terrainDifficulty
      } = req.body;

      console.log('[ALERT] Creating checkin missed alert for user:', req.user?.id || 'unknown');
      console.log('[ALERT] Checkin missed data:', { controlTimeId, routeId, batteryLevel, terrainDifficulty });

      // Get ML predictions for risk assessment
      let riskAssessment = null;
      let predictedLocation = null;

      try {
        // For missed checkin, we need to predict based on time since last location
        if (req.user && req.user._id) {
          const locationPrediction = await mlService.renderForestAlgorithm(req.user._id, {
            batteryLevel: batteryLevel || 50,
            terrainDifficulty: terrainDifficulty || 2
          });

          if (locationPrediction) {
            predictedLocation = {
              latitude: locationPrediction.lat,
              longitude: locationPrediction.lng,
              confidence: locationPrediction.confidence
            };
            riskAssessment = locationPrediction.riskAssessment;
          }
        }
      } catch (mlError) {
        console.warn('ML prediction failed for checkin missed:', mlError.message);
        // Continue without ML predictions
      }

      const alert = await Alert.create({
        user: req.user.id,
        type: 'CHECKIN_MISSED',
        riskAssessment,
        predictedLocation,
        additionalData: {
          controlTimeId,
          routeId,
          batteryLevel,
          terrainDifficulty
        }
      });
  
      console.log('[ALERT] Checkin missed alert created successfully:', {
        alertId: alert._id,
        userId: req.user.id,
        controlTimeId,
        riskLevel: riskAssessment?.riskLevel || 'unknown',
        riskConfidence: riskAssessment?.confidence?.toFixed(3) || '0.000',
        hasPredictedLocation: !!predictedLocation,
        predictedLocation: predictedLocation ? {
          lat: predictedLocation.latitude?.toFixed(6),
          lng: predictedLocation.longitude?.toFixed(6),
          confidence: predictedLocation.confidence?.toFixed(3)
        } : null
      });

      // Notify rescuers
      const user = await User.findById(req.user.id);
      await notificationService.notifyAlert(alert, user);

      res.status(201).json(alert);
    } catch (error) {
      console.error('Error creating checkin missed alert:', error);
      res.status(500).json({ message: 'Failed to create checkin missed alert', error: error.message });
    }
  };

  exports.getGroupAlerts = async (req, res) => {
    try {
      if (!req.user.groupId) {
        return res.status(400).json({ message: 'User not in a group' });
      }
      const alerts = await Alert.find({}).populate('user', 'name').sort({ createdAt: -1 });
      res.json(alerts.filter(a => a.user.groupId?.toString() === req.user.groupId.toString()));
    } catch (err) {
      res.status(500).json({ message: 'Failed to fetch group alerts', error: err.message });
    }
  };
  