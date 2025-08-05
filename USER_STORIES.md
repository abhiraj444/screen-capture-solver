# AI Question Solver - User Stories & Checklist

This document tracks the user stories and implementation checklist for the AI Question Solver Chrome Extension. It is a living document that will be updated as the project progresses.

## Phase 1: Core Foundation (Week 1-2)

*   [x] **User Story:** As a user, I want to be able to install the Chrome extension.
    *   [x] Create `manifest.json` with basic extension properties.
    *   [x] Create basic `popup.html` and `popup.js`.
    *   [x] Create `background.js` service worker.
    *   [x] Create `content.js` for page interaction.
*   [x] **User Story:** As a user, I want to be able to activate and deactivate the extension.
    *   [x] Implement a toggle button in `popup.html`.
    *   [x] Implement logic in `popup.js` to manage the extension's state (active/inactive).
    *   [x] Display a visual indicator of the extension's status.
*   [x] **User Story:** As a user, I want to be able to take a screenshot of the current tab using a keyboard shortcut.
    *   [x] Define the `capture-screenshot` command in `manifest.json` (Alt+S).
    *   [x] Implement the screenshot capture logic in `background.js`.
    *   [ ] **Bug:** `Alt+S` not capturing screenshot (debugging and fixing).

## Phase 2: Enhanced Processing (Week 3-4)

*   [x] **User Story:** As a user, I want the extension to automatically detect all questions in the screenshot.
    *   [x] Integrate with the Gemini API in `background.js`.
    *   [x] Send the captured screenshot to the Gemini API for analysis.
    *   [x] Handle the API response and extract the identified questions.
*   [x] **User Story:** As a user, I want to see the formatted answers to the questions.
    *   [x] Implement logic to display the questions and answers in `popup.html`.
    *   [x] Support different question types (MCQ, short answer, etc.).
    *   [x] Implement confidence scoring and display it to the user.
    *   [x] **Bug:** Only one question is displayed even if Gemini returns multiple.
        *   [x] Modify `popup.js` to iterate and display all questions from Gemini response.
*   [x] **User Story:** As a user, I want the extension to handle errors gracefully.
    *   [x] Implement error handling for API requests.
    *   [x] Implement retry logic for failed requests.

## Phase 3: Storage & History (Week 5-6)

*   [x] **User Story:** As a user, I want my question history to be saved locally.
    *   [x] Use `chrome.storage.local` to store the question history.
*   [x] **User Story:** As a user, I want to view my question history.
    *   [x] Create `history.html`, `history.js`, and `history.css`.
    *   [x] Implement the history viewer interface.
    *   [x] **Bug:** Explanation is not showing in the history tab.
        *   [x] Modify `history.js` to display explanation and detailed reasoning.
*   [x] **User Story:** As a user, I want to be able to search and filter my question history.
    *   [x] Implement search and filter functionality in `history.js`.
*   [x] **User Story:** As a user, I want to be able to export my question history.
    *   [x] Implement export functionality (e.g., to PDF or Markdown).

## Phase 4: UI/UX Enhancements & Automation (Week 7-8)

*   [x] **User Story:** As a user, I want to easily view detailed explanations without cluttering the interface.
    *   [x] Implement collapsible sections for explanation and detailed reasoning in both popup and history views.
    *   [x] Add an expand/collapse icon/button.
    *   [ ] Ensure UI/UX is clean, interesting, and minimal.
*   [ ] **User Story:** As a user, I want a seamless and automated experience when capturing and viewing answers.
    *   [ ] Display a loading indicator popup immediately after `Alt+S` is pressed.
    *   [ ] Automatically show a results popup (question and direct answer only) after Gemini response.
    *   [ ] Auto-dismiss the results popup after 5 seconds.
    *   [ ] Ensure clicking the extension icon still shows the full popup with all details.
*   [x] **User Story:** As a user on macOS, I want an alternative keyboard shortcut for capturing screenshots.
    *   [x] Investigate and implement a suitable alternative to `Alt+S` for macOS.
*   [x] **Bug:** Settings icon in the extension popup is not working.
    *   [x] Create `options.html` and `options.js`
    *   [x] Link the settings button in `popup.html` to open `options.html`.

## Phase 2: Enhanced Processing (Week 3-4)

*   [x] **User Story:** As a user, I want the extension to automatically detect all questions in the screenshot.
    *   [x] Integrate with the Gemini API in `background.js`.
    *   [x] Send the captured screenshot to the Gemini API for analysis.
    *   [x] Handle the API response and extract the identified questions.
*   [x] **User Story:** As a user, I want to see the formatted answers to the questions.
    *   [x] Implement logic to display the questions and answers in `popup.html`.
    *   [x] Support different question types (MCQ, short answer, etc.).
    *   [x] Implement confidence scoring and display it to the user.
    *   [ ] **Bug:** Only one question is displayed even if Gemini returns multiple.
        *   [ ] Modify `popup.js` to iterate and display all questions from Gemini response.
*   [x] **User Story:** As a user, I want the extension to handle errors gracefully.
    *   [x] Implement error handling for API requests.
    *   [x] Implement retry logic for failed requests.

## Phase 3: Storage & History (Week 5-6)

*   [x] **User Story:** As a user, I want my question history to be saved locally.
    *   [x] Use `chrome.storage.local` to store the question history.
*   [x] **User Story:** As a user, I want to view my question history.
    *   [x] Create `history.html`, `history.js`, and `history.css`.
    *   [x] Implement the history viewer interface.
    *   [ ] **Bug:** Explanation is not showing in the history tab.
        *   [ ] Modify `history.js` to display explanation and detailed reasoning.
*   [x] **User Story:** As a user, I want to be able to search and filter my question history.
    *   [x] Implement search and filter functionality in `history.js`.
*   [x] **User Story:** As a user, I want to be able to export my question history.
    *   [x] Implement export functionality (e.g., to PDF or Markdown).

## Phase 4: UI/UX Enhancements & Automation (Week 7-8)

*   [ ] **User Story:** As a user, I want to easily view detailed explanations without cluttering the interface.
    *   [ ] Implement collapsible sections for explanation and detailed reasoning in both popup and history views.
    *   [ ] Add an expand/collapse icon/button.
    *   [ ] Ensure UI/UX is clean, interesting, and minimal.
*   [ ] **User Story:** As a user, I want a seamless and automated experience when capturing and viewing answers.
    *   [ ] Display a loading indicator popup immediately after `Alt+S` is pressed.
    *   [ ] Automatically show a results popup (question and direct answer only) after Gemini response.
    *   [ ] Auto-dismiss the results popup after 5 seconds.
    *   [ ] Ensure clicking the extension icon still shows the full popup with all details.
*   [ ] **User Story:** As a user on macOS, I want an alternative keyboard shortcut for capturing screenshots.
    *   [ ] Investigate and implement a suitable alternative to `Alt+S` for macOS.
*   [ ] **Bug:** Settings icon in the extension popup is not working.
    *   [ ] Create `options.html` and `options.js`.
    *   [ ] Link the settings button in `popup.html` to open `options.html`.

## Phase 5: Polish & Deploy (Week 9-10)

*   [ ] **User Story:** As a user, I want a polished and intuitive user interface.
    *   [ ] Refine the UI/UX of the extension.
*   [ ] **User Story:** As a user, I want the extension to be fast and reliable.
    *   [ ] Conduct comprehensive testing.
    *   [ ] Optimize the performance of the extension.
*   [ ] **User Story:** As a user, I want to be able to install the extension from the Chrome Web Store.
    *   [ ] Prepare the extension for deployment.
    *   [ ] Create documentation and tutorials.