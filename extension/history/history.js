/**
 * This file contains the logic for the history page.
 * It retrieves the question history from storage, allows users to filter it,
 * renders the results on the page, and allows exporting the history.
 */

// Import Firebase functions
import { getHistoryFromFirestore, syncHistoryFromFirestore, clearAllHistoryFromFirestore } from '../utils/firebase.js';

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
    loadHistoryData();

    // Add event listeners for the controls
    searchInput.addEventListener('input', applyFilters);
    subjectFilter.addEventListener('change', applyFilters);
    difficultyFilter.addEventListener('change', applyFilters);
    dateFilter.addEventListener('change', applyFilters);
    exportBtn.addEventListener('click', () => exportToMarkdown(filteredHistory));
    clearBtn.addEventListener('click', clearAllHistory);

    // Add Export to PDF button to controls bar
    const actionsBar = document.querySelector('.actions');
    const exportPdfBtn = document.createElement('button');
    exportPdfBtn.id = 'export-pdf-btn';
    exportPdfBtn.textContent = 'Export to PDF';
    exportPdfBtn.className = 'btn btn-secondary';

    // Insert Export to PDF button between Export and Clear All
    actionsBar.insertBefore(exportPdfBtn, document.getElementById('clear-btn'));

    exportPdfBtn.addEventListener('click', () => exportToPDF(filteredHistory));

    /**
     * Loads history data from local storage, with Firebase fallback
     */
    async function loadHistoryData() {
        try {
            console.log('History page: Starting to load history data...');
            
            // First try to load from local storage
            const data = await new Promise(resolve => {
                chrome.storage.local.get({ history: [] }, resolve);
            });
            
            fullHistory = data.history || [];
            console.log('History page: Loaded local history:', fullHistory.length, 'entries');
            
            // If local storage is empty, try to sync from Firebase
            if (fullHistory.length === 0) {
                console.log('History page: Local history is empty, syncing from Firebase...');
                try {
                    await syncHistoryFromFirestore();
                    
                    // Reload from local storage after sync
                    const syncedData = await new Promise(resolve => {
                        chrome.storage.local.get({ history: [] }, resolve);
                    });
                    
                    fullHistory = syncedData.history || [];
                    console.log('History page: After Firebase sync:', fullHistory.length, 'entries');
                } catch (firebaseError) {
                    console.error('History page: Firebase sync failed:', firebaseError);
                }
            }
            
            // Debug: log structure of first entry if it exists
            if (fullHistory.length > 0) {
                console.log('History page: First entry structure:', fullHistory[0]);
                console.log('History page: First entry questions:', fullHistory[0].questions);
            } else {
                console.log('History page: No history entries found.');
            }
            
            console.log('History page: Populating UI...');
            populateSubjectFilter();
            updateStats();
            applyFilters();
            console.log('History page: UI population complete.');
            
        } catch (error) {
            console.error('History page: Error loading history data:', error);
            // Fallback to empty history
            fullHistory = [];
            populateSubjectFilter();
            updateStats();
            applyFilters();
        }
    }

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

        filteredHistory = fullHistory
            .filter(analysis => matchesDateFilter(analysis.timestamp, dateFilterValue))
            .map(analysis => {
                // Filter questions inside each analysis
                const filteredQuestions = (analysis.questions || []).filter(question => {
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

                // Return a new analysis object with only filtered questions
                return {
                    ...analysis,
                    questions: filteredQuestions
                };
            })
            // Only keep analyses that have at least one matching question
            .filter(analysis => analysis.questions && analysis.questions.length > 0);

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
    async function clearAllHistory() {
        if (confirm('Are you sure you want to clear all question history? This action cannot be undone.')) {
            try {
                console.log('History page: Clearing all history...');
                
                // Clear from local storage
                await new Promise(resolve => {
                    chrome.storage.local.set({ 
                        history: [],
                        totalCount: 0,
                        todayCount: 0,
                        lastDate: null
                    }, resolve);
                });
                
                // Clear from Firebase
                await clearAllHistoryFromFirestore();
                
                // Update UI
                fullHistory = [];
                filteredHistory = [];
                populateSubjectFilter();
                updateStats();
                renderHistory([]);
                
                console.log('History page: All history cleared successfully!');
                alert('History cleared successfully from both local storage and cloud!');
                
            } catch (error) {
                console.error('History page: Error clearing history:', error);
                alert('History cleared from local storage, but there was an error clearing cloud data.');
            }
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

    /**
     * Exports the given history to a PDF file using Chrome's print dialog.
     * Only includes question, answer, and analysis (not reasoning).
     * @param {Array<object>} history - The array of analysis objects to export.
     */
    function exportToPDF(history) {
        if (!history || history.length === 0) {
            alert('No history to export.');
            return;
        }

        let htmlContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Question History PDF Export</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #2c3e50; border-bottom: 2px solid #eee; }
        .question-block { margin-bottom: 32px; padding: 16px; border: 1px solid #ddd; border-radius: 8px; background: #fafafa; }
        .question-title { font-size: 1.1em; font-weight: bold; margin-bottom: 8px; }
        .answer { color: #222; margin-bottom: 8px; } /* Black */
        .analysis { color: #444; margin-bottom: 8px; } /* Dark gray */
        .meta { font-size: 0.95em; color: #888; }
    </style>
</head>
<body>
    <h1>Exported Question History</h1>
`;

        history.forEach((analysis, analysisIndex) => {
            (analysis.questions || []).forEach((question, questionIndex) => {
                htmlContent += `
    <div class="question-block">
        <div class="question-title">Q${analysisIndex + 1}.${questionIndex + 1}: ${question.formatted_question || ''}</div>
        <div class="answer"><strong>Answer:</strong> ${question.direct_answer || ''}</div>
        <div class="analysis"><strong>Explanation:</strong> ${question.explanation || ''}</div>
        <div class="meta">
            <span><strong>Subject:</strong> ${question.subject || 'Unknown'}</span> |
            <span><strong>Difficulty:</strong> ${question.difficulty || 'Unknown'}</span>
        </div>
    </div>
                `;
            });
        });

        htmlContent += `
</body>
</html>
`;

        // Open in new window and trigger print dialog
        const printWindow = window.open('', '_blank');
        printWindow.document.write(htmlContent);
        printWindow.document.close();
        printWindow.focus();
        printWindow.print();
    }
});
