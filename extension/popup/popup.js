/**
 * This file contains the logic for the popup's user interface.
 * It handles user interactions with the popup, such as clicking the toggle button,
 * and updates the UI to reflect the current state of the extension.
 */

document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggleBtn');
    const statusEl = document.getElementById('status');
    const recentQuestionEl = document.getElementById('recentQuestion');
    const historyBtn = document.getElementById('historyBtn');

    // Open the history page when the history button is clicked
    historyBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'history/history.html' });
    });

    // Load the current state from storage
    chrome.storage.local.get(['extensionActive', 'lastAnalysis'], (data) => {
        updateUI(data.extensionActive);
        if (data.lastAnalysis) {
            renderQuestion(data.lastAnalysis);
        }
    });

    // Listen for changes in storage
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (changes.lastAnalysis) {
            renderQuestion(changes.lastAnalysis.newValue);
        }
    });

    // Toggle the extension's state when the button is clicked
    toggleBtn.addEventListener('click', () => {
        chrome.storage.local.get('extensionActive', (data) => {
            const newState = !data.extensionActive;
            chrome.storage.local.set({ extensionActive: newState }, () => {
                updateUI(newState);
            });
        });
    });

    /**
     * Updates the UI to reflect the current state of the extension.
     * @param {boolean} active - Whether the extension is active.
     */
    function updateUI(active) {
        if (active) {
            statusEl.textContent = 'ACTIVE';
            statusEl.classList.add('active');
            toggleBtn.textContent = 'STOP';
            toggleBtn.classList.add('active');
        } else {
            statusEl.textContent = 'INACTIVE';
            statusEl.classList.remove('active');
            toggleBtn.textContent = 'START';
            toggleBtn.classList.remove('active');
        }
    }

    /**
     * Renders the question card in the popup.
     * @param {object} analysis - The analysis object from the API.
     */
    function renderQuestion(analysis) {
        if (!analysis || !analysis.questions || analysis.questions.length === 0) {
            recentQuestionEl.innerHTML = '<p>No questions found.</p>';
            return;
        }

        const question = analysis.questions[0];

        recentQuestionEl.innerHTML = `
            <div class="question-card">
                <div class="question-header">
                    <span class="question-number">Q1</span>
                    <span class="confidence-score">${question.confidence}%</span>
                    <span class="question-type">${question.type}</span>
                </div>
                <div class="question-content">
                    ${question.formatted_question}
                </div>
                <div class="answer-section">
                    <div class="direct-answer">
                        <strong>Answer: ${question.direct_answer}</strong>
                    </div>
                    <div class="explanation">
                        ${question.explanation}
                    </div>
                </div>
            </div>
        `;
    }
});
