# AI Question Solver

This Chrome extension allows you to capture questions from any webpage and get answers from Gemini. Your question history is automatically saved to the cloud and persists even if you uninstall the extension or clear your browser data.

## Features

- Capture screenshots of questions with `Alt+S`
- Capture selected text with `Alt+X`
- Get answers from Gemini
- View your question history
- **Persistent cloud storage** - your history never gets lost
- Anonymous authentication - no signup required

## Setup Instructions

### 1. Firebase Configuration (Required)

This extension uses Firebase for persistent storage. You'll need to set up a Firebase project:

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project
3. Enable **Firestore Database** in test mode
4. Enable **Authentication** and turn on **Anonymous** sign-in method
5. In Firestore Database rules, set rules to allow anonymous access:
   ```
   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /users/{userId}/{document=**} {
         allow read, write: if request.auth != null && request.auth.uid == userId;
       }
     }
   }
   ```
5. Go to Project Settings > General > Your apps
6. Add a web app and copy the configuration
7. Replace the placeholder values in `extension/utils/firebaseConfig.js` with your actual Firebase config:

```javascript
export const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-project.firebaseapp.com",
    projectId: "your-project-id",
    storageBucket: "your-project.appspot.com",
    messagingSenderId: "123456789",
    appId: "your-app-id"
};
```

### 2. Gemini API Key

Make sure you have a valid Gemini API key in `extension/utils/api.js`.

## How to use it

1. Install the extension.
2. Click the extension icon to activate it. The icon will turn green.
3. To capture a screenshot, press `Alt+S`.
4. To capture selected text, select the text on the page and press `Alt+X`.
5. The extension will analyze the question and show you the answer.
6. Click the extension icon to view the answer and your question history.

## Persistent Storage

- Your question history is automatically saved to Firebase Firestore
- No manual backup needed - everything is stored in the cloud
- If you reinstall the extension, your history will be automatically restored
- Uses anonymous authentication - no personal information required
