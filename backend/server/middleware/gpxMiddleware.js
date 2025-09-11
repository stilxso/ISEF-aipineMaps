const path = require('path');
const fs = require('fs');

const GPX_DIR = path.join(__dirname, 'uploads', 'gpx');

if (!fs.existsSync(GPX_DIR)) {
  fs.mkdirSync(GPX_DIR, { recursive: true });
}