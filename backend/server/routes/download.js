const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const GpxFile = require('../models/GpxFile');
const { protect } = require('../middleware/authMiddleware');


router.get('/download/trail/:filename', async (req, res) => {
  try {
    const { filename } = req.params;
    console.log(`[DEBUG] /api/download/trail/${filename} - Download request received`);

    
    const allowedFiles = [
      'bigalmatypeak.gpx',
      'almaarasan.gpx',
      'medeu.kacheli.gpx',
      'schimbulachka.gpx',
      'peaknursultan.gpx',
      'kumbelpeak.gpx',
      'peaktitova.gpx'
    ];

    
    if (!allowedFiles.includes(filename)) {
      console.log(`[DEBUG] /api/download/trail/${filename} - File not in allowed list`);
      return res.status(404).json({ error: 'Trail file not found' });
    }

    
    const filePath = path.join(__dirname, '..', 'uploads', 'gpx', filename);

    
    if (!fs.existsSync(filePath)) {
      console.log(`[DEBUG] /api/download/trail/${filename} - File not found at path: ${filePath}`);
      return res.status(404).json({ error: 'Trail file not found on server' });
    }

    console.log(`[DEBUG] /api/download/trail/${filename} - File found, streaming download`);

    
    res.setHeader('Content-Type', 'application/gpx+xml');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    
    const fileStream = fs.createReadStream(filePath);
    fileStream.pipe(res);

    fileStream.on('end', () => {
      console.log(`[DEBUG] /api/download/trail/${filename} - File download completed successfully`);
    });

    fileStream.on('error', (err) => {
      console.error('Error streaming trail file:', err);
      res.status(500).json({ error: 'Error downloading trail file' });
    });

  } catch (error) {
    console.error('Error downloading trail file:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/download/:filename', protect, async (req, res) => {
  try {
    const { filename } = req.params;
    const userId = req.user.id; 

    
    const fileRecord = await GpxFile.findOne({ filename, userId });
    if (!fileRecord) {
      return res.status(404).json({ error: 'Файл не найден или доступ запрещён' });
    }

    
    const filePath = path.join(__dirname, '..', fileRecord.path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Файл не найден на сервере' });
    }

    
    res.download(filePath, fileRecord.originalName, (err) => {
      if (err) {
        console.error('Ошибка скачивания:', err);
        res.status(500).json({ error: 'Ошибка сервера' });
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Внутренняя ошибка сервера' });
  }
});


router.get('/list', protect, async (req, res) => {
  const startTime = Date.now();
  try {
    const userId = req.user.id;
    console.log(`[DEBUG] /api/list - Starting query for user: ${userId}`);

    
    const totalFiles = await GpxFile.countDocuments();
    console.log(`[DEBUG] /api/list - Total GPX files in DB: ${totalFiles}`);

    const queryStart = Date.now();
    const files = await GpxFile.find({ userId }).select('filename originalName uploadedAt difficulty elevation_gain peak_height total_distance size');
    const queryTime = Date.now() - queryStart;

    console.log(`[DEBUG] /api/list - DB query completed in ${queryTime}ms, returned ${files.length} files for user`);

    
    if (files.length > 0) {
      console.log(`[DEBUG] /api/list - Sample file data:`, {
        filename: files[0].filename,
        peak_height: files[0].peak_height,
        total_distance: files[0].total_distance,
        hasLocationData: !!(files[0].latitude && files[0].longitude)
      });
    }

    const totalTime = Date.now() - startTime;
    console.log(`[DEBUG] /api/list - Total response time: ${totalTime}ms`);

    res.json({ files });
  } catch (error) {
    const totalTime = Date.now() - startTime;
    console.error(`[DEBUG] /api/list - Error after ${totalTime}ms:`, error);
    res.status(500).json({ error: 'Ошибка получения списка файлов' });
  }
});

module.exports = router;