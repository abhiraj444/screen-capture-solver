/**
 * This file contains the logic for the history page.
 * It retrieves the question history from storage, allows users to filter it,
 * and renders the results on the page.
 */

document.addEventListener('DOMContentLoaded', () => {
    const historyContainer = document.getElementById('history-container');
    const searchInput = document.getElementById('search-input');
    const subjectFilter = document.getElementById('subject-filter');
    const difficultyFilter = document.getElementById('difficulty-filter');

    let fullHistory = [];

    // Load the history from storage
    chrome.storage.local.get({ history: [] }, (data) => {
        fullHistory = data.history || [];
        renderHistory(fullHistory);
    });

    // Add event listeners for the controls
    searchInput.addEventListener('input', applyFilters);
    subjectFilter.addEventListener('change', applyFilters);
    difficultyFilter.addEventListener('change', applyFilters);

    /**
     * Applies the current search and filter values to the history.
     */
    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const subject = subjectFilter.value;
        const difficulty = difficultyFilter.value;

        const filteredHistory = fullHistory.filter(analysis => {
            const question = analysis.questions[0];
            if (!question) return false;

            const matchesSearch = searchTerm === '' ||
                question.formatted_question.toLowerCase().includes(searchTerm) ||
                question.direct_answer.toLowerCase().includes(searchTerm);

            const matchesSubject = subject === 'all' || question.subject === subject;
            const matchesDifficulty = difficulty === 'all' || question.difficulty === difficulty;

            return matchesSearch && matchesSubject && matchesDifficulty;
        });

        renderHistory(filteredHistory);
    }

    /**
     * Renders the question history on the page.
     * @param {Array<object>} history - The array of analysis objects to render.
     */
    function renderHistory(history) {
        if (!history || history.length === 0) {
            historyContainer.innerHTML = '<p>No matching history found.</p>';
            return;
        }

        historyContainer.innerHTML = history.map((analysis) => {
            const question = analysis.questions[0];
            return `
                <div class="history-item">
                    <h3>Question</h3>
                    <p><strong>Question:</strong> ${question.formatted_question}</p>
                    <p><strong>Answer:</strong> ${question.direct_answer}</p>
                    <div class="details">
                        <span>Subject: ${question.subject}</span>
                        <span>Difficulty: ${question.difficulty}</span>
                    </div>
                </div>
            `;
        }).join('');
    }
});
