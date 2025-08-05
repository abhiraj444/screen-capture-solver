/**
 * This file is injected into web pages and is used to interact with the page content.
 * For example, it could be used to highlight the questions that have been identified by the AI.
 */

/**
 * Highlights the correct MCQ answer on the page with a sparkling border.
 * @param {string} answerText - The answer text from Gemini (e.g., "A", "B", "C", "D" or actual answer).
 */
function highlightMCQAnswer(answerText) {
    if (!answerText) return;

    // Sparkling border CSS
    const sparkleStyle = `
        outline: 3px solid #ffd700;
        box-shadow: 0 0 8px 2px #ffd700, 0 0 20px 4px #fff700;
        border-radius: 6px;
        transition: outline 0.3s, box-shadow 0.3s;
        position: relative;
        z-index: 9999;
    `;

    // Find all text nodes in the document
    function walkNodes(node) {
        if (node.nodeType === Node.TEXT_NODE) {
            if (node.textContent.trim().length > 0 &&
                node.textContent.trim().toLowerCase() === answerText.trim().toLowerCase()) {
                const span = document.createElement('span');
                span.style = sparkleStyle;
                span.textContent = node.textContent;
                node.parentNode.replaceChild(span, node);
            }
        } else {
            node.childNodes.forEach(walkNodes);
        }
    }

    walkNodes(document.body);
}

// Example: Listen for messages from background/popup and highlight answer
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'highlight_mcq_answer' && request.answer) {
        highlightMCQAnswer(request.answer);
        sendResponse({ status: 'done' });
    }
});

