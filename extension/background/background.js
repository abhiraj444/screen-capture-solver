/**
 * This file is the service worker for the Chrome extension.
 * It runs in the background and handles tasks such as listening for commands,
 * managing the extension's state, and communicating with other parts of the extension.
 */

import { analyzeScreenshot } from '../utils/api.js';

// Listen for the screenshot command
chrome.commands.onCommand.addListener((command) => {
    if (command === 'capture-screenshot') {
        // Check if the extension is active
        chrome.storage.local.get('extensionActive', (data) => {
            if (data.extensionActive) {
                // Capture the visible tab
                chrome.tabs.captureVisibleTab(async (screenshotUrl) => {
                    const analysis = await analyzeScreenshot(screenshotUrl);
                    console.log('Analysis complete:', analysis);
                    // TODO: Store and display the results
                });
            }
        });
    }
});
