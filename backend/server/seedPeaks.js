require('dotenv').config();
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const Peak = require('./models/Peak');
const GpxFile = require('./models/GpxFile');
const User = require('./models/User');
const Alert = require('./models/Alert');
const Group = require('./models/Group');
const HikeSession = require('./models/HikeSession');
const Location = require('./models/Location');
const Post = require('./models/Post');

async function seedPeaks() {
  try {
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/aipineMaps', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('Connected to MongoDB');

    
    console.log('Clearing all existing data...');
    await Promise.all([
      Peak.deleteMany({}),
      GpxFile.deleteMany({}),
      User.deleteMany({}),
      Alert.deleteMany({}),
      Group.deleteMany({}),
      HikeSession.deleteMany({}),
      Location.deleteMany({}),
      Post.deleteMany({})
    ]);
    console.log('All existing data cleared');

    
    const peaksData = [
      {
        id: "2311dsaf1iu24gi23g5h1g24",
        name: "Большой Алматинский пик",
        elevation: 3680,
        latitude: 43.055,
        longitude: 76.934,
        description: "Большой Алматинский Пик (БАП) — это пирамидальная вершина в хребте Заилийский Алатау, расположенная в 15 км от Алматы, хорошо узнаваемая с города и популярная для туризма. Высота пика составляет около 3680-3682 метра, а на его склонах находится Тянь-Шаньская астрономическая обсерватория, также известная как «Космостанция»",
        diffGrade: "1A"
      },
      {
        id: "peak_8",
        name: "Пик Советских офицеров",
        elevation: 4376,
        latitude: 43.18,
        longitude: 77.22,
        description: "Пик Советских офицеров — мемориальная вершина в Заилийском Алатау. Высота 4376 метров.",
        diffGrade: "2А"
      }
    ];

    console.log(`Using hardcoded ${peaksData.length} peaks`);

    
    const peaksToInsert = peaksData.map(peak => ({
      id: peak.id,
      name: peak.name,
      elevation: peak.elevation,
      latitude: peak.latitude,
      longitude: peak.longitude,
      description: peak.description,
      diffGrade: peak.diffGrade,
      difficulty: peak.diffGrade, 
      gpxUrl: '',
      lat: peak.latitude, // Keep for backward compatibility
      lon: peak.longitude, // Keep for backward compatibility
    }));

    // Insert peaks
    const insertedPeaks = await Peak.insertMany(peaksToInsert);
    console.log(`Successfully inserted ${insertedPeaks.length} peaks into database`);

  } catch (error) {
    console.error('Error seeding peaks:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
}


seedPeaks();