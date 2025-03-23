// Replace Formspree endpoint with your verified endpoint
const FORM_ENDPOINT = 'https://formspree.io/f/your-formspree-id';

function showStatus(message, isError = false) {
    const statusDiv = document.getElementById('formStatus');
    statusDiv.textContent = message;
    statusDiv.style.display = 'block';
    statusDiv.className = `form-status ${isError ? 'error' : 'success'}`;
}

function handleSubmit(event) {
    event.preventDefault();
    const form = event.target;
    const submitButton = form.querySelector('button[type="submit"]');
    const formData = new FormData(form);

    // Disable form while submitting
    submitButton.disabled = true;
    submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    // Use Formspree to handle form submission
    fetch(FORM_ENDPOINT, {
        method: 'POST',
        body: formData,
        headers: {
            'Accept': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.ok) {
            showStatus('Thank you for your message! We\'ll get back to you soon.');
            form.reset();
        } else {
            throw new Error('Form submission failed');
        }
    })
    .catch(error => {
        showStatus('Sorry, there was an error sending your message. Please try again or email us directly.', true);
        console.error('Form submission error:', error);
    })
    .finally(() => {
        submitButton.disabled = false;
        submitButton.innerHTML = 'Send Message';
    });

    return false;
}

// Form validation
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('contactForm');
    const inputs = form.querySelectorAll('input, textarea, select');

    inputs.forEach(input => {
        input.addEventListener('invalid', (e) => {
            e.preventDefault();
            input.classList.add('error');
        });

        input.addEventListener('input', () => {
            if (input.validity.valid) {
                input.classList.remove('error');
            }
        });
    });
});
