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
    const screenshotDisplay = document.getElementById('screenshot-display');

    // Open the history page when the history button is clicked
    historyBtn.addEventListener('click', () => {
        chrome.tabs.create({ url: 'history/history.html' });
    });

    // Load the current state from storage
    chrome.storage.local.get(['extensionActive', 'lastAnalysis', 'lastScreenshotUrl'], (data) => {
        updateUI(data.extensionActive);
        if (data.lastAnalysis) {
            renderQuestion(data.lastAnalysis);
        }
        if (data.lastScreenshotUrl) {
            screenshotDisplay.src = data.lastScreenshotUrl;
            screenshotDisplay.style.display = 'block';
        }
    });

    // Listen for changes in storage
    chrome.storage.onChanged.addListener((changes, namespace) => {
        if (changes.lastAnalysis) {
            renderQuestion(changes.lastAnalysis.newValue);
        }
        if (changes.lastScreenshotUrl) {
            screenshotDisplay.src = changes.lastScreenshotUrl.newValue;
            screenshotDisplay.style.display = 'block';
        }
    });

    // Toggle the extension's state when the button is clicked
    toggleBtn.addEventListener('click', () => {
        chrome.storage.local.get('extensionActive', (data) => {
            const newState = !data.extensionActive;
            chrome.storage.local.set({ extensionActive: newState }, () => {
                updateUI(newState);
                chrome.runtime.sendMessage({ action: 'updateIcon', state: newState ? 'active' : 'inactive' });
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
     * Renders the question card(s) in the popup.
     * @param {object} analysis - The analysis object from the API.
     */
    function renderQuestion(analysis) {
        if (!analysis || !analysis.questions || analysis.questions.length === 0) {
            recentQuestionEl.innerHTML = '<p>No questions found.</p>';
            return;
        }

        let allQuestionsHtml = '';
        analysis.questions.forEach((question, index) => {
            allQuestionsHtml += `
                <div class="question-card">
                    <div class="question-header">
                        <span class="question-number">Q${index + 1}</span>
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
                        <div class="explanation-toggle">
                            <button class="collapsible">🔍 Show Explanation</button>
                            <div class="explanation-content">
                                <p><strong>Explanation:</strong> ${question.explanation}</p>
                                <p><strong>Detailed Reasoning:</strong> ${question.detailed_reasoning}</p>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        recentQuestionEl.innerHTML = allQuestionsHtml;

        // Add event listeners for collapsible sections
        document.querySelectorAll('.collapsible').forEach(button => {
            button.addEventListener('click', function() {
                this.classList.toggle('active');
                const content = this.nextElementSibling;
                if (content.style.maxHeight) {
                    content.style.maxHeight = null;
                } else {
                    content.style.maxHeight = content.scrollHeight + 'px';
                }
            });
        });
    }
});
