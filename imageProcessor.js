class ImageProcessor {
    constructor() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    }

    async processImage(file, settings) {
        try {
            console.log('Starting image processing:', { filename: file.name, size: file.size, settings });
            
            if (!file || !file.type.startsWith('image/')) {
                throw new Error('Invalid file type. Please select an image file.');
            }

            if (file.size > 100 * 1024 * 1024) {
                throw new Error('File too large. Maximum size is 100MB.');
            }

            const img = await this.loadImage(file);
            console.log('Image loaded:', { width: img.width, height: img.height });
            if (!img.width || !img.height) {
                throw new Error('Invalid image dimensions.');
            }

            // Create new canvas for each image to prevent context pollution
            this.canvas = document.createElement('canvas');
            this.ctx = this.canvas.getContext('2d', {
                willReadFrequently: true,
                alpha: true,
                imageSmoothingEnabled: true,
                imageSmoothingQuality: 'high'
            });

            let { width, height } = this.calculateDimensions(img, settings);
            console.log('Calculated dimensions:', { width, height });

            // Safety check for dimensions
            if (width > 8192 || height > 8192) {
                throw new Error('Image dimensions too large. Maximum size is 8192x8192px.');
            }

            // Set canvas size
            this.canvas.width = width;
            this.canvas.height = height;

            // Draw image with high quality
            this.ctx.drawImage(img, 0, 0, width, height);

            // Initial compression
            let quality = settings.quality / 100;
            console.log('Initial compression quality:', quality);

            let blob = await this.canvasToBlob(this.canvas, settings.format, quality);
            console.log('Initial compression result:', { size: blob.size });

            // Apply format-specific optimizations
            try {
                if (settings.format === 'image/jpeg' || settings.format === 'image/webp') {
                    blob = await this.optimizeWithChroma(blob, settings);
                } else if (settings.format === 'image/png') {
                    blob = await this.optimizePNG(blob, settings);
                }
                console.log('Format-specific optimization complete:', { finalSize: blob.size });
            } catch (optimizationError) {
                console.warn('Format-specific optimization failed, using basic compression:', optimizationError);
            }

            // Verify final output
            if (!blob || blob.size === 0) {
                throw new Error('Failed to generate valid output');
            }

            return blob;
        } catch (error) {
            console.error('Image processing failed:', error);
            throw new Error(`Failed to process ${file.name}: ${error.message}`);
        }
    }

    async performCompression(img, width, height, settings) {
        try {
            // Apply resizing with error handling
            const resized = await this.resizeWithSteps(img, width, height);
            this.canvas = resized;
            this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });

            // Apply optimizations with fallbacks
            await this.applyPreOptimizations();
            
            let quality = settings.quality / 100;
            let blob = await this.canvasToBlob(this.canvas, settings.format || 'image/jpeg', quality);

            if (settings.targetSize) {
                const targetBytes = settings.targetSize * 1024;
                quality = await this.findOptimalQuality(img, width, height, settings.format, targetBytes);
                blob = await this.canvasToBlob(this.canvas, settings.format, quality);
            }

            // Verify blob is valid
            if (!blob || blob.size === 0) {
                throw new Error('Invalid output generated');
            }

            return await this.applyAdvancedCompression(blob, settings);
        } catch (error) {
            throw new Error(`Compression failed: ${error.message}`);
        }
    }

    async loadImage(file) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                if (img.width === 0 || img.height === 0) {
                    reject(new Error('Invalid image dimensions'));
                    return;
                }
                resolve(img);
            };
            img.onerror = () => reject(new Error('Failed to load image'));
            const url = URL.createObjectURL(file);
            img.src = url;
            // Cleanup object URL after load/error
            setTimeout(() => URL.revokeObjectURL(url), 1000);
        });
    }

    calculateDimensions(img, settings) {
        let { width, height } = img;
        
        if (settings.width && settings.height) {
            return { width: settings.width, height: settings.height };
        }

        if (settings.width) {
            const ratio = settings.width / width;
            return { width: settings.width, height: Math.round(height * ratio) };
        }

        if (settings.height) {
            const ratio = settings.height / height;
            return { width: Math.round(width * ratio), height: settings.height };
        }

        // Smart downscaling for large images
        const maxDimension = 2048;
        if (width > maxDimension || height > maxDimension) {
            const ratio = Math.min(maxDimension / width, maxDimension / height);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
        }

        return { width, height };
    }

    async findOptimalQuality(img, width, height, format, targetSize) {
        let low = 0.1;
        let high = 1.0;
        const tolerance = 1024; // 1KB tolerance
        const maxIterations = 10;
        let iteration = 0;

        while (low <= high && iteration < maxIterations) {
            const mid = (low + high) / 2;
            this.ctx.drawImage(img, 0, 0, width, height);
            const blob = await this.canvasToBlob(this.canvas, format, mid);

            if (Math.abs(blob.size - targetSize) <= tolerance) {
                return mid;
            }

            if (blob.size > targetSize) {
                high = mid - 0.1;
            } else {
                low = mid + 0.1;
            }

            iteration++;
        }

        return (low + high) / 2;
    }

    async canvasToBlob(canvas, format, quality) {
        return new Promise((resolve, reject) => {
            try {
                canvas.toBlob(
                    (blob) => {
                        if (!blob) {
                            reject(new Error('Failed to create blob'));
                            return;
                        }
                        resolve(blob);
                    },
                    format,
                    quality
                );
            } catch (error) {
                reject(new Error(`Blob creation failed: ${error.message}`));
            }
        });
    }

    async applyAdvancedCompression(blob, settings) {
        // Convert to appropriate format for best compression
        if (settings.format === 'image/jpeg' || settings.format === 'image/webp') {
            return await this.optimizeWithChroma(blob, settings);
        }
        
        if (settings.format === 'image/png') {
            return await this.optimizePNG(blob, settings);
        }

        return blob;
    }

    async resizeWithSteps(img, targetWidth, targetHeight) {
        const steps = Math.ceil(Math.log2(Math.max(img.width / targetWidth, img.height / targetHeight)));
        let currentCanvas = document.createElement('canvas');
        let currentCtx = currentCanvas.getContext('2d');
        let currentWidth = img.width;
        let currentHeight = img.height;

        for (let i = 0; i < steps; i++) {
            const stepWidth = Math.max(targetWidth, Math.floor(currentWidth * 0.75));
            const stepHeight = Math.max(targetHeight, Math.floor(currentHeight * 0.75));

            currentCanvas.width = stepWidth;
            currentCanvas.height = stepHeight;
            
            // Apply sharpen filter at each step
            currentCtx.filter = 'sharpen(1)';
            currentCtx.drawImage(i === 0 ? img : currentCanvas, 0, 0, stepWidth, stepHeight);
            currentCtx.filter = 'none';

            currentWidth = stepWidth;
            currentHeight = stepHeight;
        }

        return currentCanvas;
    }

    async applyPreOptimizations() {
        const imageData = this.ctx.getImageData(0, 0, this.canvas.width, this.canvas.height);
        const data = imageData.data;

        // Enhanced color quantization
        const colorTable = new Map();
        for (let i = 0; i < data.length; i += 4) {
            // Quantize colors more aggressively
            const r = Math.round(data[i] / 16) * 16;
            const g = Math.round(data[i + 1] / 8) * 8; // Keep more green detail
            const b = Math.round(data[i + 2] / 16) * 16;
            const a = Math.round(data[i + 3] / 16) * 16;

            const key = `${r},${g},${b},${a}`;
            if (!colorTable.has(key)) {
                colorTable.set(key, [r, g, b, a]);
            }

            const optimizedColor = colorTable.get(key);
            data[i] = optimizedColor[0];
            data[i + 1] = optimizedColor[1];
            data[i + 2] = optimizedColor[2];
            data[i + 3] = optimizedColor[3];
        }

        this.ctx.putImageData(imageData, 0, 0);
    }

    async optimizeWithChroma(blob, settings) {
        const img = await this.loadImage(URL.createObjectURL(blob));
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;

        // Apply advanced chroma subsampling
        tempCtx.drawImage(img, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;

        // Enhanced YCbCr color space conversion and subsampling
        for (let i = 0; i < data.length; i += 4) {
            // Convert RGB to YCbCr
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            // More aggressive chroma subsampling
            const y = 0.299 * r + 0.587 * g + 0.114 * b;
            const cb = (-0.169 * r - 0.331 * g + 0.5 * b + 128) / 2;
            const cr = (0.5 * r - 0.419 * g - 0.081 * b + 128) / 2;

            // Convert back to RGB with reduced color information
            data[i] = y + 1.402 * (cr * 2 - 128);
            data[i + 1] = y - 0.344136 * (cb * 2 - 128) - 0.714136 * (cr * 2 - 128);
            data[i + 2] = y + 1.772 * (cb * 2 - 128);
        }

        tempCtx.putImageData(imageData, 0, 0);

        // Apply additional compression based on format
        const quality = Math.min(settings.quality / 100, 0.9); // Cap maximum quality
        return await this.canvasToBlob(tempCanvas, settings.format, quality);
    }

    async optimizePNG(blob, settings) {
        const img = await this.loadImage(URL.createObjectURL(blob));
        
        // Create temporary canvas for PNG optimization
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = img.width;
        tempCanvas.height = img.height;

        // Apply PNG-specific optimizations
        tempCtx.drawImage(img, 0, 0);
        const imageData = tempCtx.getImageData(0, 0, img.width, img.height);
        const data = imageData.data;

        // Optimize PNG by reducing similar colors
        const colorMap = new Map();
        for (let i = 0; i < data.length; i += 4) {
            const color = `${data[i]},${data[i + 1]},${data[i + 2]},${data[i + 3]}`;
            if (!colorMap.has(color)) {
                colorMap.set(color, [data[i], data[i + 1], data[i + 2], data[i + 3]]);
            }
            const optimizedColor = colorMap.get(color);
            data[i] = optimizedColor[0];
            data[i + 1] = optimizedColor[1];
            data[i + 2] = optimizedColor[2];
            data[i + 3] = optimizedColor[3];
        }

        tempCtx.putImageData(imageData, 0, 0);
        return await this.canvasToBlob(tempCanvas, settings.format, 1.0); // PNG uses lossless compression
    }

    formatBytes(bytes, decimals = 2) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const dm = decimals < 0 ? 0 : decimals;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
    }
}

// Export for use in main.js
window.ImageProcessor = ImageProcessor;
