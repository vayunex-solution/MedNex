'use strict';

const StorageProvider = require('./storage.provider');
const fs = require('fs');
const path = require('path');

class LocalStorageProvider extends StorageProvider {
  constructor() {
    super();
    this.uploadRoot = path.join(__dirname, '..', '..', 'uploads');
    if (!fs.existsSync(this.uploadRoot)) {
      fs.mkdirSync(this.uploadRoot, { recursive: true });
    }
  }

  async save(file, directory = '') {
    const targetDir = path.join(this.uploadRoot, directory);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const ext = path.extname(file.originalname || file.name || '');
    const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
    const targetPath = path.join(targetDir, filename);

    if (file.buffer) {
      fs.writeFileSync(targetPath, file.buffer);
    } else if (file.path) {
      fs.renameSync(file.path, targetPath);
    } else {
      throw new Error('Invalid file format: No buffer or temp path found');
    }

    // Return virtual relative file path
    return path.posix.join('uploads', directory, filename);
  }

  async delete(relativePath) {
    const cleanPath = relativePath.startsWith('uploads/') ? relativePath.substring(8) : relativePath;
    const fullPath = path.join(this.uploadRoot, cleanPath);
    if (fs.existsSync(fullPath)) {
      fs.unlinkSync(fullPath);
      return true;
    }
    return false;
  }

  async getUrl(relativePath) {
    const baseUrl = process.env.BASE_URL || 'http://localhost:5000';
    return `${baseUrl}/${relativePath}`;
  }
}

const localStorageProvider = new LocalStorageProvider();
module.exports = localStorageProvider;
