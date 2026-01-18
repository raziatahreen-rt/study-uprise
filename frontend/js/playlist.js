// frontend/js/playlist.js

// 1. Wait for window load (Fixes Firebase race conditions)
window.addEventListener('load', () => {
    console.log("✅ playlist.js: Window loaded.");

    // 2. Firebase Safety Check
    if (typeof firebase === 'undefined') {
        console.error("❌ Firebase SDK is missing.");
        return;
    }
    const auth = firebase.auth();

    // 3. DOM Elements
    // Note: These might be null on the playlist page, and that's okay!
    const navDashboardLink = document.getElementById('nav-dashboard-link');
    const navAuthButton = document.getElementById('nav-auth-button');

    const mainVideoPlayer = document.getElementById('main-video-player');
    const mainVideoTitle = document.getElementById('main-video-title');
    const playlistTitle = document.getElementById('playlist-title');
    const videoQueueContainer = document.getElementById('video-queue-container');

    // 4. Auth Listener
    auth.onAuthStateChanged((user) => {
        if (user) {
            console.log("User logged in. Loading content...");
            
            // --- UI SAFE UPDATE ---
            // Only update these IF they exist on the page
            if (navDashboardLink) navDashboardLink.classList.remove('hidden');
            
            if (navAuthButton) {
                navAuthButton.textContent = 'Logout';
                navAuthButton.href = '#';
                navAuthButton.addEventListener('click', async (e) => {
                    e.preventDefault();
                    await auth.signOut();
                    window.location.href = 'index.html';
                });
            }

            // --- LOAD CONTENT ---
            loadPlaylist();

        } else {
            console.log('User not logged in. Redirecting.');
            window.location.href = 'login.html';
        }
    });

    // 5. Playlist Logic
    const loadPlaylist = () => {
        const playlistDataString = localStorage.getItem('currentPlaylist');
        
        if (!playlistDataString) {
            if (mainVideoTitle) mainVideoTitle.textContent = 'Error: No Playlist Found';
            if (videoQueueContainer) videoQueueContainer.innerHTML = '<p class="text-slate-500 p-4">Could not find playlist data. Go back to Dashboard.</p>';
            return;
        }

        try {
            const playlist = JSON.parse(playlistDataString);
            const videos = playlist.videos;

            if (!videos || videos.length === 0) {
                if (mainVideoTitle) mainVideoTitle.textContent = 'Error: Empty Playlist';
                return;
            }

            // Set Title (if element exists)
            if (playlistTitle) playlistTitle.textContent = `Playing: ${playlist.title}`;
            
            // Load First Video
            loadVideo(videos[0]);

            // Render Queue
            renderQueue(videos);

        } catch (error) {
            console.error("Failed to parse playlist data:", error);
            if (mainVideoTitle) mainVideoTitle.textContent = 'Error loading playlist.';
        }
    };

    const loadVideo = (video) => {
        if (!mainVideoPlayer || !mainVideoTitle) return;
        
        // Use 'autoplay=1' to auto-play when clicked
        const embedUrl = `https://www.youtube.com/embed/${video.videoId}?autoplay=1`;
        mainVideoPlayer.src = embedUrl;
        mainVideoTitle.textContent = video.title;
    };

    const renderQueue = (videos) => {
        if (!videoQueueContainer) return;
        
        videoQueueContainer.innerHTML = '';

        videos.forEach((video, index) => {
            const item = document.createElement('div');
            // Styling for the dark theme sidebar items
            item.className = 'flex items-center space-x-3 p-2 rounded-lg cursor-pointer hover:bg-slate-700 transition queue-item group';
            item.dataset.videoId = video.videoId;
            item.dataset.title = video.title;

            item.innerHTML = `
                <span class="text-sm font-bold text-slate-500 group-hover:text-indigo-400">${index + 1}</span>
                <img src="${video.thumbnailUrl}" alt="${video.title}" class="w-16 h-10 object-cover rounded opacity-80 group-hover:opacity-100">
                <span class="text-sm font-medium text-slate-300 line-clamp-2 group-hover:text-white">${video.title}</span>
            `;
            
            videoQueueContainer.appendChild(item);
        });
    };

    // 6. Global Event Listeners
    if (videoQueueContainer) {
        videoQueueContainer.addEventListener('click', (e) => {
            const item = e.target.closest('.queue-item');
            if (item) {
                const videoToLoad = {
                    videoId: item.dataset.videoId,
                    title: item.dataset.title
                };
                loadVideo(videoToLoad);
            }
        });
    }

}); // End Window Load