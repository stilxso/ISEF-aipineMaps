const HikeSession = require('../models/HikeSession');

async function startHike(req, res) {
  try {
    const { routeId, routeName, startTime, controlTime, startLocation, weather, userId } = req.body;

    const hikeSession = await HikeSession.create({
      routeId,
      routeName,
      startTime,
      startLocation,
      controlTime,
      weather,
      userId: req.user ? req.user._id : userId, // Use authenticated user if available
      status: 'active'
    });

    console.log('[HIKE] New hike session started:', hikeSession._id);
    res.json({ success: true, hikeSession });
  } catch (error) {
    console.error('[HIKE] Error starting hike session:', error);
    res.status(500).json({ error: 'Failed to start hike session' });
  }
}

async function updateHike(req, res) {
  try {
    const { hikeId } = req.params;
    const updateData = req.body;

    const hikeSession = await HikeSession.findByIdAndUpdate(hikeId, updateData, { new: true });

    if (!hikeSession) {
      return res.status(404).json({ error: 'Hike session not found' });
    }

    res.json({ success: true, hikeSession });
  } catch (error) {
    console.error('[HIKE] Error updating hike session:', error);
    res.status(500).json({ error: 'Failed to update hike session' });
  }
}

async function endHike(req, res) {
  try {
    const { hikeId } = req.params;
    const { endTime, endLocation, totalDistance, totalTime } = req.body;

    const hikeSession = await HikeSession.findByIdAndUpdate(hikeId, {
      endTime,
      endLocation,
      totalDistance,
      totalTime,
      status: 'completed'
    }, { new: true });

    if (!hikeSession) {
      return res.status(404).json({ error: 'Hike session not found' });
    }

    console.log('[HIKE] Hike session completed:', hikeSession._id);
    res.json({ success: true, hikeSession });
  } catch (error) {
    console.error('[HIKE] Error ending hike session:', error);
    res.status(500).json({ error: 'Failed to end hike session' });
  }
}

async function getHikeSessions(req, res) {
  try {
    const userId = req.user._id;
    const hikeSessions = await HikeSession.find({ userId }).sort({ startTime: -1 });

    res.json({ success: true, hikeSessions });
  } catch (error) {
    console.error('[HIKE] Error fetching hike sessions:', error);
    res.status(500).json({ error: 'Failed to fetch hike sessions' });
  }
}

async function addAIInteraction(req, res) {
  try {
    const { message, response, timestamp, important, location } = req.body;

    // Find the most recent active hike session for this user
    const activeSession = await HikeSession.findOne({
      userId: req.user ? req.user._id : null,
      status: 'active'
    }).sort({ startTime: -1 });

    if (activeSession) {
      activeSession.aiInteractions.push({
        timestamp: new Date(timestamp),
        message,
        response,
        important
      });
      await activeSession.save();
      console.log('[HIKE] AI interaction added to active session:', activeSession._id);
    } else {
      // Create a general AI interaction log if no active session
      console.log('[HIKE] AI interaction logged (no active session):', { message, important });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('[HIKE] Error adding AI interaction:', error);
    res.status(500).json({ error: 'Failed to add AI interaction' });
  }
}

async function logWeatherAlert(req, res) {
  try {
    const { location, changes, weather } = req.body;

    // Find active hike sessions in the area
    const activeHikes = await HikeSession.find({
      status: 'active',
      'startLocation.latitude': { $gte: location.latitude - 0.01, $lte: location.latitude + 0.01 },
      'startLocation.longitude': { $gte: location.longitude - 0.01, $lte: location.longitude + 0.01 }
    });

    // Log weather alerts for active hikes
    for (const hike of activeHikes) {
      hike.weatherAlerts = hike.weatherAlerts || [];
      hike.weatherAlerts.push({
        timestamp: new Date(),
        location,
        changes,
        weather
      });
      await hike.save();
    }

    console.log(`Weather alert logged for ${activeHikes.length} active hikes`);
    res.json({ success: true, affectedHikes: activeHikes.length });
  } catch (error) {
    console.error('[HIKE] Error logging weather alert:', error);
    res.status(500).json({ error: 'Failed to log weather alert' });
  }
}

async function updateHikeLocation(req, res) {
  try {
    const { hikeId } = req.params;
    const { location, altitude, distancePassed, speed, timestamp } = req.body;

    const hikeSession = await HikeSession.findById(hikeId);

    if (!hikeSession) {
      return res.status(404).json({ error: 'Hike session not found' });
    }

    if (hikeSession.status !== 'active') {
      return res.status(400).json({ error: 'Hike session is not active' });
    }

    // Add waypoint to the hike session
    const waypoint = {
      name: `Location Update`,
      latitude: location[1],
      longitude: location[0],
      timestamp: new Date(timestamp)
    };

    hikeSession.waypoints = hikeSession.waypoints || [];
    hikeSession.waypoints.push(waypoint);

    // Update current stats if provided
    if (altitude !== undefined) {
      // Could store altitude history here if needed
    }

    if (distancePassed !== undefined) {
      hikeSession.totalDistance = distancePassed;
    }

    await hikeSession.save();

    console.log(`[HIKE] Location updated for hike ${hikeId}: ${location[1]}, ${location[0]}`);
    res.json({ success: true, hikeSession });
  } catch (error) {
    console.error('[HIKE] Error updating hike location:', error);
    res.status(500).json({ error: 'Failed to update hike location' });
  }
}

async function syncOfflineData(req, res) {
  try {
    const { hikeId } = req.params;
    const { waypoints, endTime, endLocation, totalDistance, totalTime } = req.body;

    const hikeSession = await HikeSession.findById(hikeId);

    if (!hikeSession) {
      return res.status(404).json({ error: 'Hike session not found' });
    }

    // Add offline waypoints
    if (waypoints && Array.isArray(waypoints)) {
      hikeSession.waypoints = hikeSession.waypoints || [];
      hikeSession.waypoints.push(...waypoints.map(wp => ({
        name: wp.name || 'Offline Point',
        latitude: wp.latitude,
        longitude: wp.longitude,
        timestamp: new Date(wp.timestamp)
      })));
    }

    // Update final stats if hike is being completed
    if (endTime) {
      hikeSession.endTime = new Date(endTime);
      hikeSession.endLocation = endLocation;
      hikeSession.totalDistance = totalDistance;
      hikeSession.totalTime = totalTime;
      hikeSession.status = 'completed';
    }

    await hikeSession.save();

    console.log(`[HIKE] Offline data synced for hike ${hikeId}, added ${waypoints?.length || 0} waypoints`);
    res.json({ success: true, hikeSession });
  } catch (error) {
    console.error('[HIKE] Error syncing offline data:', error);
    res.status(500).json({ error: 'Failed to sync offline data' });
  }
}

module.exports = {
  startHike,
  updateHike,
  endHike,
  getHikeSessions,
  addAIInteraction,
  logWeatherAlert,
  updateHikeLocation,
  syncOfflineData
};