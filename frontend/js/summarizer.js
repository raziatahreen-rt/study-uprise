// frontend/js/summarizer.js

// ----------------------------------------------------
// Firebase Services
// ----------------------------------------------------
const auth = firebase.auth();

// ----------------------------------------------------
// Configuration and DOM Elements
// ----------------------------------------------------
const API_BASE_URL = 'http://localhost:5000/api';

// --- Nav Elements ---
const navDashboardLink = document.getElementById('nav-dashboard-link');
const navAuthButton = document.getElementById('nav-auth-button');

// --- Page Elements ---
const summarizeForm = document.getElementById('summarize-form');
const summarizeButton = document.getElementById('summarize-button');
const pdfFile = document.getElementById('pdf-file');
const resultsContainer = document.getElementById('results-container');
const summaryOutput = document.getElementById('summary-output');
const fulltextOutput = document.getElementById('fulltext-output');
const quizButton = document.getElementById('quiz-button'); // The new button

// --- Global State ---
let currentDocText = ""; // To store the text for the quiz

// ----------------------------------------------------
// Authentication
// ----------------------------------------------------
auth.onAuthStateChanged((user) => {
    if (user) {
        navDashboardLink.classList.remove('hidden');
        navAuthButton.textContent = 'Logout';
        navAuthButton.href = '#';
        
        navAuthButton.addEventListener('click', async (e) => {
            e.preventDefault();
            await auth.signOut();
            window.location.href = 'index.html';
        });
    } else {
        navDashboardLink.classList.add('hidden');
        navAuthButton.textContent = 'Login / Signup';
        navAuthButton.href = './login.html';
    }
});

// ----------------------------------------------------
// Summarizer Form Handler
// ----------------------------------------------------
summarizeForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
        alert('You must be logged in to use the summarizer.');
        window.location.href = 'login.html';
        return;
    }

    const file = pdfFile.files[0];
    if (!file) {
        alert('Please select a PDF file to upload.');
        return;
    }

    summarizeButton.textContent = 'Processing...';
    summarizeButton.disabled = true;
    resultsContainer.classList.add('hidden');

    try {
        const formData = new FormData();
        formData.append('document', file);

        const idToken = await user.getIdToken(true);

        const response = await fetch(`${API_BASE_URL}/ai/summarize`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${idToken}`
            },
            body: formData
        });

        const data = await response.json();

        if (response.ok) {
            // --- SUCCESS ---
            summaryOutput.innerHTML = data.summary;
            fulltextOutput.value = data.extractedText;
            
            // Store the text globally so we can use it for the quiz
            currentDocText = data.extractedText; 
            
            resultsContainer.classList.remove('hidden');
        } else {
            alert(`Error: ${data.message}`);
        }

    } catch (error) {
        console.error('Summarize Error:', error);
        alert('An unexpected error occurred. Please check the console.');
    } finally {
        summarizeButton.textContent = 'Summarize';
        summarizeButton.disabled = false;
    }
});

// ----------------------------------------------------
// Quiz Button Handler (NEW)
// ----------------------------------------------------
quizButton.addEventListener('click', () => {
    if (!currentDocText) {
        alert("No document text found. Please summarize a document first.");
        return;
    }

    // Save the text to LocalStorage to pass it to the next page
    localStorage.setItem('quizSourceText', currentDocText);

    // Redirect to the quiz page
    window.location.href = 'quiz.html';
});

console.log('Summarizer script loaded.');