'use strict';

class StorageProvider {
  async save(file, directory) {
    throw new Error('Method not implemented');
  }

  async delete(filePath) {
    throw new Error('Method not implemented');
  }

  async getUrl(filePath) {
    throw new Error('Method not implemented');
  }
}

module.exports = StorageProvider;
