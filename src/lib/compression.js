/**
 * Compresses an image file using HTML Canvas
 * @param {File} file - The original image file
 * @param {number} quality - Quality from 0 to 1 (default 0.7)
 * @param {number} maxWidth - Max width in pixels (default 1920)
 * @returns {Promise<File>} - The compressed file
 */
export const compressImage = async (file, quality = 0.7, maxWidth = 1920) => {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.src = URL.createObjectURL(file);
      image.onload = () => {
        const canvas = document.createElement('canvas');
        let width = image.width;
        let height = image.height;
  
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
  
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(image, 0, 0, width, height);
  
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Canvas is empty'));
              return;
            }
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          'image/jpeg',
          quality
        );
      };
      image.onerror = (err) => reject(err);
    });
  };
  
  /**
   * Simulates compression for non-image files (PDF, Excel)
   * In a real browser env, full PDF compression is heavy.
   * This is a placeholder for logic that might strip metadata if implemented with heavy libs.
   */
  export const simulateFileCompression = async (file) => {
     // Return original file for now, acting as a pass-through
     // In a real app, you'd use libraries like 'pdf-lib' or 'xlsx' to strip unused data
     return file; 
  };