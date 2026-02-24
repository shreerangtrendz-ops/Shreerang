/**
 * Service to fetch images from Google Drive
 * Note: Requires valid OAuth token integration which is stored in google_drive_settings table
 */
export const GoogleDriveImageFetcher = {
  
  extractFolderId(url) {
    // Matches patterns like /folders/123xyz or id=123xyz
    const patterns = [
      /\/folders\/([a-zA-Z0-9-_]+)/,
      /id=([a-zA-Z0-9-_]+)/
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) return match[1];
    }
    return null;
  },

  async fetchImagesFromFolder(folderId, accessToken) {
    if (!accessToken) throw new Error("Access token required");

    try {
      const query = `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`;
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id,name,size,thumbnailLink,webContentLink)`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) throw new Error(`Google Drive API Error: ${response.statusText}`);
      
      const data = await response.json();
      return data.files || [];
    } catch (error) {
      console.error("Failed to fetch drive images:", error);
      throw error;
    }
  },

  async downloadImage(fileId, accessToken) {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`
          }
        }
      );

      if (!response.ok) throw new Error("Failed to download file");
      return await response.blob();
    } catch (error) {
      console.error("Download failed:", error);
      throw error;
    }
  }
};