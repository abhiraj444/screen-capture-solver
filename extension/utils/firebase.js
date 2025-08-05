/**
 * This file handles Firebase authentication and Firestore operations.
 * It provides functions to save and retrieve user history from the cloud database.
 */

// Firebase imports (using v9 syntax)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';
import { getFirestore, collection, doc, setDoc, getDocs, query, orderBy, limit } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
import { firebaseConfig } from './firebaseConfig.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Current user UID
let currentUserUID = null;

/**
 * Initializes Firebase authentication and returns a promise that resolves when user is authenticated.
 * @returns {Promise<string>} - Promise that resolves with the user UID
 */
export async function initializeFirebase() {
    return new Promise((resolve, reject) => {
        // Check if user is already authenticated
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            unsubscribe(); // Unsubscribe after first check
            
            if (user) {
                // User is already signed in anonymously
                currentUserUID = user.uid;
                console.log('Firebase: User already authenticated with UID:', currentUserUID);
                resolve(currentUserUID);
            } else {
                // Sign in anonymously
                signInAnonymously(auth)
                    .then((result) => {
                        currentUserUID = result.user.uid;
                        console.log('Firebase: Anonymous sign-in successful, UID:', currentUserUID);
                        resolve(currentUserUID);
                    })
                    .catch((error) => {
                        console.error('Firebase: Anonymous sign-in failed:', error);
                        reject(error);
                    });
            }
        });
    });
}

/**
 * Saves a history entry to Firestore.
 * @param {object} analysisData - The analysis data to save
 * @returns {Promise<void>}
 */
export async function saveHistoryToFirestore(analysisData) {
    try {
        if (!currentUserUID) {
            await initializeFirebase();
        }

        // Create a unique document ID using timestamp
        const docId = analysisData.timestamp || new Date().toISOString();
        
        // Reference to the user's history collection
        const userHistoryRef = doc(db, 'users', currentUserUID, 'history', docId);
        
        // Save the analysis data
        await setDoc(userHistoryRef, {
            ...analysisData,
            savedAt: new Date().toISOString()
        });
        
        console.log('Firebase: History entry saved successfully');
    } catch (error) {
        console.error('Firebase: Error saving history to Firestore:', error);
        // Don't throw error - we want the extension to work even if Firebase fails
    }
}

/**
 * Retrieves all history entries from Firestore for the current user.
 * @returns {Promise<Array>} - Promise that resolves with array of history entries
 */
export async function getHistoryFromFirestore() {
    try {
        if (!currentUserUID) {
            await initializeFirebase();
        }

        // Reference to the user's history collection
        const userHistoryRef = collection(db, 'users', currentUserUID, 'history');
        
        // Query to get all history entries, ordered by timestamp (newest first)
        const historyQuery = query(userHistoryRef, orderBy('timestamp', 'desc'));
        
        // Get the documents
        const querySnapshot = await getDocs(historyQuery);
        
        const historyEntries = [];
        querySnapshot.forEach((doc) => {
            historyEntries.push(doc.data());
        });
        
        console.log(`Firebase: Retrieved ${historyEntries.length} history entries`);
        return historyEntries;
        
    } catch (error) {
        console.error('Firebase: Error retrieving history from Firestore:', error);
        return []; // Return empty array if Firebase fails
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
 * Gets the current user UID.
 * @returns {string|null} - The current user UID or null if not authenticated
 */
export function getCurrentUserUID() {
    return currentUserUID;
}
