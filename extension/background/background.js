/**
 * This file is the service worker for the Chrome extension.
 * It runs in the background and handles tasks such as listening for commands,
 * managing the extension's state, and communicating with other parts of the extension.
 */

import { analyzeScreenshot, analyzeSelectedText } from '../utils/api.js';
import { initializeFirebase, saveHistoryToFirestore, syncHistoryFromFirestore } from '../utils/firebase.js';

/**
 * Updates the extension icon based on the provided state.
 * @param {string} state - The desired state: 'active', 'inactive', 'loading'.
 */
async function updateIcon(state) {
    try {
        let iconPath;
        switch (state) {
            case 'active':
            case 'success':
                iconPath = {
                    "16": "/assets/icons/icon_green.png",
                    "48": "/assets/icons/icon_green.png",
                    "128": "/assets/icons/icon_green.png"
                };
                break;
            case 'inactive':
                iconPath = {
                    "16": "/assets/icons/icon_red.png",
                    "48": "/assets/icons/icon_red.png",
                    "128": "/assets/icons/icon_red.png"
                };
                break;
            case 'loading':
                iconPath = {
                    "16": "/assets/icons/icon_loading.png",
                    "48": "/assets/icons/icon_loading.png",
                    "128": "/assets/icons/icon_loading.png"
                };
                break;
            default:
                iconPath = {
                    "16": "/assets/icons/icon_red.png",
                    "48": "/assets/icons/icon_red.png",
                    "128": "/assets/icons/icon_red.png"
                }; // Fallback
        }
        await chrome.action.setIcon({ path: iconPath });
        console.log(`Icon updated to: ${state}`);
    } catch (error) {
        console.error('Failed to update icon:', error);
    }
}

// Initial icon state on extension load
chrome.runtime.onInstalled.addListener(async (details) => {
    // Initialize Firebase on first install or update
    await initializeFirebase();

    if (details.reason === 'install') {
        // This is a fresh installation
        console.log('Extension installed for the first time!');
    }

    // Sync history from Firestore on startup
    await syncHistoryFromFirestore();

    // Set initial icon state
    chrome.storage.local.get('extensionActive', (data) => {
        updateIcon(data.extensionActive ? 'active' : 'inactive');
    });
});

// Listen for messages from popup.js and content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === 'updateIcon') {
        updateIcon(request.state);
    } else if (request.action === 'capturePartialScreenshot') {
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
            if (chrome.runtime.lastError || !dataUrl) {
                console.error('Failed to capture tab:', chrome.runtime.lastError);
                return;
            }

            fetch(dataUrl)
                .then(res => res.blob())
                .then(blob => createImageBitmap(blob))
                .then(imageBitmap => {
                    const dpr = request.rect.devicePixelRatio || 1;
                    const canvas = new OffscreenCanvas(request.rect.width * dpr, request.rect.height * dpr);
                    const ctx = canvas.getContext('2d');

                    ctx.drawImage(
                        imageBitmap,
                        request.rect.x * dpr,
                        request.rect.y * dpr,
                        request.rect.width * dpr,
                        request.rect.height * dpr,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );

                    return canvas.convertToBlob({ type: 'image/png' });
                })
                .then(blob => {
                    const reader = new FileReader();
                    reader.onload = () => {
                        const croppedDataUrl = reader.result;
                        // Now analyze the cropped image
                        updateIcon('loading');
                        analyzeScreenshot(croppedDataUrl)
                            .then(analysis => handleAnalysisResponse(analysis, croppedDataUrl))
                            .catch(error => {
                                console.error('Error during analysis of partial screenshot:', error);
                                updateIcon('inactive');
                            });
                    };
                    reader.readAsDataURL(blob);
                });
        });
    } else if (request.action === 'captureScrollingScreenshot') {
        // This is a placeholder for the scrolling logic.
        // It's a complex feature that will be implemented in a future step.
        console.log('Scrolling screenshot requested with rect:', request.rect);
        // For now, just capture the visible part.
        chrome.tabs.captureVisibleTab(null, { format: 'png' }, (dataUrl) => {
            if (chrome.runtime.lastError || !dataUrl) {
                console.error('Failed to capture tab:', chrome.runtime.lastError);
                return;
            }
            updateIcon('loading');
            analyzeScreenshot(dataUrl)
                .then(analysis => handleAnalysisResponse(analysis, dataUrl))
                .catch(error => {
                    console.error('Error during analysis of scrolling screenshot:', error);
                    updateIcon('inactive');
                });
        });
    }
});

// Listen for the screenshot command
chrome.commands.onCommand.addListener((command) => {
    console.log(`Command received: ${command}`);
    if (command === 'capture-screenshot') {
        handleScreenshotCapture();
    } else if (command === 'capture-selected-text') {
        handleSelectedTextCapture();
    } else if (command === 'capture-partial') {
        handlePartialScreenshot();
    }
});

function handlePartialScreenshot() {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]) {
            chrome.scripting.executeScript({
                target: { tabId: tabs[0].id },
                files: ['content/capture.js']
            });
            chrome.scripting.insertCSS({
                target: { tabId: tabs[0].id },
                files: ['content/capture.css']
            });
        }
    });
}

// Note: Removed onClicked listener to allow normal popup behavior
// The extension will use the default popup defined in manifest.json

/**
 * Handles the screenshot capture command.
 */
function handleScreenshotCapture() {
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
                    handleAnalysisResponse(analysis, screenshotUrl);
                } catch (error) {
                    console.error('Error during analysis:', error);
                    updateIcon('inactive'); // Revert to inactive on error
                }
            });
        } else {
            console.log('Extension is inactive. Not capturing screenshot.');
        }
    });
}

/**
 * Handles the selected text capture command.
 */
function handleSelectedTextCapture() {
    chrome.storage.local.get('extensionActive', async (data) => {
        if (data.extensionActive) {
            updateIcon('loading'); // Set icon to loading
            chrome.tabs.query({ active: true, currentWindow: true }, async (tabs) => {
                if (tabs[0]) {
                    try {
                        const result = await chrome.scripting.executeScript({
                            target: { tabId: tabs[0].id },
                            func: () => window.getSelection().toString()
                        });
                        const selectedText = result[0].result;
                        if (selectedText && selectedText.trim().length > 0) {
                            const analysis = await analyzeSelectedText(selectedText.trim());
                            handleAnalysisResponse(analysis);
                        } else {
                            // No text selected, do nothing or show a notification
                            updateIcon('inactive');
                        }
                    } catch (error) {
                        console.error('Error getting selected text:', error);
                        updateIcon('inactive');
                    }
                }
            });
        } else {
            console.log('Extension is inactive. Not capturing text.');
        }
    });
}

/**
 * Handles the response from the analysis API.
 * @param {object} analysis - The analysis object from the API.
 * @param {string} [screenshotUrl] - The data URL of the screenshot (if any).
 */
async function handleAnalysisResponse(analysis, screenshotUrl = null) {
    console.log('Analysis complete:', analysis);
    
    const enhancedAnalysis = {
        ...analysis,
        timestamp: new Date().toISOString(),
        date: new Date().toDateString(),
        time: new Date().toLocaleTimeString(),
        screenshotUrl: screenshotUrl
    };
    
    // Save to local storage first for immediate availability
    await new Promise(resolve => {
        chrome.storage.local.set({ lastAnalysis: enhancedAnalysis, lastScreenshotUrl: screenshotUrl }, resolve);
    });

    // Store the analysis in the history and update counters
    const data = await new Promise(resolve => {
        chrome.storage.local.get({ history: [], totalCount: 0, todayCount: 0, lastDate: null }, resolve);
    });
    
    const newHistory = [enhancedAnalysis, ...data.history];
    const questionsCount = analysis.questions_found || analysis.questions?.length || 0;
    const today = new Date().toDateString();
    
    let newTodayCount = data.todayCount;
    let newTotalCount = data.totalCount + questionsCount;
    
    if (data.lastDate !== today) {
        newTodayCount = questionsCount;
    } else {
        newTodayCount += questionsCount;
    }
    
    await new Promise(resolve => {
        chrome.storage.local.set({ 
            history: newHistory,
            totalCount: newTotalCount,
            todayCount: newTodayCount,
            lastDate: today
        }, resolve);
    });

    // Save to Firestore in the background
    await saveHistoryToFirestore(enhancedAnalysis);

    updateIcon('success'); // Set icon to success after successful analysis
    
    chrome.notifications.create({
        type: 'basic',
        iconUrl: 'assets/icons/icon_green.png',
        title: 'Question Analysis Complete!',
        message: `Found ${analysis.questions_found || analysis.questions?.length || 0} question(s). Click the extension icon to view results.`
    });
    
    try {
        chrome.action.openPopup();
    } catch (popupError) {
        console.log('Could not auto-open popup (this is normal):', popupError.message);
    }
}
