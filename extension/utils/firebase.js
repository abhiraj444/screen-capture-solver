/**
 * This file handles Firebase authentication and Firestore operations using REST API.
 * It provides functions to save and retrieve user history from the cloud database.
 */

import { firebaseConfig } from './firebaseConfig.js';

// Current user data
let currentUserUID = null;
let authToken = null;

const API_KEY = firebaseConfig.apiKey;
const PROJECT_ID = firebaseConfig.projectId;
const AUTH_URL = `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${API_KEY}`;
const FIRESTORE_URL = `https://firestore.googleapis.com/v1/projects/${PROJECT_ID}/databases/(default)/documents`;

/**
 * Initializes Firebase authentication by signing in anonymously.
 * Stores UID and auth token in chrome.storage.local for persistence.
 * @returns {Promise<string>} - Promise that resolves with the user UID
 */
export async function initializeFirebase() {
    try {
        // Check if user data is already in local storage
        const data = await new Promise(resolve => {
            chrome.storage.local.get(['firebase_uid', 'firebase_auth_token'], resolve);
        });

        if (data.firebase_uid && data.firebase_auth_token) {
            currentUserUID = data.firebase_uid;
            authToken = data.firebase_auth_token;
            console.log('Firebase (REST): User already authenticated, UID:', currentUserUID);
            return currentUserUID;
        }

        // If not, sign up anonymously
        const response = await fetch(AUTH_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ returnSecureToken: true })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(`Anonymous sign-in failed: ${error.error.message}`);
        }

        const result = await response.json();
        currentUserUID = result.localId;
        authToken = result.idToken;

        // Save user data to local storage for persistence
        await new Promise(resolve => {
            chrome.storage.local.set({
                firebase_uid: currentUserUID,
                firebase_auth_token: authToken
            }, resolve);
        });

        console.log('Firebase (REST): Anonymous sign-in successful, UID:', currentUserUID);
        return currentUserUID;
        
    } catch (error) {
        console.error('Firebase (REST): Initialization failed:', error);
        throw error;
    }
}

/**
 * Saves a history entry to Firestore using the REST API.
 * @param {object} analysisData - The analysis data to save
 * @returns {Promise<void>}
 */
export async function saveHistoryToFirestore(analysisData) {
    try {
        if (!currentUserUID || !authToken) {
            await initializeFirebase();
        }

        const docId = analysisData.timestamp || new Date().toISOString();
        const url = `${FIRESTORE_URL}/users/${currentUserUID}/history/${docId}?key=${API_KEY}`;
        
        const firestoreObject = {
            fields: {
                ...Object.fromEntries(Object.entries(analysisData).map(([key, value]) => [key, { stringValue: JSON.stringify(value) }]))
            }
        };

        await fetch(url, {
            method: 'PATCH', // Use PATCH to create or overwrite
            headers: {
                'Authorization': `Bearer ${authToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(firestoreObject)
        });
        
        console.log('Firebase (REST): History entry saved successfully');

    } catch (error) {
        console.error('Firebase (REST): Error saving history:', error);
    }
}

/**
 * Retrieves all history entries from Firestore using the REST API.
 * @returns {Promise<Array>} - Promise that resolves with array of history entries
 */
export async function getHistoryFromFirestore() {
    try {
        if (!currentUserUID || !authToken) {
            await initializeFirebase();
        }

        const url = `${FIRESTORE_URL}/users/${currentUserUID}/history?key=${API_KEY}`;
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) return [];
        
        const result = await response.json();
        if (!result.documents) return [];
        
        const historyEntries = result.documents.map(doc => {
            const fields = doc.fields;
            const entry = {};
            
            Object.entries(fields).forEach(([key, value]) => {
                try {
                    entry[key] = JSON.parse(value.stringValue);
                } catch (error) {
                    console.warn(`Failed to parse field ${key}:`, value.stringValue);
                    entry[key] = value.stringValue; // Fallback to raw string
                }
            });
            
            return entry;
        });
        
        console.log(`Firebase (REST): Retrieved ${historyEntries.length} history entries`);
        return historyEntries.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    } catch (error) {
        console.error('Firebase (REST): Error retrieving history:', error);
        return [];
    }
}

/**
 * Syncs history from Firestore to local Chrome storage.
 * This is called when the extension starts up.
 * @returns {Promise<void>}
 */
export async function syncHistoryFromFirestore() {
    try {
        console.log('Firebase: Starting history sync...');
        
        // Get history from Firestore
        const firestoreHistory = await getHistoryFromFirestore();
        
        if (firestoreHistory.length === 0) {
            console.log('Firebase: No history found in Firestore');
            return;
        }
        
        // Get current local history
        const localData = await new Promise(resolve => {
            chrome.storage.local.get(['history', 'totalCount', 'todayCount', 'lastDate'], resolve);
        });
        
        const localHistory = localData.history || [];
        
        // Merge histories (avoid duplicates based on timestamp)
        const mergedHistory = [...firestoreHistory];
        
        // Add local entries that aren't in Firestore
        localHistory.forEach(localEntry => {
            const existsInFirestore = firestoreHistory.some(fsEntry => 
                fsEntry.timestamp === localEntry.timestamp
            );
            if (!existsInFirestore) {
                mergedHistory.push(localEntry);
            }
        });
        
        // Sort by timestamp (newest first)
        mergedHistory.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Calculate counters
        const totalCount = mergedHistory.reduce((count, entry) => {
            return count + (entry.questions_found || entry.questions?.length || 0);
        }, 0);
        
        const today = new Date().toDateString();
        const todayCount = mergedHistory
            .filter(entry => new Date(entry.timestamp).toDateString() === today)
            .reduce((count, entry) => {
                return count + (entry.questions_found || entry.questions?.length || 0);
            }, 0);
        
        // Update local storage with merged history
        await new Promise(resolve => {
            chrome.storage.local.set({
                history: mergedHistory,
                totalCount: totalCount,
                todayCount: todayCount,
                lastDate: today
            }, resolve);
        });
        
        console.log(`Firebase: History sync complete. Total entries: ${mergedHistory.length}`);
        
    } catch (error) {
        console.error('Firebase: Error during history sync:', error);
    }
}

/**
 * Deletes all history entries from Firestore for the current user.
 * @returns {Promise<void>}
 */
export async function clearAllHistoryFromFirestore() {
    try {
        if (!currentUserUID || !authToken) {
            await initializeFirebase();
        }

        // First, get all documents to find their IDs
        const url = `${FIRESTORE_URL}/users/${currentUserUID}/history?key=${API_KEY}`;
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        if (!response.ok) {
            console.log('Firebase (REST): No documents to delete or error fetching documents');
            return;
        }
        
        const result = await response.json();
        if (!result.documents || result.documents.length === 0) {
            console.log('Firebase (REST): No history documents found to delete');
            return;
        }
        
        // Delete each document
        const deletePromises = result.documents.map(doc => {
            // Extract document ID from the document name
            const docPath = doc.name;
            const docId = docPath.split('/').pop();
            const deleteUrl = `${FIRESTORE_URL}/users/${currentUserUID}/history/${docId}?key=${API_KEY}`;
            
            return fetch(deleteUrl, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${authToken}` }
            });
        });
        
        await Promise.all(deletePromises);
        console.log(`Firebase (REST): Successfully deleted ${result.documents.length} history entries`);
        
    } catch (error) {
        console.error('Firebase (REST): Error clearing history from Firestore:', error);
    }
}

/**
 * Gets the current user UID.
 * @returns {string|null} - The current user UID or null if not authenticated
 */
export function getCurrentUserUID() {
    return currentUserUID;
}
