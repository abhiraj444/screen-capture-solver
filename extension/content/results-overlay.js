(() => {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.action === 'displayResultsOverlay') {
            // Remove any existing overlay
            const existingOverlay = document.getElementById('results-overlay-container');
            if (existingOverlay) {
                existingOverlay.remove();
            }

            // Create the main container
            const container = document.createElement('div');
            container.id = 'results-overlay-container';

            // Create the header
            const header = document.createElement('div');
            header.id = 'results-overlay-header';
            const title = document.createElement('span');
            title.id = 'results-overlay-title';
            title.textContent = 'Answers Found';
            const closeBtn = document.createElement('button');
            closeBtn.id = 'results-overlay-close-btn';
            closeBtn.innerHTML = '&times;';
            header.appendChild(title);
            header.appendChild(closeBtn);

            // Create the content area
            const content = document.createElement('div');
            content.id = 'results-overlay-content';

            // Populate with answers
            if (request.analysis && request.analysis.questions) {
                request.analysis.questions.forEach((q, index) => {
                    const answerDiv = document.createElement('div');
                    answerDiv.className = 'results-overlay-answer';

                    const answerStrong = document.createElement('strong');
                    answerStrong.textContent = `A${index + 1}:`;

                    const answerHTML = parseSimpleMarkdown(q.direct_answer);

                    answerDiv.appendChild(answerStrong);
                    answerDiv.innerHTML += answerHTML; // Append the parsed HTML
                    content.appendChild(answerDiv);
                });
            } else {
                content.textContent = 'No answers were found.';
            }

            // Assemble the overlay
            container.appendChild(header);
            container.appendChild(content);
            document.body.appendChild(container);

            // Add close functionality
            closeBtn.addEventListener('click', () => {
                container.remove();
            });

            sendResponse({ status: 'overlay displayed' });
        }
    });
})();
