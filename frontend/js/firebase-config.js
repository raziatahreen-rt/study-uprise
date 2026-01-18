// frontend/js/firebase-config.js

// Import the functions you need from the SDKs
// We are using the "compat" library for easier syntax (closer to v8)
// import firebase from 'firebase/compat/app';
// import 'firebase/compat/auth';
// import 'firebase/compat/firestore';

// Use modular imports for the installed Firebase SDK
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// ----------------------------------------------------
// Frie base config 
// ----------------------------------------------------
const firebaseConfig = {
    apiKey: "your-api-key",
    authDomain: "your-auth-domain",
    projectId: "study-uprise-id",
    storageBucket: "your-storage-bucket",
    messagingSenderId: "sender-id",
    appId: "your-app-id"
};
// ----------------------------------------------------

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize and export Firebase services using the imported functions
const auth = getAuth(app); // Correct modular way to get Auth service
const db = getFirestore(app); // Correct modular way to get Firestore service

export { app, auth, db };