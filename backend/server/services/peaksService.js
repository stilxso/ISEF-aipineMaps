const turf = require('@turf/turf');
const GpxFile = require('../models/GpxFile');
const Peak = require('../models/Peak');
const archiver = require('archiver');
const fs = require('fs');
const path = require('path');

class PeaksService {
  constructor() {
    
    console.log('[DEBUG] PeaksService: Using MongoDB for peaks data');
  }

  

    async getAllPeaksFromDB(userId = null) {
    try {
      const query = {
        peak_latitude: { $exists: true, $ne: null },
        peak_longitude: { $exists: true, $ne: null },
        peak_height: { $exists: true, $ne: null }
      };

      console.log('[DEBUG] getAllPeaksFromDB - userId:', userId);
      console.log('[DEBUG] getAllPeaksFromDB - base query:', JSON.stringify(query, null, 2));

      if (userId) {
        
        query.$or = [
          { userId: userId },
          { userId: { $exists: false } },
          { userId: null }
        ];
      } else {
        
        query.$or = [
          { userId: { $exists: false } },
          { userId: null }
        ];
      }

      console.log('[DEBUG] getAllPeaksFromDB - final query:', JSON.stringify(query, null, 2));

      const gpxFiles = await GpxFile.find(query);
      console.log('[DEBUG] getAllPeaksFromDB - found', gpxFiles.length, 'GPX files');

      
      const totalCount = await GpxFile.countDocuments();
      console.log('[DEBUG] getAllPeaksFromDB - total GPX files in database:', totalCount);

      if (gpxFiles.length > 0) {
        console.log('[DEBUG] getAllPeaksFromDB - sample file:', {
          filename: gpxFiles[0].filename,
          userId: gpxFiles[0].userId,
          peak_latitude: gpxFiles[0].peak_latitude,
          peak_longitude: gpxFiles[0].peak_longitude,
          peak_height: gpxFiles[0].peak_height
        });
      } else if (totalCount > 0) {
        
        const sampleFile = await GpxFile.findOne();
        console.log('[DEBUG] getAllPeaksFromDB - sample file from database:', {
          filename: sampleFile.filename,
          userId: sampleFile.userId,
          peak_latitude: sampleFile.peak_latitude,
          peak_longitude: sampleFile.peak_longitude,
          peak_height: sampleFile.peak_height,
          hasPeakLat: sampleFile.peak_latitude !== null && sampleFile.peak_latitude !== undefined,
          hasPeakLng: sampleFile.peak_longitude !== null && sampleFile.peak_longitude !== undefined,
          hasPeakHeight: sampleFile.peak_height !== null && sampleFile.peak_height !== undefined
        });
      }

      const peaks = gpxFiles.map((file, index) => ({
        id: `gpx_${file._id}`,
        title: file.originalName.replace('.gpx', '') || `Peak ${index + 1}`,
        latitude: file.peak_latitude,
        longitude: file.peak_longitude,
        elevation: file.peak_height,
        difficulty: file.difficulty || 'unknown',
        elevation_gain: file.elevation_gain || 0,
        length_km: file.total_distance || 0,
        description: 'Peak from GPX file',
        coordinates: file.route_coordinates || [], 
        gpx_download_url: `/api/download/${file.filename}`,
        route_type: file.route_type || 'hiking',
        estimated_time: file.estimated_time || '4-6 часов',
        season: file.season || 'май-октябрь',
        source: 'gpx',
        uploadedAt: file.uploadedAt
      }));

      return peaks;
    } catch (error) {
      console.error('Error fetching peaks from database:', error);
      return [];
    }
  }

    async findPeaksNearby(latitude, longitude, radiusKm = 5, userId = null) {
    const peaks = await this.getAllPeaksFromDB(userId);
    const userPoint = turf.point([longitude, latitude]);

    return peaks.filter(peak => {
      const peakPoint = turf.point([peak.longitude, peak.latitude]);
      const distance = turf.distance(userPoint, peakPoint, { units: 'kilometers' });
      return distance <= radiusKm;
    }).map(peak => ({
      id: peak.id,
      title: peak.title,
      latitude: peak.latitude,
      longitude: peak.longitude,
      elevation: peak.elevation,
      difficulty: peak.difficulty,
      coordinates: peak.coordinates,
      gpx_download_url: peak.gpx_download_url
    }));
  }

    async findClosestPeak(latitude, longitude, userId = null) {
    try {
      const peaks = await Peak.find({});
      const userPoint = turf.point([longitude, latitude]);
      let closestPeak = null;
      let minDistance = Infinity;

      peaks.forEach(peak => {
        const peakPoint = turf.point([peak.lon, peak.lat]);
        const distance = turf.distance(userPoint, peakPoint, { units: 'kilometers' });

        if (distance < minDistance) {
          minDistance = distance;
          closestPeak = {
            id: peak.id,
            title: peak.name,
            latitude: peak.lat,
            longitude: peak.lon,
            elevation: null,
            difficulty: peak.difficulty,
            coordinates: [],
            gpx_download_url: peak.gpxUrl,
            distance: Math.round(distance * 100) / 100
          };
        }
      });

      return closestPeak;
    } catch (error) {
      console.error('Error finding closest peak:', error);
      return null;
    }
  }

    async matchGpxPeak(latitude, longitude, elevation, userId = null) {
    
    const nearbyPeaks = await this.findPeaksNearby(latitude, longitude, 2, userId);

    if (nearbyPeaks.length === 0) {
      return null;
    }

    
    let bestMatch = null;
    let minElevationDiff = Infinity;

    nearbyPeaks.forEach(peak => {
      const elevationDiff = Math.abs(peak.elevation - elevation);
      if (elevationDiff < minElevationDiff && elevationDiff <= 100) { 
        minElevationDiff = elevationDiff;
        bestMatch = {
          id: peak.id,
          title: peak.title,
          latitude: peak.latitude,
          longitude: peak.longitude,
          elevation: peak.elevation,
          difficulty: peak.difficulty,
          coordinates: peak.coordinates,
          gpx_download_url: peak.gpx_download_url,
          elevationDifference: elevationDiff,
          matched: true
        };
      }
    });

    return bestMatch;
  }

    async getPeaksByDifficulty(difficulty, userId = null) {
    try {
      const peaks = await Peak.find({ difficulty });
      return peaks.map(peak => ({
        id: peak.id,
        title: peak.name,
        latitude: peak.lat,
        longitude: peak.lon,
        elevation: null,
        difficulty: peak.difficulty,
        coordinates: [],
        gpx_download_url: peak.gpxUrl
      }));
    } catch (error) {
      console.error('Error fetching peaks by difficulty:', error);
      return [];
    }
  }

    async getPeaksByRegion(region, userId = null) {
    const peaks = await this.getAllPeaksFromDB(userId);
    return peaks.filter(peak => peak.region === region).map(peak => ({
      id: peak.id,
      title: peak.title,
      latitude: peak.latitude,
      longitude: peak.longitude,
      elevation: peak.elevation,
      difficulty: peak.difficulty,
      coordinates: peak.coordinates,
      gpx_download_url: peak.gpx_download_url
    }));
  }

    async getAllPeaks(userId = null) {
    try {
      console.log('[DEBUG] PeaksService.getAllPeaks called with userId:', userId);

      const peaks = await Peak.find({});
      const result = peaks.map(peak => ({
        id: peak.id,
        title: peak.name,
        latitude: peak.lat,
        longitude: peak.lon,
        elevation: null,
        difficulty: peak.difficulty,
        coordinates: [],
        gpx_download_url: peak.gpxUrl
      }));

      console.log('[DEBUG] PeaksService.getAllPeaks returning', result.length, 'peaks');
      return result;
    } catch (error) {
      console.error('Error fetching peaks:', error);
      return [];
    }
  }

    async getPeakById(id, userId = null) {
    try {
      const peak = await Peak.findOne({ id });
      if (!peak) return null;

      return {
        id: peak.id,
        title: peak.name,
        latitude: peak.lat,
        longitude: peak.lon,
        elevation: null,
        difficulty: peak.difficulty,
        coordinates: [],
        gpx_download_url: peak.gpxUrl
      };
    } catch (error) {
      console.error('Error fetching peak by ID:', error);
      return null;
    }
  }

    async getPeaksByDifficultyRange(minDifficulty, maxDifficulty, userId = null) {
    const peaks = await this.getAllPeaksFromDB(userId);
    const difficultyOrder = ['1a', '1b', '2a', '2b', '3a', '3b', '4a', '4b', '5a', '5b', '6a'];

    const minIndex = difficultyOrder.indexOf(minDifficulty);
    const maxIndex = difficultyOrder.indexOf(maxDifficulty);

    if (minIndex === -1 || maxIndex === -1 || minIndex > maxIndex) {
      return [];
    }

    const allowedDifficulties = difficultyOrder.slice(minIndex, maxIndex + 1);

    return peaks.filter(peak => allowedDifficulties.includes(peak.difficulty)).map(peak => ({
      id: peak.id,
      title: peak.title,
      latitude: peak.latitude,
      longitude: peak.longitude,
      elevation: peak.elevation,
      difficulty: peak.difficulty,
      coordinates: peak.coordinates,
      gpx_download_url: peak.gpx_download_url
    }));
  }

    async getRegions(userId = null) {
    const peaks = await this.getAllPeaksFromDB(userId);
    const regions = [...new Set(peaks.map(peak => peak.region))];
    return regions;
  }

    async getDifficultyStats(userId = null) {
    const peaks = await this.getAllPeaksFromDB(userId);
    const stats = {};
    peaks.forEach(peak => {
      stats[peak.difficulty] = (stats[peak.difficulty] || 0) + 1;
    });
    return stats;
  }

    async searchPeaks(query, userId = null) {
    const peaks = await this.getAllPeaksFromDB(userId);
    const lowerQuery = query.toLowerCase();
    return peaks.filter(peak =>
      peak.title.toLowerCase().includes(lowerQuery) ||
      peak.region.toLowerCase().includes(lowerQuery) ||
      peak.description.toLowerCase().includes(lowerQuery)
    ).map(peak => ({
      id: peak.id,
      title: peak.title,
      latitude: peak.latitude,
      longitude: peak.longitude,
      elevation: peak.elevation,
      difficulty: peak.difficulty,
      coordinates: peak.coordinates,
      gpx_download_url: peak.gpx_download_url
    }));
  }

    async getGpxFilePathByPeakId(id, userId = null) {
    try {
      const peak = await Peak.findOne({ id });
      if (!peak) return null;

      
      const gpxFileName = `${id}.gpx`;
      const filePath = path.join(__dirname, '..', 'uploads', 'gpx', gpxFileName);

      if (fs.existsSync(filePath)) {
        return filePath;
      }

      return null;
    } catch (error) {
      console.error('Error getting GPX file path:', error);
      return null;
    }
  }

    async createPeaksZipByDifficulty(difficulty, userId = null) {
    try {
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      const filteredPeaks = await Peak.find({ diffGrade: difficulty });

      for (const peak of filteredPeaks) {
        const gpxFileName = `${peak.id}.gpx`;
        const filePath = path.join(__dirname, '..', 'uploads', 'gpx', gpxFileName);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: gpxFileName });
        }
      }

      archive.finalize();

      return archive;
    } catch (error) {
      console.error('Error creating peaks zip by difficulty:', error);
      throw error;
    }
  }

    async createPeaksZipByRegion(region, userId = null) {
    
    
    const query = {
      peak_latitude: { $exists: true, $ne: null },
      peak_longitude: { $exists: true, $ne: null },
      peak_height: { $exists: true, $ne: null }
      
    };

    if (userId) {
      query.$or = [
        { userId: userId },
        { userId: { $exists: false } },
        { userId: null }
      ];
    } else {
      query.$or = [
        { userId: { $exists: false } },
        { userId: null }
      ];
    }

    const gpxFiles = await GpxFile.find(query);

    const archive = archiver('zip', {
      zlib: { level: 9 }
    });

    for (const file of gpxFiles) {
      const filePath = path.join(__dirname, '..', file.path);
      if (fs.existsSync(filePath)) {
        archive.file(filePath, { name: file.originalName });
      }
    }

    archive.finalize();

    return archive;
  }

    async createPeaksZip(userId = null) {
    try {
      const archive = archiver('zip', {
        zlib: { level: 9 }
      });

      const peaks = await Peak.find({});

      for (const peak of peaks) {
        const gpxFileName = `${peak.id}.gpx`;
        const filePath = path.join(__dirname, '..', 'uploads', 'gpx', gpxFileName);
        if (fs.existsSync(filePath)) {
          archive.file(filePath, { name: gpxFileName });
        }
      }

      archive.finalize();

      return archive;
    } catch (error) {
      console.error('Error creating peaks zip:', error);
      throw error;
    }
  }
}


module.exports = new PeaksService();