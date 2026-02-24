import { GoogleDriveService } from './GoogleDriveService';

const UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
const API_URL = 'https://www.googleapis.com/drive/v3/files';

export const GoogleDriveSyncService = {
  
  /**
   * Upload a file (Blob/File object) to Google Drive
   * @param {File} file - The file to upload
   * @param {string} folderId - Optional folder ID to place the file in
   */
  async uploadFile(file, folderId = null, description = '') {
    const accessToken = GoogleDriveService.getAccessToken();
    if (!accessToken) throw new Error('Not authenticated with Google Drive');

    const metadata = {
      name: file.name,
      description: description,
      mimeType: file.type || 'application/octet-stream',
    };

    if (folderId) {
      metadata.parents = [folderId];
    }

    const formData = new FormData();
    formData.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    formData.append('file', file);

    const response = await fetch(UPLOAD_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Drive Upload Failed: ${errorText}`);
    }

    return await response.json();
  },

  /**
   * Create a folder in Google Drive
   */
  async createFolder(folderName, parentId = null) {
    const accessToken = GoogleDriveService.getAccessToken();
    if (!accessToken) throw new Error('Not authenticated with Google Drive');

    const metadata = {
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
    };

    if (parentId) {
      metadata.parents = [parentId];
    }

    const response = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(metadata),
    });

    if (!response.ok) throw new Error('Failed to create folder');
    return await response.json();
  },

  /**
   * Search for a file or folder by name
   */
  async searchFiles(query) {
    const accessToken = GoogleDriveService.getAccessToken();
    if (!accessToken) throw new Error('Not authenticated');

    // Example query: "name = 'Fabric Designs' and mimeType = 'application/vnd.google-apps.folder'"
    const encodedQuery = encodeURIComponent(query);
    const response = await fetch(`${API_URL}?q=${encodedQuery}&fields=files(id,name,mimeType)`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) throw new Error('Search failed');
    const data = await response.json();
    return data.files;
  },

  /**
   * Ensure a folder structure exists, e.g., "Shree Rang Trendz/Designs"
   * Returns the ID of the final folder.
   */
  async ensureFolderStructure(pathArray) {
    let parentId = null;

    for (const folderName of pathArray) {
      // Search for folder in current parent
      let query = `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      if (parentId) {
        query += ` and '${parentId}' in parents`;
      }

      const files = await this.searchFiles(query);
      
      if (files && files.length > 0) {
        // Folder exists
        parentId = files[0].id;
      } else {
        // Create folder
        const newFolder = await this.createFolder(folderName, parentId);
        parentId = newFolder.id;
      }
    }
    return parentId;
  },

  /**
   * Helper to fetch image from URL and upload
   */
  async uploadFromUrl(imageUrl, fileName, folderId) {
      const res = await fetch(imageUrl);
      const blob = await res.blob();
      const file = new File([blob], fileName, { type: blob.type });
      return this.uploadFile(file, folderId);
  }
};