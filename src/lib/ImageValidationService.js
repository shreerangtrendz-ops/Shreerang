export const ImageValidationService = {
  validate(file, existingDesignNumbers = []) {
    const errors = [];
    
    // File Type
    if (!file.type.startsWith('image/')) {
      errors.push("Invalid file type. Only images allowed.");
    }

    // Size (Soft limit handled by compressor, hard limit here)
    if (file.size > 25 * 1024 * 1024) {
      errors.push("File is too large (>25MB).");
    }

    // Filename/Design Number check
    const designNo = file.name.split('.')[0];
    if (existingDesignNumbers.includes(designNo)) {
      errors.push(`Design number '${designNo}' already exists.`);
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};