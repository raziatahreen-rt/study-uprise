
// middleware/authMiddleware.js
const { auth } = require('../config/firebase');

/**
 * Middleware to protect routes: verifies the Firebase ID token in the request.
 * If valid, it attaches the user's decoded token (user data) to the request object (req.user).
 */
const protect = async (req, res, next) => {
    let idToken;

    // 1. Check if the token is present in the request headers
    // The client will send the token in the format: "Bearer <token>"
    if (
        req.headers.authorization &&
        req.headers.authorization.startsWith('Bearer')
    ) {
        // Extract the token part
        idToken = req.headers.authorization.split(' ')[1];
    }

    if (!idToken) {
        // Token missing
        return res.status(401).json({ 
            message: 'Not authorized, token missing. Please log in.',
            success: false 
        });
    }

    try {
        // 2. Verify the ID token using Firebase Admin SDK
        const decodedToken = await auth.verifyIdToken(idToken);
        
        // 3. Attach the decoded user object to the request for controller access
        req.user = decodedToken; 
        
        // 4. Proceed to the next middleware or the route controller
        next();

    } catch (error) {
        // Handle token verification failure (expired, invalid, malformed)
        console.error("Token verification error:", error.message);
        res.status(401).json({ 
            message: 'Not authorized, token failed. Please log in again.',
            success: false,
            error: error.message
        });
    }
};

module.exports = { protect };