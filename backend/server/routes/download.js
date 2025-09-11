const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const GpxFile = require('../models/GpxFile');
const { protect } = require('../middleware/authMiddleware');

router.get('/download/:filename', protect, async (req, res) => {
  try {
    const { filename } = req.params;
    const userId = req.user.id; // Из токена (предполагаем, что authMiddleware добавляет req.user)

    // Ищем файл в БД
    const fileRecord = await GpxFile.findOne({ filename, userId });
    if (!fileRecord) {
      return res.status(404).json({ error: 'Файл не найден или доступ запрещён' });
    }

    // Проверяем существование файла
    const filePath = path.join(__dirname, '..', fileRecord.path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Файл не найден на сервере' });
    }

    // Скачиваем файл
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

module.exports = router;