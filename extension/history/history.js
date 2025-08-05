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
    const dateFilter = document.getElementById('date-filter');
    const exportBtn = document.getElementById('export-btn');
    const clearBtn = document.getElementById('clear-btn');
    
    // Stats elements
    const totalQuestionsEl = document.getElementById('total-questions');
    const filteredCountEl = document.getElementById('filtered-count');
    const uniqueSubjectsEl = document.getElementById('unique-subjects');

    let fullHistory = [];
    let filteredHistory = [];

    // Load the history from storage
    chrome.storage.local.get({ history: [] }, (data) => {
        fullHistory = data.history || [];
        console.log('Loaded history:', fullHistory);
        console.log('Number of entries:', fullHistory.length);
        
        // Debug: log structure of first entry if it exists
        if (fullHistory.length > 0) {
            console.log('First entry structure:', fullHistory[0]);
            console.log('First entry questions:', fullHistory[0].questions);
        }
        
        populateSubjectFilter();
        updateStats();
        applyFilters();
    });

    // Add event listeners for the controls
    searchInput.addEventListener('input', applyFilters);
    subjectFilter.addEventListener('change', applyFilters);
    difficultyFilter.addEventListener('change', applyFilters);
    dateFilter.addEventListener('change', applyFilters);
    exportBtn.addEventListener('click', () => exportToMarkdown(filteredHistory));
    clearBtn.addEventListener('click', clearAllHistory);

    /**
     * Populates the subject filter dropdown with unique subjects from history
     */
    function populateSubjectFilter() {
        const subjects = new Set();
        
        fullHistory.forEach(analysis => {
            if (analysis.questions && analysis.questions.length > 0) {
                analysis.questions.forEach(question => {
                    if (question.subject && question.subject.trim()) {
                        subjects.add(question.subject.trim());
                    }
                });
            }
        });
        
        // Clear existing options and rebuild
        subjectFilter.innerHTML = '';
        
        // Always add the "All Subjects" option first
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All Subjects';
        subjectFilter.appendChild(allOption);
        
        // Add unique subjects
        Array.from(subjects).sort().forEach(subject => {
            const option = document.createElement('option');
            option.value = subject;
            option.textContent = subject.charAt(0).toUpperCase() + subject.slice(1);
            subjectFilter.appendChild(option);
        });
        
        console.log('Found subjects:', Array.from(subjects));
    }

    /**
     * Updates the statistics displayed in the stats bar
     */
    function updateStats() {
        const totalQuestions = fullHistory.reduce((count, analysis) => {
            return count + (analysis.questions ? analysis.questions.length : 0);
        }, 0);
        
        const subjects = new Set();
        fullHistory.forEach(analysis => {
            if (analysis.questions) {
                analysis.questions.forEach(question => {
                    if (question.subject) subjects.add(question.subject);
                });
            }
        });
        
        totalQuestionsEl.textContent = totalQuestions;
        uniqueSubjectsEl.textContent = subjects.size;
    }

    /**
     * Checks if a date matches the selected date filter
     */
    function matchesDateFilter(timestamp, dateFilterValue) {
        if (dateFilterValue === 'all') return true;
        
        const now = new Date();
        const itemDate = new Date(timestamp);
        
        switch (dateFilterValue) {
            case 'today':
                return itemDate.toDateString() === now.toDateString();
            case 'yesterday':
                const yesterday = new Date(now);
                yesterday.setDate(yesterday.getDate() - 1);
                return itemDate.toDateString() === yesterday.toDateString();
            case 'week':
                const weekAgo = new Date(now);
                weekAgo.setDate(weekAgo.getDate() - 7);
                return itemDate >= weekAgo;
            case 'month':
                const monthAgo = new Date(now);
                monthAgo.setMonth(monthAgo.getMonth() - 1);
                return itemDate >= monthAgo;
            default:
                return true;
        }
    }

    /**
     * Applies the current search and filter values to the history.
     */
    function applyFilters() {
        const searchTerm = searchInput.value.toLowerCase();
        const subject = subjectFilter.value;
        const difficulty = difficultyFilter.value;
        const dateFilterValue = dateFilter.value;

        filteredHistory = fullHistory.filter(analysis => {
            // Check date filter first
            if (!matchesDateFilter(analysis.timestamp, dateFilterValue)) {
                return false;
            }
            
            // Check if analysis has questions
            if (!analysis.questions || analysis.questions.length === 0) {
                return false;
            }
            
            // Check if any question in the analysis matches the filters
            return analysis.questions.some(question => {
                const matchesSearch = searchTerm === '' ||
                    (question.formatted_question && question.formatted_question.toLowerCase().includes(searchTerm)) ||
                    (question.direct_answer && question.direct_answer.toLowerCase().includes(searchTerm)) ||
                    (question.explanation && question.explanation.toLowerCase().includes(searchTerm));

                const matchesSubject = subject === 'all' || (question.subject && question.subject === subject);
                const matchesDifficulty = difficulty === 'all' || (
                    question.difficulty &&
                    question.difficulty.toString().trim().toLowerCase() === difficulty.trim().toLowerCase()
                );

                return matchesSearch && matchesSubject && matchesDifficulty;
            });
        });

        // Update filtered count
        const filteredQuestionCount = filteredHistory.reduce((count, analysis) => {
            return count + (analysis.questions ? analysis.questions.length : 0);
        }, 0);
        filteredCountEl.textContent = filteredQuestionCount;

        renderHistory(filteredHistory);
    }

    /**
     * Clears all history after user confirmation
     */
    function clearAllHistory() {
        if (confirm('Are you sure you want to clear all question history? This action cannot be undone.')) {
            chrome.storage.local.set({ history: [] }, () => {
                fullHistory = [];
                filteredHistory = [];
                populateSubjectFilter();
                updateStats();
                renderHistory([]);
                alert('History cleared successfully!');
            });
        }
    }

    /**
     * Formats a timestamp into a readable string
     */
    function formatTimestamp(timestamp) {
        if (!timestamp) return 'Unknown date';
        
        const date = new Date(timestamp);
        const now = new Date();
        const diffMs = now - date;
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
        
        if (diffDays === 0) {
            return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays === 1) {
            return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } else if (diffDays < 7) {
            return `${diffDays} days ago`;
        } else {
            return date.toLocaleDateString([], { 
                year: 'numeric', 
                month: 'short', 
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
        }
    }

    /**
     * Renders the question history on the page.
     * @param {Array<object>} history - The array of analysis objects to render.
     */
    function renderHistory(history) {
        if (!history || history.length === 0) {
            historyContainer.innerHTML = `
                <div class="no-results">
                    <i class="fas fa-search"></i>
                    <h3>No Questions Found</h3>
                    <p>No questions match your current filters. Try adjusting your search criteria.</p>
                </div>
            `;
            return;
        }

        historyContainer.innerHTML = history.map((analysis, analysisIndex) => {
            const timestamp = formatTimestamp(analysis.timestamp);
            let questionsHtml = '';
            
            analysis.questions.forEach((question, questionIndex) => {
                questionsHtml += `
                    <div class="history-item-question">
                        <h4><i class="fas fa-question-circle"></i> Question ${analysisIndex + 1}.${questionIndex + 1}</h4>
                        <p><strong>Question:</strong> ${question.formatted_question || 'No question text available'}</p>
                        <p><strong>Answer:</strong> ${question.direct_answer || 'No answer available'}</p>
                        <div class="details">
                            <span><i class="fas fa-book"></i> ${question.subject || 'Unknown'}</span>
                            <span><i class="fas fa-chart-line"></i> ${question.difficulty || 'Unknown'}</span>
                            <span><i class="fas fa-clock"></i> ${timestamp}</span>
                        </div>
                        <div class="explanation-toggle">
                            <button class="collapsible">
                                <i class="fas fa-eye"></i> Show Explanation
                            </button>
                            <div class="explanation-content">
                                <p><strong>Explanation:</strong> ${question.explanation || 'No explanation available'}</p>
                                <p><strong>Detailed Reasoning:</strong> ${question.detailed_reasoning || 'No detailed reasoning available'}</p>
                            </div>
                        </div>
                    </div>
                `;
            });
            
            return `
                <div class="history-analysis-card">
                    ${questionsHtml}
                </div>
            `;
        }).join('');

        // Add event listeners for collapsible sections
        document.querySelectorAll('.collapsible').forEach(button => {
            button.addEventListener('click', function() {
                this.classList.toggle('active');
                const content = this.nextElementSibling;
                
                if (content.classList.contains('active')) {
                    content.classList.remove('active');
                    content.style.maxHeight = null;
                    this.innerHTML = '<i class="fas fa-eye"></i> Show Explanation';
                } else {
                    content.classList.add('active');
                    content.style.maxHeight = content.scrollHeight + 'px';
                    this.innerHTML = '<i class="fas fa-eye-slash"></i> Hide Explanation';
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
