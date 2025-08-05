/**
 * This file contains the logic for the popup's user interface.
 * It handles user interactions with the popup, such as clicking the toggle button,
 * and updates the UI to reflect the current state of the extension.
 */

document.addEventListener('DOMContentLoaded', () => {
    const toggleBtn = document.getElementById('toggleBtn');
    const statusEl = document.getElementById('status');

    // Load the current state from storage
    chrome.storage.local.get('extensionActive', (data) => {
        updateUI(data.extensionActive);
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
});
