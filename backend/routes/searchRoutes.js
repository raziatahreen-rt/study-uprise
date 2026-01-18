// routes/searchRoutes.js
const express = require('express');
const { handleSearch } = require('../controllers/searchController');

const router = express.Router();

// Define the API endpoint: GET /api/search
// This route will handle requests like: http://localhost:5000/api/search?query=react%20hooks
router.get('/search', handleSearch);

module.exports = router;