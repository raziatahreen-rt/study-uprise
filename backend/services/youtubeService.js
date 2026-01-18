// services/youtubeService.js

const axios = require('axios');

// Get the API key securely from environment variables
// process.env loads variables from the .env file (thanks to dotenv in server.js)
const YOUTUBE_API_KEY = process.env.YOUTUBE_API_KEY;

// Base URL for the YouTube Data API search endpoint
const YOUTUBE_API_URL = 'https://www.googleapis.com/youtube/v3/search';

/**
 * Searches YouTube for videos based on a query.
 * @param {string} query - The search term (e.g., 'JavaScript Arrays').
 * @param {number} maxResults - The maximum number of videos to return.
 * @returns {Promise<Array>} - A promise that resolves to an array of video objects.
 */
const searchVideos = async (query, maxResults = 10) => {
    if (!YOUTUBE_API_KEY) {
        // This is a great runtime check to ensure our .env setup is correct
        throw new Error("YouTube API key is not set in environment variables.");
    }

    try {
        const response = await axios.get(YOUTUBE_API_URL, {
            params: {
                key: YOUTUBE_API_KEY,      
                q: query,                  // The search query
                part: 'snippet',           // The data fields we want (title, description, etc.)
                type: 'video',             // We only want videos
                maxResults: maxResults,    
                videoEmbeddable: 'true',   // CRITICAL: Ensures we can display it on our site
            },
        });

        // Map the raw YouTube response data into a cleaner, lighter format
        const videos = response.data.items.map(item => ({
            videoId: item.id.videoId, // The unique YouTube ID needed for embedding
            title: item.snippet.title,
            description: item.snippet.description,
            thumbnailUrl: item.snippet.thumbnails.high.url, 
            publishedAt: item.snippet.publishedAt,
        }));

        return videos;

    } catch (error) {
        console.error("YouTube API Search Error:", error.response ? error.response.data : error.message);
        // Throw a generic error to the controller to hide internal API details
        throw new Error("Failed to fetch videos from YouTube.");
    }
};

module.exports = {
    searchVideos,
};