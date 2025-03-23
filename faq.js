document.addEventListener('DOMContentLoaded', () => {
    const faqItems = document.querySelectorAll('.faq-item');
    
    // Convert existing FAQ items to dropdown structure
    faqItems.forEach(item => {
        const question = item.querySelector('h3');
        const answer = item.querySelector('p');
        
        // Wrap question in a button div with better mobile support
        const questionDiv = document.createElement('div');
        questionDiv.className = 'faq-question';
        questionDiv.setAttribute('role', 'button');
        questionDiv.setAttribute('tabindex', '0');
        questionDiv.setAttribute('aria-expanded', 'false');
        questionDiv.innerHTML = `
            ${question.outerHTML}
            <i class="fas fa-chevron-down" aria-hidden="true"></i>
        `;
        
        // Wrap answer in a div with ARIA support
        const answerDiv = document.createElement('div');
        answerDiv.className = 'faq-answer';
        answerDiv.setAttribute('aria-hidden', 'true');
        answerDiv.innerHTML = answer.outerHTML;
        
        // Clear and rebuild item
        item.innerHTML = '';
        item.appendChild(questionDiv);
        item.appendChild(answerDiv);
        
        // Add click, touch and keyboard handlers
        const toggleAnswer = (e) => {
            if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            
            const isOpen = item.classList.contains('active');
            
            // Close all other items
            faqItems.forEach(otherItem => {
                if (otherItem !== item) {
                    otherItem.classList.remove('active');
                    otherItem.querySelector('.faq-answer').setAttribute('aria-hidden', 'true');
                    otherItem.querySelector('.faq-question').setAttribute('aria-expanded', 'false');
                }
            });
            
            // Toggle current item
            item.classList.toggle('active');
            answerDiv.setAttribute('aria-hidden', !isOpen);
            questionDiv.setAttribute('aria-expanded', !isOpen);
        };

        questionDiv.addEventListener('click', toggleAnswer);
        questionDiv.addEventListener('keydown', toggleAnswer);
        questionDiv.addEventListener('touchend', (e) => {
            e.preventDefault();
            toggleAnswer(e);
        });
    });
});
