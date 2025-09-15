const fs = require('fs');
const path = require('path');
const gpxParse = require('gpx-parse');
const { RandomForestClassifier } = require('ml-random-forest');
const Location = require('../models/Location');
const GpxFile = require('../models/GpxFile');


let riskModel = null;


const sampleTrainingData = [
  
  [30, 2.5, 0.1, 80, 0, 2, 0], 
  [60, 1.8, 0.5, 60, 0, 3, 1], 
  [120, 0.5, 2.0, 20, 1, 4, 2], 
  [15, 3.0, 0.05, 90, 0, 1, 0], 
  [90, 1.2, 1.5, 40, 1, 3, 2], 
  [45, 2.0, 0.3, 70, 0, 2, 0], 
  [180, 0.2, 3.0, 10, 1, 5, 2], 
  [75, 1.5, 1.0, 50, 0, 3, 1], 
];

const sampleLabels = [0, 1, 2, 0, 2, 0, 2, 1]; 


const initializeModel = () => {
  if (!riskModel) {
    const options = {
      seed: 42,
      maxFeatures: 4,
      replacement: true,
      nEstimators: 50
    };
    riskModel = new RandomForestClassifier(options);
    riskModel.train(sampleTrainingData, sampleLabels);
    console.log('[ML] Random Forest model initialized with', sampleTrainingData.length, 'training samples');
    console.log('[ML] Model configuration:', options);
  }
};

exports.predictLocation = async (userId) => {
    
    
    return { lat: 43.25, lng: 76.95, confidence: 0.82 };
  };

exports.predictRisk = (features) => {
  try {
    console.log('[ML] Starting risk prediction with features:', features);
    initializeModel();

    
    const prediction = riskModel.predict([features]);
    const probabilities = riskModel.predictProba([features])[0];

    const riskLevels = ['low', 'medium', 'high'];
    const riskLevel = riskLevels[prediction[0]];
    const confidence = Math.max(...probabilities);

    console.log('[ML] Risk prediction result:', {
      riskLevel,
      confidence: confidence.toFixed(3),
      probabilities: {
        low: probabilities[0].toFixed(3),
        medium: probabilities[1].toFixed(3),
        high: probabilities[2].toFixed(3)
      },
      features: {
        timeSinceLastLocation: features[0],
        speed: features[1],
        distanceFromRoute: features[2],
        batteryLevel: features[3],
        isNight: features[4],
        terrainDifficulty: features[5]
      }
    });

    return {
      riskLevel,
      confidence,
      probabilities: {
        low: probabilities[0],
        medium: probabilities[1],
        high: probabilities[2]
      }
    };
  } catch (error) {
    console.error('[ML] Error predicting risk:', error.message);
    console.error('[ML] Features that caused error:', features);
    return {
      riskLevel: 'unknown',
      confidence: 0,
      probabilities: { low: 0, medium: 0, high: 0 }
    };
  }
};

exports.renderForestAlgorithm = async (userId, additionalData = {}) => {
    try {
        console.log('[ML] Starting location prediction for user:', userId);
        console.log('[ML] Additional data:', additionalData);

        
        const lastLocation = await Location.findOne({ userId }).sort({ recordedAt: -1 });
        if (!lastLocation) {
            console.error('[ML] No last location found for user:', userId);
            throw new Error('No last location found');
        }

        
        const lastGpx = await GpxFile.findOne({ userId }).sort({ uploadedAt: -1 });
        if (!lastGpx) {
            throw new Error('No GPX file found');
        }

        
        const gpxPath = path.join(__dirname, '..', lastGpx.path);
        const gpxData = fs.readFileSync(gpxPath, 'utf8');

        return new Promise((resolve, reject) => {
            gpxParse.parseGpx(gpxData, (error, data) => {
                if (error) {
                    reject(error);
                } else {
                    
                    const tracks = data.tracks;
                    if (!tracks || tracks.length === 0) {
                        reject(new Error('No tracks in GPX'));
                        return;
                    }

                    const points = tracks[0].segments[0]; 

                    
                    let totalDistance = 0;
                    let totalTime = 0;
                    for (let i = 1; i < points.length; i++) {
                        const p1 = points[i - 1];
                        const p2 = points[i];
                        const dist = getDistance(p1.lat, p1.lon, p2.lat, p2.lon);
                        const timeDiff = (new Date(p2.time) - new Date(p1.time)) / 1000; 
                        if (timeDiff > 0) {
                            totalDistance += dist;
                            totalTime += timeDiff;
                        }
                    }
                    const avgSpeed = totalTime > 0 ? (totalDistance / totalTime) * 3600 : 0; 

                    
                    const speed = lastLocation.speed || avgSpeed || 5; 

                    
                    const now = new Date();
                    const timeSinceLast = (now - lastLocation.recordedAt) / 1000 / 3600; 

                    
                    const distanceTraveled = speed * timeSinceLast;

                    
                    let minDistance = Infinity;
                    let closestIndex = -1;

                    points.forEach((point, index) => {
                        const distance = getDistance(lastLocation.coords.coordinates[1], lastLocation.coords.coordinates[0], point.lat, point.lon);
                        if (distance < minDistance) {
                            minDistance = distance;
                            closestIndex = index;
                        }
                    });

                    if (closestIndex === -1) {
                        reject(new Error('No closest point found'));
                        return;
                    }

                    
                    let currentIndex = closestIndex;
                    let remainingDistance = distanceTraveled;
                    let currentPoint = points[currentIndex];

                    while (remainingDistance > 0 && currentIndex < points.length - 1) {
                        const nextPoint = points[currentIndex + 1];
                        const segmentDistance = getDistance(currentPoint.lat, currentPoint.lon, nextPoint.lat, nextPoint.lon);

                        if (remainingDistance >= segmentDistance) {
                            remainingDistance -= segmentDistance;
                            currentIndex++;
                            currentPoint = nextPoint;
                        } else {
                            
                            const ratio = remainingDistance / segmentDistance;
                            const lat = currentPoint.lat + (nextPoint.lat - currentPoint.lat) * ratio;
                            const lon = currentPoint.lon + (nextPoint.lon - currentPoint.lon) * ratio;

                            
                            const batteryLevel = additionalData.batteryLevel || 50;
                            const isNight = new Date().getHours() >= 22 || new Date().getHours() <= 6 ? 1 : 0;
                            const terrainDifficulty = additionalData.terrainDifficulty || 2; 

                            const features = [
                                timeSinceLast * 60, 
                                speed,
                                minDistance, 
                                batteryLevel,
                                isNight,
                                terrainDifficulty
                            ];

                            
                            const riskPrediction = this.predictRisk(features);

                            const result = {
                                lat: lat,
                                lng: lon,
                                confidence: 0.8, 
                                distanceFromLast: getDistance(lastLocation.coords.coordinates[1], lastLocation.coords.coordinates[0], lat, lon),
                                timeSinceLast: timeSinceLast,
                                estimatedSpeed: speed,
                                riskAssessment: riskPrediction
                            };

                            console.log('[ML] Location prediction completed:', {
                                userId,
                                predictedLocation: { lat: lat.toFixed(6), lng: lon.toFixed(6) },
                                confidence: result.confidence,
                                distanceFromLast: result.distanceFromLast.toFixed(2) + ' km',
                                timeSinceLast: (timeSinceLast / 60).toFixed(1) + ' minutes',
                                estimatedSpeed: speed.toFixed(2) + ' km/h',
                                riskLevel: riskPrediction.riskLevel,
                                riskConfidence: riskPrediction.confidence.toFixed(3)
                            });

                            resolve(result);
                            return;
                        }
                    }

                    
                    resolve({
                        lat: currentPoint.lat,
                        lng: currentPoint.lon,
                        confidence: 0.7,
                        distanceFromLast: getDistance(lastLocation.coords.coordinates[1], lastLocation.coords.coordinates[0], currentPoint.lat, currentPoint.lon),
                        timeSinceLast: timeSinceLast,
                        estimatedSpeed: speed,
                        riskAssessment: { riskLevel: 'medium', confidence: 0.6 }
                    });
                }
            });
        });
    } catch (error) {
        throw error;
    }
};


function getDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; 
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}
