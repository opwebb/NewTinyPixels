document.addEventListener('DOMContentLoaded', () => {
    // Initialize theme first
    initTheme();
    
    const imageProcessor = new ImageProcessor();
    const dropzone = document.getElementById('dropzone');
    const fileInput = document.getElementById('fileInput');
    const settings = document.getElementById('settings');
    const preview = document.getElementById('preview');
    const qualitySlider = document.getElementById('quality');
    const qualityValue = document.getElementById('qualityValue');
    const formatSelect = document.getElementById('format');
    const compressBtn = document.getElementById('processBtn');
    const downloadBtn = document.getElementById('downloadBtn');
    const widthInput = document.getElementById('width');
    const heightInput = document.getElementById('height');
    const targetSizeInput = document.getElementById('targetSize');

    let currentFiles = [];
    let processedBlobs = [];

    // Initialize tabs
    initTabs();

    // Update quality value display
    qualitySlider.addEventListener('input', (e) => {
        qualityValue.textContent = e.target.value;
    });

    // Handle drag and drop
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--primary)';
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.style.borderColor = 'var(--border)';
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.style.borderColor = 'var(--border)';
        handleFiles(Array.from(e.dataTransfer.files));
    });

    // Handle file input
    dropzone.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFiles(Array.from(e.target.files));
            showSettings();
        }
    });

    function handleFiles(files) {
        const imageFiles = files.filter(file => file.type.startsWith('image/'));

        if (imageFiles.length === 0) {
            showToast('Please select only image files', 'error');
            return;
        }

        currentFiles = imageFiles;
        processedBlobs = [];
        settings.classList.remove('hidden');
        displayPreviews(imageFiles);
        downloadBtn.disabled = true;
    }

    function displayPreviews(files) {
        preview.innerHTML = '';

        files.forEach((file, index) => {
            const card = document.createElement('div');
            card.className = 'preview-card fadeIn';

            const img = document.createElement('img');
            img.className = 'preview-image';
            img.src = URL.createObjectURL(file);

            const info = document.createElement('div');
            info.className = 'preview-info';

            const name = document.createElement('div');
            name.className = 'preview-name';
            name.textContent = file.name;

            const size = document.createElement('div');
            size.className = 'preview-size';
            size.textContent = `Original: ${imageProcessor.formatBytes(file.size)}`;

            info.appendChild(name);
            info.appendChild(size);
            card.appendChild(img);
            card.appendChild(info);
            preview.appendChild(card);
        });
    }

    // Handle compression
    compressBtn.addEventListener('click', async () => {
        if (currentFiles.length === 0) return;

        const settings = {
            quality: parseInt(qualitySlider.value),
            format: formatSelect.value,
            width: widthInput.value ? parseInt(widthInput.value) : undefined,
            height: heightInput.value ? parseInt(heightInput.value) : undefined,
            targetSize: targetSizeInput.value ? parseInt(targetSizeInput.value) : undefined
        };

        compressBtn.disabled = true;
        compressBtn.textContent = 'Processing...';

        try {
            processedBlobs = await Promise.all(
                currentFiles.map(file => imageProcessor.processImage(file, settings))
            );

            // Update preview with processed images
            processedBlobs.forEach((blob, index) => {
                const card = preview.children[index];
                const info = card.querySelector('.preview-info');

                // Clear previous results if any
                const existingResults = info.querySelectorAll('.processed-info');
                existingResults.forEach(el => el.remove());

                const processedSize = document.createElement('div');
                processedSize.className = 'preview-size processed-info';
                processedSize.textContent = `Processed: ${imageProcessor.formatBytes(blob.size)}`;

                const savings = document.createElement('div');
                savings.className = 'preview-size processed-info';
                const savingsPercent = ((1 - (blob.size / currentFiles[index].size)) * 100).toFixed(1);
                savings.textContent = `Saved: ${savingsPercent}%`;
                savings.style.color = 'var(--primary)';

                info.appendChild(processedSize);
                info.appendChild(savings);
            });

            downloadBtn.disabled = false;
            showToast('Images processed successfully', 'success');

            // Track successful processing
            if (typeof gtag !== 'undefined') {
                gtag('event', 'image_processed', {
                    'event_category': 'Image Processing',
                    'event_label': 'Success',
                    'value': processedBlobs.length
                });
            }
        } catch (error) {
            showToast('Error processing images: ' + error.message, 'error');

            // Track failed processing
            if (typeof gtag !== 'undefined') {
                gtag('event', 'image_processed', {
                    'event_category': 'Image Processing',
                    'event_label': 'Failed',
                });
            }
        } finally {
            compressBtn.disabled = false;
            compressBtn.textContent = 'Process Images';
        }
    });

    // Handle download
    downloadBtn.addEventListener('click', () => {
        processedBlobs.forEach((blob, index) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            const extension = formatSelect.value.split('/')[1];
            a.download = `processed-${currentFiles[index].name.split('.')[0]}.${extension}`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        });
    });

    // Toast notification system
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type} fadeIn`;
        toast.textContent = message;

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('fadeOut');
            setTimeout(() => {
                document.body.removeChild(toast);
            }, 300);
        }, 3000);
    }

    // Cookie consent
    const cookieConsent = document.getElementById('cookie-consent');
    if (!localStorage.getItem('cookieConsent')) {
        cookieConsent.style.display = 'block';
    }

    window.acceptCookies = () => {
        localStorage.setItem('cookieConsent', 'accepted');
        cookieConsent.style.display = 'none';
    };

    window.declineCookies = () => {
        localStorage.setItem('cookieConsent', 'declined');
        cookieConsent.style.display = 'none';
    };

    // Theme toggle functionality
    function initTheme() {
        const themeToggle = document.getElementById('themeToggle');
        const themeIcon = themeToggle.querySelector('i');
        
        // Check for saved theme preference
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        updateThemeIcon(themeIcon, savedTheme);

        themeToggle.addEventListener('click', () => {
            const currentTheme = document.documentElement.getAttribute('data-theme');
            const newTheme = currentTheme === 'light' ? 'dark' : 'light';
            
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeIcon(themeIcon, newTheme);
        });
    }

    function updateThemeIcon(icon, theme) {
        icon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
    }

    // Add mobile menu functionality
    const mobileMenuBtn = document.getElementById('mobileMenuBtn');
    const navLinks = document.getElementById('navLinks');
    
    mobileMenuBtn.addEventListener('click', () => {
        navLinks.classList.toggle('active');
        mobileMenuBtn.querySelector('i').classList.toggle('fa-bars');
        mobileMenuBtn.querySelector('i').classList.toggle('fa-times');
    });

    // Close mobile menu when clicking outside
    document.addEventListener('click', (e) => {
        if (!navLinks.contains(e.target) && !mobileMenuBtn.contains(e.target)) {
            navLinks.classList.remove('active');
            mobileMenuBtn.querySelector('i').classList.add('fa-bars');
            mobileMenuBtn.querySelector('i').classList.remove('fa-times');
        }
    });

    // Add dropdown functionality for mobile
    const dropdownToggle = document.querySelector('.dropdown-toggle');
    const dropdown = document.querySelector('.dropdown');

    dropdownToggle.addEventListener('click', (e) => {
        if (window.innerWidth <= 768) {
            e.preventDefault();
            dropdown.classList.toggle('active');
            const icon = dropdownToggle.querySelector('i');
            icon.classList.toggle('fa-chevron-down');
            icon.classList.toggle('fa-chevron-up');
        }
    });

    // Add smooth scrolling for feature links
    document.querySelectorAll('.dropdown-item').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const targetId = link.getAttribute('href');
            const targetElement = document.querySelector(targetId);
            
            if (targetElement) {
                targetElement.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center'
                });
                
                // Highlight the section briefly
                targetElement.classList.add('highlight');
                setTimeout(() => {
                    targetElement.classList.remove('highlight');
                }, 2000);
            }
        });
    });
});

// Tab switching functionality
function initTabs() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTabId = button.getAttribute('data-tab');

            // Remove active class from all buttons and contents
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));

            // Add active class to current button and content
            button.classList.add('active');
            document.getElementById(`${targetTabId}-tab`).classList.add('active');
        });
    });
}

// Show settings panel when files are added
function showSettings() {
    const settingsPanel = document.getElementById('settings');
    settingsPanel.classList.remove('hidden');
}