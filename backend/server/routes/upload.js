const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const gpxParse = require('gpx-parse');
const turf = require('@turf/turf');
const GpxFile = require('../models/GpxFile');
const { protect } = require('../middleware/authMiddleware');
const peaksService = require('../services/peaksService');

const gpxStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'gpx'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${crypto.randomUUID()}.gpx`;
    cb(null, uniqueName);
  }
});

const photoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'photos'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${crypto.randomUUID()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const uploadGpx = multer({ storage: gpxStorage });
const uploadPhoto = multer({ storage: photoStorage });


async function parseGpxForMetadata(gpxContent) {
  return new Promise(async (resolve, reject) => {
    gpxParse.parseGpx(gpxContent, async (error, data) => {
      if (error) {
        reject(error);
        return;
      }

      try {
        const tracks = data.tracks || [];
        if (!tracks.length) {
          resolve({});
          return;
        }

        const track = tracks[0];
        const segments = track.segments || [];
        if (!segments.length) {
          resolve({});
          return;
        }

        const segment = segments[0];
        const points = segment || [];

        if (points.length < 2) {
          resolve({});
          return;
        }

        
        let totalDistance = 0;
        const coordinates = [];
        let peakHeight = -Infinity;
        let peakLatitude = null;
        let peakLongitude = null;
        let elevationGain = 0;
        let previousElevation = null;

        for (let i = 0; i < points.length; i++) {
          const point = points[i];
          
          coordinates.push([point.lon, point.lat, point.elevation || 0]);

          if (point.elevation != null) {
            if (point.elevation > peakHeight) {
              peakHeight = point.elevation;
              peakLatitude = point.lat;
              peakLongitude = point.lon;
            }

            if (previousElevation != null) {
              const diff = point.elevation - previousElevation;
              if (diff > 0) elevationGain += diff;
            }
            previousElevation = point.elevation;
          }

          if (i > 0) {
            const prev = points[i - 1];
            const segmentDistance = turf.distance(
              turf.point([prev.lon, prev.lat]),
              turf.point([point.lon, point.lat]),
              { units: 'kilometers' }
            );
            totalDistance += segmentDistance;
          }
        }

        
        let difficulty = 'A'; 
        if (elevationGain > 1000 || totalDistance > 20) {
          difficulty = 'C'; 
        } else if (elevationGain > 500 || totalDistance > 10) {
          difficulty = 'B'; 
        }

        
        let matchedPeak = null;
        if (peakLatitude && peakLongitude && peakHeight) {
          
          matchedPeak = await peaksService.matchGpxPeak(peakLatitude, peakLongitude, peakHeight);
        }

        const metadata = {
          total_distance: Number(totalDistance.toFixed(2)),
          elevation_gain: Math.round(elevationGain),
          peak_height: Math.round(peakHeight),
          peak_latitude: peakLatitude,
          peak_longitude: peakLongitude,
          difficulty,
          route_coordinates: coordinates,
          route_type: difficulty === 'A' ? 'hiking' : 'mountaineering',
          estimated_time: totalDistance > 10 ? '8-12 часов' : totalDistance > 5 ? '4-6 часов' : '2-4 часов',
          season: 'май-октябрь'
        };

        
        if (matchedPeak) {
          metadata.matched_peak = {
            id: matchedPeak.id,
            title: matchedPeak.title,
            difficulty: matchedPeak.difficulty,
            region: matchedPeak.region,
            elevation_difference: matchedPeak.elevationDifference
          };
          console.log(`[GPX Match] Found matching peak: ${matchedPeak.title} (${matchedPeak.difficulty})`);
        }

        resolve(metadata);
      } catch (calcError) {
        reject(calcError);
      }
    });
  });
}

router.post('/upload', protect, uploadGpx.single('gpxFile'), async (req, res) => {
  try {
    const userId = req.user.id;
    const filename = req.file.filename;
    const originalName = req.file.originalname;
    const filePath = `uploads/gpx/${filename}`;
    const fullPath = path.join(__dirname, '..', filePath);

    
    let metadata = {};
    try {
      const gpxContent = fs.readFileSync(fullPath, 'utf8');
      const parsedData = await parseGpxForMetadata(gpxContent);
      metadata = parsedData;
    } catch (parseError) {
      console.warn('Failed to extract GPX metadata:', parseError.message);
      
    }

    
    const gpxFile = new GpxFile({
      filename,
      originalName,
      userId,
      path: filePath,
      size: req.file.size,
      ...metadata
    });
    await gpxFile.save();

    res.json({
      message: 'Файл загружен',
      fileId: gpxFile._id,
      downloadUrl: `/api/download/${filename}`,
      metadata
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка загрузки' });
  }
});

router.post('/upload-photo', protect, uploadPhoto.single('photo'), async (req, res) => {
  try {
    const userId = req.user.id;
    const filename = req.file.filename;
    const filePath = `uploads/photos/${filename}`;

    
    const User = require('../models/User');
    await User.findByIdAndUpdate(userId, { photo: filePath });

    res.json({
      message: 'Фото загружено',
      photoUrl: filePath
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка загрузки фото' });
  }
});

module.exports = router;