// routes/playlistRoutes.js
const express = require('express');
// const { savePlaylist, getPlaylists,deletePlaylist } = require('../controllers/playlistController');
const { protect } = require('../middleware/authMiddleware'); // <-- Import the middleware
const { savePlaylist, getPlaylists, deletePlaylist, updatePlaylistStatus } = require('../controllers/playlistController');
const router = express.Router();

// The 'protect' middleware runs first, verifying the user's token 
// before letting the request reach the controller logic.

// Route 1: POST /api/playlist/save
router.post('/save', protect, savePlaylist);

// Route 2: GET /api/playlist/get
router.get('/get', protect, getPlaylists);

// Route 3: DELETE /api/playlist/:playlistId
// The :playlistId is a URL parameter that we can read on the backend
router.delete('/:playlistId', protect, deletePlaylist);

// Route 4: PATCH /api/playlist/:playlistId/status
router.patch('/:playlistId/status', protect, updatePlaylistStatus);
module.exports = router;