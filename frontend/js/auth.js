// frontend/js/auth.js

// We no longer need ES module imports, as the CDN provides global access to firebase
// We will use the Firebase object globally.
const auth = firebase.auth(); // Access the global auth object
// The original imports were: 
// import { auth } from './firebase-config.js'; 
// import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

// ----------------------------------------------------
// Configuration and DOM Elements
// ----------------------------------------------------
const API_BASE_URL = 'http://localhost:5000/api';

const formTitle = document.getElementById('form-title');
const authForm = document.getElementById('auth-form');
const submitButton = document.getElementById('submit-button');
const toggleLink = document.getElementById('toggle-link');
const usernameField = document.getElementById('username-field');
const authError = document.getElementById('auth-error');

let isLogin = true; // State variable: true for Login, false for Signup

// ----------------------------------------------------
// UI Toggling Functions
// ----------------------------------------------------

/**
 * Toggles the form between Login and Signup states.
 */
const toggleForm = () => {
    isLogin = !isLogin;
    
    // 1. Update form title and button text
    formTitle.textContent = isLogin ? 'Log in to save your playlists' : 'Sign up to start learning';
    submitButton.textContent = isLogin ? 'Login' : 'Sign Up';
    toggleLink.innerHTML = isLogin ? "Don't have an account? Sign up" : "Already have an account? Log in";
    
    // 2. Show/Hide the Username field
    usernameField.style.display = isLogin ? 'none' : 'block';
    
    // 3. Clear any previous errors
    authError.classList.add('hidden');
};

// ----------------------------------------------------
// Authentication Handlers
// ----------------------------------------------------

/**
 * Handles the Sign Up process (Client Auth + Backend Profile Creation)
 */
const handleSignup = async (email, password, username) => {
    try {
        // 1. Create User in Firebase Authentication (Client SDK)
        const userCredential = await auth.createUserWithEmailAndPassword(email, password);
        const user = userCredential.user;
        
        // 2. Send request to backend
        const response = await fetch(`${API_BASE_URL}/auth/signup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            // CHANGE THIS LINE: Add 'uid' to the body
            body: JSON.stringify({ email, password, username, uid: user.uid }) 
        });

        // Backend should validate and save profile; if successful, redirect
        if (response.ok) {
            alert(`Welcome, ${username}! Account created and profile saved.`);
            window.location.href = 'dashboard.html'; // Redirect on success
        } else {
            // Handle backend error (e.g., Firestore failure)
            const errorData = await response.json();
            authError.textContent = `Error creating profile: ${errorData.message}`;
            authError.classList.remove('hidden');
            // IMPORTANT: If Firestore profile fails, we should delete the Firebase Auth user, 
            // but for simplicity here, we alert and keep the Firebase user for now.
        }

    } catch (error) {
        // Handle Firebase Client Auth errors (e.g., email-already-in-use, weak password)
        console.error("Firebase Signup Error:", error.code);
        authError.textContent = `Signup Failed: ${error.message}`;
        authError.classList.remove('hidden');
    }
};

/**
 * Handles the Login process (Client Auth and Token Retrieval)
 */
const handleLogin = async (email, password) => {
    try {
        // 1. Sign In User in Firebase Authentication
        await auth.signInWithEmailAndPassword(email, password);
        
        // 2. On successful login, redirect to the Dashboard
        alert('Login successful! Redirecting to Dashboard.');
        window.location.href = 'dashboard.html'; 

    } catch (error) {
        // Handle Firebase Client Auth errors (e.g., wrong password, user-not-found)
        console.error("Firebase Login Error:", error.code);
        authError.textContent = `Login Failed: Invalid credentials.`;
        authError.classList.remove('hidden');
    }
};


// ----------------------------------------------------
// Event Listeners
// ----------------------------------------------------

// Toggle link listener
toggleLink.addEventListener('click', (e) => {
    e.preventDefault();
    toggleForm();
    console.log("Form toggled. Current state:", isLogin ? 'Login' : 'Signup'); // Add this line for debugging
});

// Main form submission listener
authForm.addEventListener('submit', (e) => {
    e.preventDefault();
    authError.classList.add('hidden'); // Clear error on new submission

    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const username = document.getElementById('username')?.value || 'Guest'; // Optional username
    
    // Check if passwords meet Firebase minimum requirements for display
    if (password.length < 6) {
        authError.textContent = 'Password must be at least 6 characters.';
        authError.classList.remove('hidden');
        return;
    }

    if (isLogin) {
        handleLogin(email, password);
    } else {
        handleSignup(email, password, username);
    }
});

// Set initial form state when page loads
toggleForm(); // Will set isLogin to false, then the function runs and flips it back to true (Login)            