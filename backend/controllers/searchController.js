// controllers/searchController.js
const { searchVideos } = require('../services/youtubeService');

/**
 * Handles the GET /api/search request.
 * Takes a 'query' parameter from the URL and returns a list of YouTube videos.
 */
const handleSearch = async (req, res) => {
    // 1. Get the search term from the query string (e.g., /api/search?query=javascript)
    const { query } = req.query;

    // 2. Input Validation: Check if the required 'query' parameter is present
    if (!query) {
        return res.status(400).json({ 
            message: 'Search query is required.',
            success: false
        });
    }

    try {
        // 3. Call the service layer to fetch the videos
        const videos = await searchVideos(query); 

        // 4. Send the successful response with the data
        res.status(200).json({
            query: query,
            results: videos,
            count: videos.length,
            success: true
        });

    } catch (error) {
        // 5. Handle errors from the YouTube service (e.g., API key failure, network issue)
        console.error("Error in search controller:", error.message);
        res.status(500).json({ 
            message: 'Internal server error during video search. Please check the backend logs.',
            error: error.message,
            success: false
        });
    }
};

module.exports = {
    handleSearch,
};