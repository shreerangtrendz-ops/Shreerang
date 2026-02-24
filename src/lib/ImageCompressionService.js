/**
 * Service to handle image compression and validation
 */
export const ImageCompressionService = {
  
  /**
   * Compress image to target size (default 4.75MB - 5MB range)
   * @param {File} file - Input file
   * @param {number} targetSizeMB - Target size in MB (default 5)
   * @returns {Promise<File>} Compressed file
   */
  async compressImage(file, targetSizeMB = 4.8) {
    // If file is already smaller than target, return original
    if (file.size <= targetSizeMB * 1024 * 1024) {
      return file;
    }

    const options = {
      maxSizeMB: targetSizeMB,
      maxWidthOrHeight: 4000, // Reasonable max dimension
      useWebWorker: true,
      initialQuality: 0.9
    };

    try {
      // We'll implement a custom canvas-based compressor since we can't import 'browser-image-compression'
      return await this.compressUsingCanvas(file, targetSizeMB);
    } catch (error) {
      console.error('Compression failed:', error);
      throw error;
    }
  },

  /**
   * Canvas-based compression implementation
   */
  async compressUsingCanvas(file, targetSizeMB) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          
          // Max dimensions check
          const MAX_DIMENSION = 4000;
          if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
            const ratio = width / height;
            if (width > height) {
              width = MAX_DIMENSION;
              height = width / ratio;
            } else {
              height = MAX_DIMENSION;
              width = height * ratio;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          // Binary search for correct quality to hit target size
          let minQ = 0;
          let maxQ = 1;
          let quality = 0.9;
          let resultBlob = null;
          
          const attemptCompression = (q) => {
            canvas.toBlob((blob) => {
              if (!blob) {
                reject(new Error('Canvas to Blob failed'));
                return;
              }
              
              const sizeMB = blob.size / (1024 * 1024);
              
              // If we are within acceptable range (4.5 - 5MB) or low quality loop finished
              if ((sizeMB <= targetSizeMB && sizeMB > targetSizeMB - 0.5) || (maxQ - minQ < 0.05)) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                });
                resolve(compressedFile);
              } else if (sizeMB > targetSizeMB) {
                maxQ = q;
                attemptCompression((minQ + maxQ) / 2);
              } else {
                minQ = q;
                attemptCompression((minQ + maxQ) / 2);
              }
            }, 'image/jpeg', q);
          };

          attemptCompression(quality);
        };
        img.onerror = (err) => reject(err);
      };
      reader.onerror = (err) => reject(err);
    });
  },

  calculateCompressionRatio(originalSize, compressedSize) {
    if (!originalSize || !compressedSize) return 0;
    const ratio = ((originalSize - compressedSize) / originalSize) * 100;
    return ratio.toFixed(2);
  },

  validateImage(file) {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      return { valid: false, error: 'Invalid file type. Only JPG, PNG, WEBP allowed.' };
    }
    
    // Size check handled by compression, but we can set a hard limit for upload
    if (file.size > 20 * 1024 * 1024) { // 20MB limit
       return { valid: false, error: 'File too large. Maximum 20MB allowed.' };
    }

    return { valid: true };
  },

  async generateThumbnail(file) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (e) => {
        const img = new Image();
        img.src = e.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const ctx = canvas.getContext('2d');
          const size = 200;
          canvas.width = size;
          canvas.height = size;
          
          // Center crop
          const ratio = Math.max(size / img.width, size / img.height);
          const centerShift_x = (size - img.width * ratio) / 2;
          const centerShift_y = (size - img.height * ratio) / 2;
          
          ctx.drawImage(img, 0, 0, img.width, img.height, centerShift_x, centerShift_y, img.width * ratio, img.height * ratio);
          
          canvas.toBlob(resolve, 'image/jpeg', 0.7);
        };
      };
    });
  }
};