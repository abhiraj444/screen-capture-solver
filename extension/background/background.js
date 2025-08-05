/**
 * This file is the service worker for the Chrome extension.
 * It runs in the background and handles tasks such as listening for commands,
 * managing the extension's state, and communicating with other parts of the extension.
 */

import { analyzeScreenshot } from '../utils/api.js';



const ICON_RED_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAADRJREFUOE9jZGBgYGDgYmBgYAAABQAB/gYAA54B8wAAAABJRU5ErkJggg=='; // Solid Red 16x16
const ICON_GREEN_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAADJJREFUOE9jZGBgYGDgYmBgYAAABQAB/gYAA54B8wAAAABJRU5ErkJggg=='; // Solid Green 16x16
const ICON_LOADING_BASE64 = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAAXNSR0IArs4c6QAAADJJREFUOE9jZGBgYGDgYmBgYAAABQAB/gYAA54B8wAAAABJRU5ErkJggg=='; // Solid Blue 16x16

/**
 * Converts a base64 image string to ImageData using OffscreenCanvas.
 * @param {string} base64 - The base64 encoded image string.
 * @returns {Promise<ImageData>} - A promise that resolves with the ImageData object.
 */
async function createImageData(base64) {
    const response = await fetch(base64);
    const blob = await response.blob();
    const imageBitmap = await createImageBitmap(blob);

    const canvas = new OffscreenCanvas(imageBitmap.width, imageBitmap.height);
    const ctx = canvas.getContext('2d');
    ctx.drawImage(imageBitmap, 0, 0);
    return ctx.getImageData(0, 0, imageBitmap.width, imageBitmap.height);
}

/**
 * Updates the extension icon based on the provided state.
 * @param {string} state - The desired state: 'active', 'inactive', 'loading'.
 */
async function updateIcon(state) {
    let imageData;
    switch (state) {
        case 'active':
            imageData = await createImageData(ICON_GREEN_BASE64);
            break;
        case 'inactive':
            imageData = await createImageData(ICON_RED_BASE64);
            break;
        case 'loading':
            imageData = await createImageData(ICON_LOADING_BASE64);
            break;
        default:
            imageData = await createImageData(ICON_RED_BASE64); // Fallback
    }
    chrome.action.setIcon({ imageData: imageData });
}

// Initial icon state on extension load
chrome.runtime.onInstalled.addListener(() => {
    chrome.storage.local.get('extensionActive', (data) => {
        updateIcon(data.extensionActive ? 'active' : 'inactive');
    });
});

// Listen for messages from popup.js to update icon
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateIcon') {
        updateIcon(request.state);
    }
});

// Listen for the screenshot command
chrome.commands.onCommand.addListener((command) => {
    console.log(`Command received: ${command}`);
    if (command === 'capture-screenshot') {
        chrome.storage.local.get('extensionActive', async (data) => {
            console.log(`Extension active status: ${data.extensionActive}`);
            if (data.extensionActive) {
                updateIcon('loading'); // Set icon to loading
                console.log('Attempting to capture visible tab...');
                chrome.tabs.captureVisibleTab(async (screenshotUrl) => {
                    if (chrome.runtime.lastError) {
                        console.error('Error capturing tab:', chrome.runtime.lastError.message);
                        updateIcon('inactive'); // Revert to inactive on error
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

                        updateIcon('active'); // Set icon to active after successful analysis

                    } catch (error) {
                        console.error('Error during analysis:', error);
                        updateIcon('inactive'); // Revert to inactive on error
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
