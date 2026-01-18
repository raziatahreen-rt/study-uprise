// config/firebase.js
const admin = require('firebase-admin');

// The path to your service account key file (relative to this config folder)
const serviceAccount = require('../serviceAccountKey.json'); 
// NOTE: '../' is necessary because this file is inside 'config' directory.

// Initialize Firebase Admin SDK
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  // We use the project ID from the .env file if needed, but the service account is primary
});

console.log("🔥 Firebase Admin SDK initialized successfully.");

// Export the initialized auth and firestore instances for use in controllers
const auth = admin.auth();
const db = admin.firestore();

module.exports = { auth, db, admin };