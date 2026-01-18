// controllers/playlistController.js
const { db, admin } = require('../config/firebase');


/**
 * Handles the POST /api/playlist/save request.
 * PROTECTED: Requires valid user token.
 * Saves a generated playlist, but only if it doesn't already exist.
 */
const savePlaylist = async (req, res) => {
    // req.user is attached by the 'protect' middleware and contains the UID
    const uid = req.user.uid; 
    const { title, videos, topics } = req.body;

    if (!title || !videos || videos.length === 0) {
        return res.status(400).json({ message: 'Playlist title and video list are required.', success: false });
    }

    try {
        // --- NEW DUPLICATE CHECK ---
        // Check if a playlist with the same title already exists for this user
        const existingPlaylists = await db.collection('playlists')
            .where('userId', '==', uid)
            .where('title', '==', title)
            .limit(1)
            .get();

        if (!existingPlaylists.empty) {
            // A playlist with this title already exists
            return res.status(409).json({ // 409 Conflict
                message: 'You have already saved a playlist with this title.',
                success: false,
            });
        }
        // --- END OF CHECK ---


        // If no duplicates, proceed with saving
        const playlistData = {
            title,
            videos,
            topics: topics || [],
            createdAt: new Date().toISOString(),
            userId: uid, 
            status: 'in-progress',
        };

        // 1. Create a new document in the 'playlists' collection
        const docRef = await db.collection('playlists').add(playlistData);
        
        // 2. Update the user's document
        await db.collection('users').doc(uid).set({
            savedPlaylists: admin.firestore.FieldValue.arrayUnion(docRef.id)
        }, { merge: true }); // Use set-merge

        res.status(201).json({ 
            message: 'Playlist saved successfully.',
            playlistId: docRef.id,
            success: true
        });

    } catch (error) {
        console.error("Error saving playlist:", error.message);
        res.status(500).json({ 
            message: 'Failed to save playlist to the database.',
            success: false,
            error: error.message 
        });
    }
};

/**
 * Handles the GET /api/playlist/get request.
 * PROTECTED: Requires valid user token.
 * Retrieves all saved playlists for the logged-in user.
 */
const getPlaylists = async (req, res) => {
    // req.user is attached by the 'protect' middleware
    const uid = req.user.uid; 

    try {
        // Query Firestore for playlists belonging to this user
        const snapshot = await db.collection('playlists').where('userId', '==', uid).get();
        
        const playlists = [];
        snapshot.forEach(doc => {
            // Push the playlist data along with its unique Firestore ID
            playlists.push({
                id: doc.id,
                ...doc.data()
            });
        });

        res.status(200).json({
            message: 'Playlists retrieved successfully.',
            count: playlists.length,
            playlists: playlists,
            success: true
        });

    } catch (error) {
        console.error("Error retrieving playlists:", error.message);
        res.status(500).json({ 
            message: 'Failed to retrieve playlists from the database.',
            success: false,
            error: error.message 
        });
    }
};

/**
 * Handles the DELETE /api/playlist/:playlistId request.
 * PROTECTED: Requires valid user token.
 * Deletes a specific playlist from Firestore.
 */
const deletePlaylist = async (req, res) => {
    // req.user is from the 'protect' middleware
    const uid = req.user.uid; 
    // The playlist ID is passed in the URL parameters
    const { playlistId } = req.params; 

    try {
        const docRef = db.collection('playlists').doc(playlistId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Playlist not found.' });
        }

        // --- Security Check ---
        // Ensure the user deleting the playlist is the one who created it
        if (doc.data().userId !== uid) {
            return res.status(403).json({ message: 'User not authorized to delete this playlist.' });
        }

        // 1. Delete the playlist document
        await docRef.delete();

        // 2. (Optional but good practice) Remove the ID from the user's savedPlaylists array
        await db.collection('users').doc(uid).set({
            savedPlaylists: admin.firestore.FieldValue.arrayRemove(playlistId)
        }, { merge: true }); // Use set-merge to avoid errors if user doc is missing

        res.status(200).json({ message: 'Playlist deleted successfully.' });

    } catch (error) {
        console.error("Error deleting playlist:", error.message);
        res.status(500).json({ 
            message: 'Failed to delete playlist from the database.',
            error: error.message 
        });
    }
};

/*
 * Handles the PATCH /api/playlist/:playlistId/status request.
 * Updates the status of a playlist (e.g., 'in-progress' <-> 'completed').
 */
const updatePlaylistStatus = async (req, res) => {
    const uid = req.user.uid;
    const { playlistId } = req.params;
    const { status } = req.body; // Expects { status: 'completed' } or { status: 'in-progress' }

    try {
        const docRef = db.collection('playlists').doc(playlistId);
        const doc = await docRef.get();

        if (!doc.exists) {
            return res.status(404).json({ message: 'Playlist not found.' });
        }

        if (doc.data().userId !== uid) {
            return res.status(403).json({ message: 'Not authorized.' });
        }

        // Update the status field
        await docRef.update({ status });

        res.status(200).json({ message: 'Status updated successfully.', status });

    } catch (error) {
        console.error("Error updating status:", error);
        res.status(500).json({ message: 'Failed to update status.' });
    }
};
module.exports = {
    savePlaylist,
    getPlaylists,
    deletePlaylist,
    updatePlaylistStatus,
};