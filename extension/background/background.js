/**
 * This file is the service worker for the Chrome extension.
 * It runs in the background and handles tasks such as listening for commands,
 * managing the extension's state, and communicating with other parts of the extension.
 */

import { analyzeScreenshot } from '../utils/api.js';

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
        // Fallback: try without leading slash
        try {
            let fallbackPath;
            switch (state) {
                case 'active':
                case 'success':
                    fallbackPath = "assets/icons/icon_green.png";
                    break;
                case 'loading':
                    fallbackPath = "assets/icons/icon_loading.png";
                    break;
                default:
                    fallbackPath = "assets/icons/icon_red.png";
            }
            await chrome.action.setIcon({ path: fallbackPath });
            console.log(`Fallback icon updated to: ${state}`);
        } catch (fallbackError) {
            console.error('Fallback icon update also failed:', fallbackError);
        }
    }
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

                        // Store the analysis in the history and update counters
                        chrome.storage.local.get({ history: [], totalCount: 0, todayCount: 0, lastDate: null }, (data) => {
                            // Add timestamp and enhanced metadata to analysis
                            const enhancedAnalysis = {
                                ...analysis,
                                timestamp: new Date().toISOString(),
                                date: new Date().toDateString(),
                                time: new Date().toLocaleTimeString(),
                                screenshotUrl: screenshotUrl
                            };
                            
                            const newHistory = [enhancedAnalysis, ...data.history]; // Store enhanced analysis
                            const questionsCount = analysis.questions_found || analysis.questions?.length || 0;
                            const today = new Date().toDateString();
                            
                            let newTodayCount = data.todayCount;
                            let newTotalCount = data.totalCount + questionsCount;
                            
                            // Reset today count if it's a new day
                            if (data.lastDate !== today) {
                                newTodayCount = questionsCount;
                            } else {
                                newTodayCount += questionsCount;
                            }
                            
                            chrome.storage.local.set({ 
                                history: newHistory,
                                totalCount: newTotalCount,
                                todayCount: newTodayCount,
                                lastDate: today
                            });
                        });

                        updateIcon('success'); // Set icon to success after successful analysis
                        
                        // Show notification to user that results are ready
                        chrome.notifications.create({
                            type: 'basic',
                            iconUrl: 'assets/icons/icon_green.png',
                            title: 'Question Analysis Complete!',
                            message: `Found ${analysis.questions_found || analysis.questions?.length || 0} question(s). Click the extension icon to view results.`
                        });
                        
                        // Try to open popup programmatically (may not work in all cases)
                        try {
                            await chrome.action.openPopup();
                        } catch (popupError) {
                            console.log('Could not auto-open popup (this is normal):', popupError.message);
                            // Fallback: The notification will guide the user to click the extension
                        }

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

// Note: Removed onClicked listener to allow normal popup behavior
// The extension will use the default popup defined in manifest.json
