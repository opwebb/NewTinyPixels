// Analytics helper functions
function trackPageView(url) {
    if (typeof gtag !== 'undefined') {
        gtag('config', 'G-XXXXXXXX', {
            page_path: url
        });
    }
}

function trackEvent(action, category, label, value) {
    if (typeof gtag !== 'undefined') {
        gtag('event', action, {
            event_category: category,
            event_label: label,
            value: value
        });
    }
}

// Track page views on navigation
document.addEventListener('DOMContentLoaded', () => {
    // Track initial page view
    trackPageView(window.location.pathname);

    // Track clicks on navigation links
    document.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', () => {
            if (link.href && link.href.startsWith(window.location.origin)) {
                trackPageView(new URL(link.href).pathname);
            }
        });
    });
});
