// Load environment variables from .env file
require('dotenv').config();
// Initialize Firebase configuration
require('./config/firebase'); // This file runs and connects to Firebase
const express = require('express');
const cors = require('cors');

// --- Import Routes ---
const searchRoutes = require('./routes/searchRoutes');
const authRoutes = require('./routes/authRoutes');
const playlistRoutes = require('./routes/playlistRoutes');
const aiRoutes = require('./routes/aiRoutes'); 

// Create the Express application instance
const app = express();

// --- Middleware ---

// 1. CORS: Allows requests from a different origin (our frontend)
// For development, we allow all origins. For production, we'll restrict this.
app.use(cors());

// 2. Body Parser: Enables Express to read JSON data sent in the request body
app.use(express.json());

// 3. Simple Test Route (Root)
app.get('/', (req, res) => {
    res.status(200).send('Study Uprise Backend API is running! 🚀');
});

// --- Use Routes  ---
// All routes defined in searchRoutes.js will be accessible via /api/...
app.use('/api', searchRoutes);

// Use the authentication routes with the /auth prefix
app.use('/api/auth', authRoutes); 

// Use the playlist routes with the /playlist prefix
app.use('/api/playlist', playlistRoutes); 

app.use('/api/ai', aiRoutes); 
// --- Server Startup ---
const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT}`);
});