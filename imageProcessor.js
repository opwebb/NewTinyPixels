class ImageProcessor {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    async processImage(file, settings) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            
            img.onload = () => {
                try {
                    let width = img.width;
                    let height = img.height;

                    // Handle resizing
                    if (settings.width && settings.height) {
                        width = settings.width;
                        height = settings.height;
                    } else if (settings.width) {
                        height = (height * settings.width) / width;
                        width = settings.width;
                    } else if (settings.height) {
                        width = (width * settings.height) / height;
                        height = settings.height;
                    }

                    this.canvas.width = width;
                    this.canvas.height = height;

                    // Draw and compress
                    this.ctx.drawImage(img, 0, 0, width, height);

                    const quality = settings.quality / 100;

                    if (settings.targetSize) {
                        // Binary search for the right quality to match target size
                        this._findOptimalQuality(settings.targetSize, settings.format)
                            .then(resolve)
                            .catch(reject);
                    } else {
                        // Use straight quality setting
                        this.canvas.toBlob(
                            (blob) => {
                                if (blob) {
                                    resolve(blob);
                                } else {
                                    reject(new Error('Failed to process image'));
                                }
                            },
                            settings.format,
                            settings.format === 'image/png' ? undefined : quality
                        );
                    }
                } catch (error) {
                    reject(error);
                }
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = URL.createObjectURL(file);
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
