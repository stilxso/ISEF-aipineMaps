const express = require('express');
const router = express.Router();
const multer = require('multer');
const crypto = require('crypto');
const path = require('path');
const GpxFile = require('../models/GpxFile');
const { protect } = require('../middleware/authMiddleware');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads', 'gpx'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `${crypto.randomUUID()}.gpx`;
    cb(null, uniqueName);
  }
});

const upload = multer({ storage });

router.post('/upload', protect, upload.single('gpxFile'), async (req, res) => {
  try {
    const userId = req.user.id;
    const filename = req.file.filename;
    const originalName = req.file.originalname;
    const filePath = `uploads/gpx/${filename}`;

    // Сохраняем в БД
    const gpxFile = new GpxFile({
      filename,
      originalName,
      userId,
      path: filePath,
      size: req.file.size
    });
    await gpxFile.save();

    res.json({ message: 'Файл загружен', fileId: gpxFile._id, downloadUrl: `/api/download/${filename}` });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Ошибка загрузки' });
  }
});

module.exports = router;