const API_KEY = import.meta.env.VITE_BUNNY_NET_API_KEY;
const STORAGE_ZONE = import.meta.env.VITE_BUNNY_NET_STORAGE_ZONE;
const CDN_URL = import.meta.env.VITE_BUNNY_NET_CDN_URL;

const BASE_URL = `https://storage.bunnycdn.com/${STORAGE_ZONE}/`;

export const BunnyNetService = {
  uploadFile: async (file, onProgress) => {
    if (!API_KEY || !STORAGE_ZONE) {
      throw new Error("Bunny.net configuration missing");
    }

    const fileName = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '_')}`;
    const url = `${BASE_URL}${fileName}`;

    try {
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'AccessKey': API_KEY,
          'Content-Type': 'application/octet-stream',
        },
        body: file
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }

      return {
        fileName,
        cdnUrl: `${CDN_URL}/${fileName}`,
        fileSize: file.size
      };
    } catch (error) {
      console.error("Bunny.net Upload Error:", error);
      throw error;
    }
  },

  deleteFile: async (fileName) => {
    if (!API_KEY || !STORAGE_ZONE) return;

    const url = `${BASE_URL}${fileName}`;
    try {
      await fetch(url, {
        method: 'DELETE',
        headers: { 'AccessKey': API_KEY }
      });
    } catch (error) {
      console.error("Bunny.net Delete Error:", error);
    }
  },

  getFileUrl: (fileName) => {
    if (!CDN_URL) return '';
    return `${CDN_URL}/${fileName}`;
  }
};