/**
 * This file is the service worker for the Chrome extension.
 * It runs in the background and handles tasks such as listening for commands,
 * managing the extension's state, and communicating with other parts of the extension.
 */

import { analyzeScreenshot } from '../utils/api.js';

// Listen for the screenshot command
chrome.commands.onCommand.addListener((command) => {
    console.log(`Command received: ${command}`);
    if (command === 'capture-screenshot') {
        chrome.storage.local.get('extensionActive', async (data) => {
            console.log(`Extension active status: ${data.extensionActive}`);
            if (data.extensionActive) {
                console.log('Attempting to capture visible tab...');
                chrome.tabs.captureVisibleTab(async (screenshotUrl) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error capturing tab:', chrome.runtime.lastError.message);
                        return;
                    }
                    console.log('Tab captured. Screenshot URL length:', screenshotUrl ? screenshotUrl.length : 'null');

                    try {
                        const analysis = await analyzeScreenshot(screenshotUrl);
                        console.log('Analysis complete:', analysis);
                        chrome.storage.local.set({ lastAnalysis: analysis, lastScreenshotUrl: screenshotUrl });

                        // Store the analysis in the history
                        chrome.storage.local.get({ history: [] }, (data) => {
                            const newHistory = [analysis, ...data.history]; // Only store the analysis object
                            chrome.storage.local.set({ history: newHistory });
                        });

                    } catch (error) {
                        console.error('Error during analysis:', error);
                        // Optionally show an error message in the console or a notification
                    }
                });
            } else {
                console.log('Extension is inactive. Not capturing screenshot.');
            }
        });
    }
});

// Handle extension icon click (to show full popup)
chrome.action.onClicked.addListener(() => {
    chrome.windows.create({
        url: 'popup/popup.html?mode=full',
        type: 'popup',
        width: 400,
        height: 600,
        focused: true
    });
});
