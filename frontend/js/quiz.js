// frontend/js/quiz.js

const auth = firebase.auth();
const API_BASE_URL = 'http://localhost:5000/api';

const loadingContainer = document.getElementById('loading-container');
const quizContainer = document.getElementById('quiz-container');
const questionsList = document.getElementById('questions-list');
const quizForm = document.getElementById('quiz-form');
const scoreDisplay = document.getElementById('score-display');
const retryButton = document.getElementById('retry-button');

let currentQuizData = []; // To store the correct answers

// ----------------------------------------------------
// 1. Initialize and Fetch Quiz
// ----------------------------------------------------
const initQuiz = async () => {
    // Check for source text
    const sourceText = localStorage.getItem('quizSourceText');
    if (!sourceText) {
        alert("No document found. Please upload a PDF first.");
        window.location.href = 'summarizer.html';
        return;
    }

    // Wait for Auth
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            try {
                const idToken = await user.getIdToken(true);
                
                // Call Backend API
                const response = await fetch(`${API_BASE_URL}/ai/generate-quiz`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${idToken}`
                    },
                    body: JSON.stringify({ text: sourceText })
                });

                const data = await response.json();

                if (response.ok) {
                    currentQuizData = data.quiz;
                    renderQuiz(data.quiz);
                } else {
                    alert(`Error: ${data.message}`);
                    window.location.href = 'summarizer.html';
                }

            } catch (error) {
                console.error("Quiz Error:", error);
                alert("Failed to generate quiz. Please try again.");
            }
        } else {
            window.location.href = 'login.html';
        }
    });
};

// ----------------------------------------------------
// 2. Render Quiz Functions
// ----------------------------------------------------
const renderQuiz = (questions) => {
    loadingContainer.classList.add('hidden');
    quizContainer.classList.remove('hidden');
    questionsList.innerHTML = '';

    questions.forEach((q, index) => {
        const questionHTML = `
            <div class="question-block p-4 rounded-lg hover:bg-gray-50 transition" data-index="${index}">
                <p class="text-lg font-semibold text-gray-800 mb-4">
                    <span class="text-indigo-500 mr-2">${index + 1}.</span> ${q.question}
                </p>
                <div class="space-y-3 pl-4">
                    ${q.options.map((option) => `
                        <label class="flex items-center space-x-3 cursor-pointer group">
                            <input type="radio" name="question-${index}" value="${option}" class="form-radio h-5 w-5 text-indigo-600 focus:ring-indigo-500">
                            <span class="text-gray-700 group-hover:text-indigo-700 transition">${option}</span>
                        </label>
                    `).join('')}
                </div>
                <!-- Feedback Div (Hidden) -->
                <div class="feedback mt-3 hidden p-3 rounded-md text-sm font-medium"></div>
            </div>
        `;
        questionsList.innerHTML += questionHTML;
    });
};

// ----------------------------------------------------
// 3. Handle Submission & Scoring
// ----------------------------------------------------
quizForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    let score = 0;
    const total = currentQuizData.length;
    const questionBlocks = document.querySelectorAll('.question-block');

    questionBlocks.forEach((block, index) => {
        const selected = document.querySelector(`input[name="question-${index}"]:checked`);
        const feedbackDiv = block.querySelector('.feedback');
        const correctAnswer = currentQuizData[index].correctAnswer;

        feedbackDiv.classList.remove('hidden');

        if (selected) {
            const userAnswer = selected.value;
            if (userAnswer === correctAnswer) {
                // Correct
                score++;
                feedbackDiv.textContent = "✅ Correct!";
                feedbackDiv.className = "feedback mt-3 p-3 rounded-md text-sm font-medium bg-green-100 text-green-800";
            } else {
                // Incorrect
                feedbackDiv.innerHTML = `❌ Incorrect. The correct answer is: <strong>${correctAnswer}</strong>`;
                feedbackDiv.className = "feedback mt-3 p-3 rounded-md text-sm font-medium bg-red-100 text-red-800";
            }
        } else {
            // Not Answered
            feedbackDiv.innerHTML = `⚠️ Skipped. The correct answer is: <strong>${correctAnswer}</strong>`;
            feedbackDiv.className = "feedback mt-3 p-3 rounded-md text-sm font-medium bg-yellow-100 text-yellow-800";
        }
    });

    // Show Score
    scoreDisplay.textContent = `Score: ${score} / ${total}`;
    scoreDisplay.classList.remove('hidden');
    
    // Disable Submit, Show Retry
    quizForm.querySelector('button[type="submit"]').classList.add('hidden');
    retryButton.classList.remove('hidden');
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
});

retryButton.addEventListener('click', () => {
    location.reload(); // Reloads page to regenerate quiz
});

// Start
initQuiz();