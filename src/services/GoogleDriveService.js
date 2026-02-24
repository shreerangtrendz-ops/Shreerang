const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const API_KEY = import.meta.env.VITE_GOOGLE_API_KEY;

export const GoogleDriveService = {
  isEnabled: () => !!(CLIENT_ID && API_KEY),

  uploadFile: async (file) => {
    if (!GoogleDriveService.isEnabled()) {
      throw new Error("Google Drive integration not configured");
    }
    // Mock implementation for frontend demo as full OAuth requires backend proxy or complex client-side auth
    console.log("Mocking Google Drive Upload for", file.name);
    return new Promise(resolve => setTimeout(() => resolve({
      fileId: `mock-drive-id-${Date.now()}`,
      webViewLink: '#'
    }), 1000));
  }
};