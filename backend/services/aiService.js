// backend/services/aiService.js

const { GoogleGenerativeAI } = require('@google/generative-ai');

// 1. Load the API key from environment variables
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

if (!GEMINI_API_KEY) {
    console.error("Gemini API key is not set in environment variables.");
}

// 2. Initialize the Google AI client
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({
    model: "gemini-2.5-flash", // Using the standard flash model
    generationConfig: {
        responseMimeType: "application/json", // Force the AI to output JSON
    },
});

/**
 * Generates a list of sub-topics for a given main subject.
 * @param {string} mainTopic - The broad subject (e.g., 'Operating Systems').
 * @returns {Promise<string[]>} - A promise that resolves to an array of sub-topic strings.
 */
const getSubTopics = async (mainTopic) => {
    // 3. Define the prompt for the AI
    const prompt = `
        Act as an expert curriculum designer. A student searched for: "${mainTopic}".
        
        Generate a JSON array of the 10 most important, fundamental sub-topics
        a beginner should learn for this subject.
        
        RULES:
        - Return ONLY a valid JSON array of strings.
        - Do not include any other text, just the array.
        - The topics should be concise and easy to search for.
        
        Example for "JavaScript":
        [
            "JavaScript Variables and Data Types",
            "JavaScript Functions",
            "DOM Manipulation"
        ]
        
        Now, generate the list for "${mainTopic}":
    `;

    try {
        // 4. Call the AI model
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        // 5. Parse the JSON response
        const subTopics = JSON.parse(text);
        return subTopics;

    } catch (error) {
        console.error("Error generating sub-topics from AI:", error);
        throw new Error("Failed to get sub-topics from the AI service.");
    }
};

/**
 * Generates a quiz from a block of text.
 * @param {string} documentText - The full text to generate a quiz from.
 * @returns {Promise<Array>} - A promise that resolves to an array of quiz questions.
 */
const generateQuiz = async (documentText) => {
    // 3. Define the prompt for the AI
    const prompt = `
        Act as an expert educator and test designer.
        Based *only* on the following "DOCUMENT CONTENT", generate a 5-question multiple-choice quiz
        to test a student's understanding of the material.

        **CRITICAL INSTRUCTIONS:**
        1.  The quiz must be in a valid JSON array format.
        2.  Each object in the array must have three keys: "question", "answerOptions", and "hint".
        3.  The "question" value must be a string.
        4.  The "answerOptions" value must be an array of 4 objects.
        5.  Each "answerOptions" object must have two keys: "text" (string) and "isCorrect" (boolean).
        6.  Exactly ONE "answerOptions" object in each question must have "isCorrect" set to true.
        7.  The "hint" value must be a short string that guides the student to the answer without giving it away.
        8.  The questions must be high-quality and directly related to the provided text.
        9.  Do NOT include any text outside of the JSON array (no \`\`\`json or explanations).

        **EXAMPLE JSON FORMAT:**
        [
            {
                "question": "What is the primary function of an Operating System?",
                "answerOptions": [
                    { "text": "To browse the internet", "isCorrect": false },
                    { "text": "To manage hardware and software resources", "isCorrect": true },
                    { "text": "To create documents", "isCorrect": false },
                    { "text": "To play video games", "isCorrect": false }
                ],
                "hint": "Think about what manages all the computer's parts and programs."
            }
        ]
        
        **DOCUMENT CONTENT:**
        """
        ${documentText.substring(0, 20000)}
        """

        Now, generate the 5-question JSON quiz array:
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        const quiz = JSON.parse(text);
        return quiz;

    } catch (error) {
        console.error("Error generating quiz from AI:", error);
        throw new Error("Failed to get quiz from the AI service.");
    }
};

module.exports = {
    getSubTopics,
    generateQuiz
};