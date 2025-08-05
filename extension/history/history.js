/**
 * This file contains the logic for the history page.
 * It retrieves the question history from storage, allows users to filter it,
 * renders the results on the page, and allows exporting the history.
 */

document.addEventListener('DOMContentLoaded', () => {
    const historyContainer = document.getElementById('history-container');
    const searchInput = document.getElementById('search-input');
    const subjectFilter = document.getElementById('subject-filter');
    const difficultyFilter = document.getElementById('difficulty-filter');
    const exportBtn = document.getElementById('export-btn');

    let fullHistory = [];
    let filteredHistory = [];

    // Load the history from storage
    chrome.storage.local.get({ history: [] }, (data) => {
        fullHistory = data.history || [];
        applyFilters();
    });

    // Add event listeners for the controls
    searchInput.addEventListener('input', applyFilters);
    subjectFilter.addEventListener('change', applyFilters);
    difficultyFilter.addEventListener('change', applyFilters);
    exportBtn.addEventListener('click', () => exportToMarkdown(filteredHistory));

    /**
     * Applies the current search and filter values to the history.
     */
    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const subject = subjectFilter.value;
        const difficulty = difficultyFilter.value;

        filteredHistory = fullHistory.filter(analysis => {
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

        historyContainer.innerHTML = history.map((analysis, analysisIndex) => {
            let questionsHtml = '';
            analysis.questions.forEach((question, questionIndex) => {
                questionsHtml += `
                    <div class="history-item-question">
                        <h4>Question ${analysisIndex + 1}.${questionIndex + 1}</h4>
                        <p><strong>Question:</strong> ${question.formatted_question}</p>
                        <p><strong>Answer:</strong> ${question.direct_answer}</p>
                        <div class="details">
                            <span>Subject: ${question.subject}</span>
                            <span>Difficulty: ${question.difficulty}</span>
                        </div>
                        <div class="explanation-toggle">
                            <button class="collapsible">🔍 Show Explanation</button>
                            <div class="explanation-content">
                                <p><strong>Explanation:</strong> ${question.explanation}</p>
                                <p><strong>Detailed Reasoning:</strong> ${question.detailed_reasoning}</p>
                            </div>
                        </div>
                    </div>
                `;
            });
            return `<div class="history-analysis-card">${questionsHtml}</div>`;
        }).join('');

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

    /**
     * Exports the given history to a Markdown file.
     * @param {Array<object>} history - The array of analysis objects to export.
     */
    function exportToMarkdown(history) {
        if (!history || history.length === 0) {
            alert('No history to export.');
            return;
        }

        const markdownContent = history.map(analysis => {
            let analysisMarkdown = '';
            analysis.questions.forEach((question, index) => {
                analysisMarkdown += `
## Question ${index + 1}
**Question:** ${question.formatted_question}
**Answer:** ${question.direct_answer}
**Explanation:** ${question.explanation}
**Detailed Reasoning:** ${question.detailed_reasoning}
**Subject:** ${question.subject}
**Difficulty:** ${question.difficulty}
---
                `;
            });
            return analysisMarkdown;
        }).join('');

        const blob = new Blob([markdownContent], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'question_history.md';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }
});
