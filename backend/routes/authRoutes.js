// routes/authRoutes.js
const express = require('express');
const { signup, login } = require('../controllers/authController');

const router = express.Router();

// Route 1: POST /api/auth/signup - Creates a new user
router.post('/signup', signup);

// Route 2: POST /api/auth/login - Handles client-side login (currently returns a message)
// The client will use a separate Firebase SDK for the actual token generation.
router.post('/login', login);

module.exports = router;
