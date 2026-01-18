// backend/routes/aiRoutes.js
const express = require('express');
const fetch = require('node-fetch');
const multer = require('multer');
const pdfParse = require('pdf-parse');
require('dotenv').config();

const { protect } = require('../middleware/authMiddleware');
const { getSubTopics } = require('../services/aiService');

const router = express.Router();

// Multer Config
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 10 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (file.mimetype === 'application/pdf') {
            cb(null, true);
        } else {
            cb(new Error('Only PDF files are allowed.'), false);
        }
    }
});

const MAX_OUTPUT_TOKENS = 8192;

/* ======================================================
 * 🔹 1️⃣ GET /api/ai/summary — Summarize Search Topic
 * ====================================================== */
router.get('/summary', async (req, res) => {
    const query = req.query.query;
    if (!query)
        return res.status(400).json({ success: false, message: 'Query parameter is required.' });

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const geminiURL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        // --- PROMPT 1: FOR SEARCH TOPICS (Uses ${query}) ---
        const prompt = `
        Act as an expert on all topics. A student searched for "${query}".
        1.  Write a concise, 2-3 paragraph introductory summary of this topic.
        2.  **Format** the output as clean, semantic HTML.
        3.  **Style** the HTML using ONLY Tailwind CSS utility classes for a clean, readable format.

        **CRITICAL STYLING RULES:**
        - Use <h3 class="text-2xl font-semibold text-gray-800 mb-2"> for the main topic title.
        - Use <p class="text-gray-700 leading-relaxed mb-3"> for paragraphs.
        - Use <strong class="font-semibold text-gray-900"> for important terms.
        - DO NOT use inline "style" attributes or markdown.
        - DO NOT use \`\`\`html or \`\`\`.

        Now, generate the summary for "${query}":
        `;

        const response = await fetch(geminiURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: MAX_OUTPUT_TOKENS,
                },
            }),
        });
        const data = await response.json();
        
        if (data.error) {
            console.error('Gemini API Error:', data.error);
            return res.status(500).json({ success: false, message: data.error.message });
        }
        let summaryHTML = data?.candidates?.[0]?.content?.parts?.[0]?.text || '<p>No summary available.</p>';
        summaryHTML = summaryHTML.replace(/```html|```/g, '').replace(/\n{2,}/g, '\n').trim();

        res.status(200).json({
            success: true,
            model: 'gemini-2.5-flash',
            summary: summaryHTML,
        });
    } catch (error) {
        console.error('Gemini Summary Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch summary from Gemini API.',
        });
    }
});


/* ======================================================
 * 🔹 2️⃣ POST /api/ai/summarize — Summarize PDF
 * ====================================================== */
router.post('/summarize', protect, upload.single('document'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: 'No PDF file uploaded.' });
        }

        const apiKey = process.env.GEMINI_API_KEY;
        const geminiURL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const pdfData = await pdfParse(req.file.buffer); 
        const extractedText = pdfData.text?.substring(0, 20000) || '';

        if (!extractedText.trim()) {
            return res.status(400).json({ success: false, message: 'Could not extract text from PDF.' });
        }

        // --- PROMPT 2: FOR PDF DOCUMENTS (Uses ${extractedText}) ---
        const prompt = `
        Act as an expert academic summarizer.
        1.  **Summarize** the following document. Make it concise, clear, and easy to understand for a college student.
        2.  **Condense** the key information. Do not just reformat the original text.
        3.  **Format** the output as clean, semantic HTML.
        4.  **Style** the HTML using ONLY Tailwind CSS utility classes.

        **CRITICAL STYLING RULES:**
        - Use <h2 class="text-3xl font-bold text-indigo-700 mt-4 mb-2"> for main headings.
        - Use <h3 class="text-2xl font-semibold text-gray-800 mt-3 mb-1"> for sub-headings.
        - Use <p class="text-gray-700 leading-relaxed mb-2"> for paragraphs.
        - Use <ul class="list-disc list-inside pl-5 mb-3 space-y-1"> and <li class="text-gray-700"> for lists.
        - Use <strong class="font-semibold text-gray-900"> for important terms.
        - DO NOT use inline "style" attributes or markdown.
        - DO NOT use \`\`\`html or \`\`\`.

        Document Content:
        ${extractedText}
        `;

        const response = await fetch(geminiURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.7,
                    maxOutputTokens: MAX_OUTPUT_TOKENS,
                },
            }),
        });
        const data = await response.json();
        
        if (data.error) {
            console.error('Gemini PDF API Error:', data.error);
            return res.status(500).json({ success: false, message: data.error.message });
        }

        const summaryHTML = data?.candidates?.[0]?.content?.parts?.[0]?.text || '<p>No summary available.</p>';

        res.status(200).json({
            success: true,
            model: 'gemini-2.5-flash',
            summary: summaryHTML,
            extractedText,
        });
    } catch (error) {
        console.error('PDF Summarizer Error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to summarize document using Gemini API.',
        });
    }
});


/* ======================================================
 * 🔹 3️⃣ POST /api/ai/get-subtopics
 * ====================================================== */
router.post('/get-subtopics', protect, async (req, res) => {
    const { topic } = req.body;
    if (!topic) {
        return res.status(400).json({ message: 'A "topic" is required in the request body.' });
    }
    try {
        const subTopics = await getSubTopics(topic);
        res.status(200).json({
            mainTopic: topic,
            subTopics: subTopics,
        });
    } catch (error) {
        console.error("Error in getSubTopicsController:", error);
        res.status(500).json({ 
            message: 'Failed to generate sub-topics.',
            error: error.message 
        });
    }
});

/* ======================================================
 * 🔹 4️⃣ POST /api/ai/generate-quiz
 * ====================================================== */
router.post('/generate-quiz', protect, async (req, res) => {
    // ... (This route logic is inside aiService for quiz gen, but we define the endpoint here if not using service directly)
    // Actually, looking at your previous code, you put the logic HERE.
    // Let's keep it consistent with what you pasted before.
    
    const { text } = req.body;
    if (!text) {
        return res.status(400).json({ message: 'Text content is required to generate a quiz.' });
    }

    try {
        const apiKey = process.env.GEMINI_API_KEY;
        const geminiURL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

        const prompt = `
        Act as an expert educator. Based ONLY on the following text, generate a multiple-choice quiz.
        
        **Requirements:**
        1. Generate 7-8 questions.
        2. Each question must have 4 options.
        3. Return the output as a **valid JSON array**.
        4. Do NOT include markdown formatting (like \`\`\`json). Just the raw JSON string.
        
        **JSON Structure:**
        [
            {
                "question": "Question text here?",
                "options": ["Option A", "Option B", "Option C", "Option D"],
                "correctAnswer": "Option B" 
            }
        ]

        **Text to Quiz:**
        ${text.substring(0, 15000)} 
        `;

        const response = await fetch(geminiURL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: [{ parts: [{ text: prompt }] }],
                generationConfig: {
                    temperature: 0.5,
                    maxOutputTokens: 8192,
                },
            }),
        });

        const data = await response.json();
        if (data.error) {
            console.error('Gemini Quiz API Error:', data.error);
            return res.status(500).json({ success: false, message: data.error.message });
        }

        let quizJsonString = data?.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
        quizJsonString = quizJsonString.replace(/```json|```/g, '').trim();
        const quizData = JSON.parse(quizJsonString);

        res.status(200).json({
            success: true,
            quiz: quizData
        });

    } catch (error) {
        console.error("Error generating quiz:", error);
        res.status(500).json({ 
            message: 'Failed to generate quiz.',
            error: error.message 
        });
    }
});

module.exports = router;