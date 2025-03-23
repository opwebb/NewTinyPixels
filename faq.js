document.addEventListener('DOMContentLoaded', () => {
    const faqItems = document.querySelectorAll('.faq-item');
    
    // Convert existing FAQ items to dropdown structure
    faqItems.forEach(item => {
        const question = item.querySelector('h3');
        const answer = item.querySelector('p');
        
        // Wrap question in a button div
        const questionDiv = document.createElement('div');
        questionDiv.className = 'faq-question';
        questionDiv.setAttribute('role', 'button');
        questionDiv.setAttribute('tabindex', '0');
        questionDiv.innerHTML = `
            ${question.outerHTML}
            <i class="fas fa-chevron-down"></i>
        `;
        
        // Wrap answer in a div
        const answerDiv = document.createElement('div');
        answerDiv.className = 'faq-answer';
        answerDiv.setAttribute('aria-hidden', 'true');
        answerDiv.innerHTML = answer.outerHTML;
        
        // Clear and rebuild item
        item.innerHTML = '';
        item.appendChild(questionDiv);
        item.appendChild(answerDiv);
        
        // Add click and keyboard handlers
        const toggleAnswer = (e) => {
            if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
            e.preventDefault();
            
            const isOpen = item.classList.contains('active');
            
            // Close all other items
            faqItems.forEach(otherItem => {
                otherItem.classList.remove('active');
                otherItem.querySelector('.faq-answer').setAttribute('aria-hidden', 'true');
            });
            
            // Toggle current item
            if (!isOpen) {
                item.classList.add('active');
                answerDiv.setAttribute('aria-hidden', 'false');
            }
        };

        questionDiv.addEventListener('click', toggleAnswer);
        questionDiv.addEventListener('keydown', toggleAnswer);
    });
});
