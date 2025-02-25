class ImageProcessor {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    async processImage(file, settings) {
        const image = await this.loadImage(file);
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Set dimensions
        canvas.width = settings.width || image.width;
        canvas.height = settings.height || image.height;
        
        // Draw image
        ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
        
        // Handle different formats
        const format = settings.format || 'image/jpeg';
        const quality = settings.quality / 100;
        
        // Special handling for different formats
        switch(format) {
            case 'image/avif':
                return await this.convertToAVIF(canvas, quality);
            case 'image/heic':
                return await this.convertToHEIC(canvas, quality);
            case 'image/gif':
                return await this.convertToGIF(canvas);
            case 'image/tiff':
                return await this.convertToTIFF(canvas, quality);
            case 'image/bmp':
                return await this.convertToBMP(canvas);
            default:
                return await new Promise(resolve => {
                    canvas.toBlob(blob => resolve(blob), format, quality);
                });
        }
    }

    async loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => resolve(img);
            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
        });
    }

    // Format conversion methods
    async convertToAVIF(canvas, quality) {
        // AVIF conversion logic
        return new Promise(resolve => {
            canvas.toBlob(blob => resolve(blob), 'image/avif', quality);
        });
    }

    async convertToHEIC(canvas, quality) {
        // HEIC conversion logic
        return new Promise(resolve => {
            canvas.toBlob(blob => resolve(blob), 'image/heic', quality);
        });
    }

    async convertToGIF(canvas) {
        // GIF conversion logic
        return new Promise(resolve => {
            canvas.toBlob(blob => resolve(blob), 'image/gif');
        });
    }

    async convertToTIFF(canvas, quality) {
        // TIFF conversion logic
        return new Promise(resolve => {
            canvas.toBlob(blob => resolve(blob), 'image/tiff', quality);
        });
    }

    async convertToBMP(canvas) {
        // BMP conversion logic
        return new Promise(resolve => {
            canvas.toBlob(blob => resolve(blob), 'image/bmp');
        });
    }

    async _findOptimalQuality(targetSize, format) {
        let low = 0;
        let high = 1;
        let mid = 0.8; // Start with 80% quality
        let iteration = 0;
        const maxIterations = 10;

        while (iteration < maxIterations) {
            const blob = await this._getBlob(mid, format);
            const size = blob.size / 1024; // Convert to KB

            if (Math.abs(size - targetSize) < 1) {
                return blob;
            }

            if (size > targetSize) {
                high = mid;
            } else {
                low = mid;
            }

            mid = (low + high) / 2;
            iteration++;

            if (iteration === maxIterations) {
                return blob; // Return best effort
            }
        }
    }

    _getBlob(quality, format) {
        return new Promise((resolve) => {
            this.canvas.toBlob(
                (blob) => resolve(blob),
                format,
                format === 'image/png' ? undefined : quality
            );
        });
    }

    formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}

// Export for use in main.js
window.ImageProcessor = ImageProcessor;
