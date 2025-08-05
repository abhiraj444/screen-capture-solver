/**
 * This file contains the logic for the history page.
 * It retrieves the question history from storage and renders it on the page.
 */

document.addEventListener('DOMContentLoaded', () => {
    const historyContainer = document.getElementById('history-container');

    // Load the history from storage
    chrome.storage.local.get({ history: [] }, (data) => {
        renderHistory(data.history);
    });

    /**
     * Renders the question history on the page.
     * @param {Array<object>} history - The array of analysis objects.
     */
    function renderHistory(history) {
        if (!history || history.length === 0) {
            historyContainer.innerHTML = '<p>No history found.</p>';
            return;
        }

        historyContainer.innerHTML = history.map((analysis, index) => {
            const question = analysis.questions[0];
            return `
                <div class="history-item">
                    <h3>Question ${index + 1}</h3>
                    <p><strong>Question:</strong> ${question.formatted_question}</p>
                    <p><strong>Answer:</strong> ${question.direct_answer}</p>
                </div>
            `;
        }).join('');
    }
});
