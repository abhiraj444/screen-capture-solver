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
        chrome.storage.local.get('extensionActive', (data) => {
            console.log(`Extension active status: ${data.extensionActive}`);
            if (data.extensionActive) {
                console.log('Attempting to capture visible tab...');
                chrome.tabs.captureVisibleTab(async (screenshotUrl) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error capturing tab:', chrome.runtime.lastError.message);
                        return;
                    }
                    console.log('Tab captured. Screenshot URL length:', screenshotUrl ? screenshotUrl.length : 'null');
                    const analysis = await analyzeScreenshot(screenshotUrl);
                    console.log('Analysis complete:', analysis);
                    chrome.storage.local.set({ lastAnalysis: analysis, lastScreenshotUrl: screenshotUrl });

                    chrome.storage.local.get({ history: [] }, (data) => {
                        const newHistory = [analysis, ...data.history]; // Only store the analysis object
                        chrome.storage.local.set({ history: newHistory });
                    });
                });
            } else {
                console.log('Extension is inactive. Not capturing screenshot.');
            }
        });
    }
});
