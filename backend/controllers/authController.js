// controllers/authController.js
const { auth, db } = require('../config/firebase');

/**
 * Handles user sign-up using email and password.
 * Route: POST /api/auth/signup
 */
const signup = async (req, res) => {
    // 1. Accept 'uid' from the request body
    const { email, password, username, uid } = req.body;

    if (!email || !username || !uid) {
        return res.status(400).json({ message: 'Email, username, and UID are required.' });
    }

    try {
        // REMOVED: const userRecord = await auth.createUser({ ... });
        // We assume the user is already created by the frontend.

        // 2. Save user data to Firestore using the provided UID
        await db.collection('users').doc(uid).set({
            email: email,
            username: username,
            createdAt: new Date().toISOString(),
            savedPlaylists: [],
        });

        // 3. Respond with success
        res.status(201).json({ 
            message: 'User profile created successfully.',
            uid: uid,
            email: email,
            username: username
        });

    } catch (error) {
        console.error("Signup Profile Error:", error.message);
        res.status(500).json({ 
            message: 'Failed to create user profile.',
            error: error.message 
        });
    }
};

/**
 * Handles user login using email and password.
 * NOTE: We cannot directly login a user on the server using Admin SDK, 
 * but we can verify the token sent from the client (which happens later). 
 * For simplicity in server structure, we define a dummy route here for login instruction.
 * The actual login token generation is done on the FE, and the server verifies it.
 * We'll use this route structure for future token handling.
 */
const login = async (req, res) => {
    // We are deliberately leaving this controller function simple for now.
    // The actual token generation is done on the client-side using the Client SDK.
    // Our backend will mainly verify the token later (next step).
    res.status(501).json({ 
        message: 'Client-side authentication is required to generate the user token. Please proceed with client-side login via Firebase JS SDK.'
    });
};

module.exports = {
    signup,
    login,
};