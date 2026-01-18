// frontend/js/app.js

// CRITICAL CHANGE: Use 'load' instead of 'DOMContentLoaded'
// This ensures Firebase CDNs are fully downloaded before we run.
window.addEventListener('load', () => {
    console.log("✅ app.js: Window fully loaded. Starting initialization...");

    // ----------------------------------------------------
    // 1. Initialize Firebase Services
    // ----------------------------------------------------
    // Safety Check: Is Firebase actually here?
    if (typeof firebase === 'undefined') {
        console.error("❌ CRITICAL ERROR: Firebase SDK is missing. The script cannot run.");
        console.error("👉 Check your HTML file. Do you have the <script src='...firebase...'> tags in the <head>?");
        alert("System Error: Firebase failed to load. Please refresh the page.");
        return;
    }

    // Initialize services
    const auth = firebase.auth();
    // We don't strictly need db here for search, but good to have
    const db = firebase.firestore();
    
    console.log("✅ Firebase Services Initialized");

    // ----------------------------------------------------
    // 2. Configuration & State
    // ----------------------------------------------------
    const API_BASE_URL = 'http://localhost:5000/api';
    let currentUserId = null;
    let currentPlaylistVideos = [];
    let currentQuery = "";

    // ----------------------------------------------------
    // 3. Auth UI Management
    // ----------------------------------------------------
    const updateNav = (user) => {
        const navDashboardLink = document.getElementById('nav-dashboard-link');
        const navAuthButton = document.getElementById('nav-auth-button');

        // Safety: If we can't find the nav, we can't update it.
        if (!navAuthButton) {
            console.warn("⚠️ Warning: Nav button not found in HTML.");
            return;
        }

        if (user) {
            console.log(`👤 User Logged In: ${user.email}`);
            currentUserId = user.uid;

            if (navDashboardLink) navDashboardLink.classList.remove('hidden');

            navAuthButton.textContent = 'Logout';
            navAuthButton.href = '#';
            
            // Clone to clear listeners
            const newButton = navAuthButton.cloneNode(true);
            navAuthButton.parentNode.replaceChild(newButton, navAuthButton);
            
            newButton.addEventListener('click', async (e) => {
                e.preventDefault();
                await auth.signOut();
                window.location.reload();
            });

        } else {
            console.log("👤 User Logged Out");
            currentUserId = null;

            if (navDashboardLink) navDashboardLink.classList.add('hidden');

            navAuthButton.textContent = 'Login';
            navAuthButton.href = './login.html';
        }
    };

    // Trigger Auth Check
    auth.onAuthStateChanged(updateNav);

    // ----------------------------------------------------
    // 4. Search Logic
    // ----------------------------------------------------
    
    const searchInput = document.getElementById('search-input');
    const searchButton = document.getElementById('search-button');
    const resultsContainer = document.getElementById('results-container');

    // --- Video Search ---
    const handleVideoSearch = async (topic) => {
        currentQuery = topic;
        
        // Show loading in the container
        resultsContainer.innerHTML = `
            <div class="text-center py-20">
                <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mx-auto mb-4"></div>
                <h3 class="text-2xl font-bold text-gray-700">Curating Playlist...</h3>
                <p class="text-gray-500">Finding the best "${topic}" videos and generating AI summary.</p>
            </div>
        `;

        try {
            console.log(`🔍 Searching for: ${topic}`);
            
            // Parallel Fetch
            const [summaryResponse, videoResponse] = await Promise.all([
                fetch(`${API_BASE_URL}/ai/summary?query=${encodeURIComponent(topic)}`),
                fetch(`${API_BASE_URL}/search?query=${encodeURIComponent(topic)}`)
            ]);

            const videoData = await videoResponse.json();
            
            let summaryText = "";
            if (summaryResponse.ok) {
                const summaryData = await summaryResponse.json();
                summaryText = summaryData.summary;
            }

            if (videoResponse.ok && videoData.success) {
                currentPlaylistVideos = videoData.results.map(v => ({
                    videoId: v.videoId,
                    title: v.title,
                    thumbnailUrl: v.thumbnailUrl
                }));
                renderResults(videoData.results, summaryText);
            } else {
                resultsContainer.innerHTML = `<div class="bg-red-50 p-8 rounded-xl text-center text-red-600 font-bold border border-red-200">Error: ${videoData.message}</div>`;
            }
        } catch (error) {
            console.error("❌ Search Error:", error);
            resultsContainer.innerHTML = `<div class="bg-red-50 p-8 rounded-xl text-center text-red-600 font-bold border border-red-200">Network Error. Is backend running on port 5000?</div>`;
        }
    };

    // --- Topic Search (AI Step 1) ---
    const handleTopicSearch = async () => {
        if (!searchInput) return;
        const mainTopic = searchInput.value.trim();
        if (!mainTopic) {
            alert("Please enter a topic first!");
            return;
        }

        if (!auth.currentUser) {
            alert('Please login to use the AI features.');
            window.location.href = 'login.html';
            return;
        }

        // Disable button to prevent double clicks
        if (searchButton) {
            searchButton.disabled = true;
            searchButton.textContent = "Processing...";
        }

        // Show loading
        resultsContainer.innerHTML = `
            <div class="text-center py-20">
                <div class="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-600 mx-auto mb-4"></div>
                <h3 class="text-2xl font-bold text-gray-700">AI Analysis in Progress...</h3>
                <p class="text-gray-500">Identifying key sub-topics for "${mainTopic}"</p>
            </div>
        `;

        try {
            const idToken = await auth.currentUser.getIdToken(true);
            const response = await fetch(`${API_BASE_URL}/ai/get-subtopics`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ topic: mainTopic })
            });

            const data = await response.json();

            if (response.ok) {
                renderSubTopics(data.mainTopic, data.subTopics);
            } else {
                resultsContainer.innerHTML = `<div class="bg-red-50 p-8 rounded-xl text-center text-red-600 font-bold">Error: ${data.message}</div>`;
            }
        } catch (error) {
            console.error("❌ Topic API Error:", error);
            resultsContainer.innerHTML = `<div class="bg-red-50 p-8 rounded-xl text-center text-red-600 font-bold">Failed to connect to AI service. Check Backend.</div>`;
        } finally {
            if (searchButton) {
                searchButton.disabled = false;
                searchButton.textContent = "Search";
            }
        }
    };

    // ----------------------------------------------------
    // 5. Render Functions
    // ----------------------------------------------------

    const renderSubTopics = (mainTopic, subTopics) => {
        let html = `
            <div class="mb-10 text-center animate-fade-in">
                <span class="bg-indigo-100 text-indigo-800 text-sm font-bold px-3 py-1 rounded-full">Step 1 Complete</span>
                <h2 class="text-3xl font-bold text-slate-800 mt-4">Refine Your Search</h2>
                <p class="text-slate-500 mt-2">Select a specific sub-topic for <span class="font-bold text-indigo-600">"${mainTopic}"</span></p>
            </div>
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        `;
        
        subTopics.forEach(topic => {
            html += `
                <button class="sub-topic-btn p-5 bg-white border border-slate-200 rounded-xl hover:border-indigo-500 hover:shadow-lg hover:-translate-y-1 transition-all duration-200 text-left group">
                    <div class="flex items-center justify-between">
                        <span class="font-semibold text-slate-700 group-hover:text-indigo-600 text-lg">${topic}</span>
                        <i class="fa-solid fa-chevron-right text-slate-300 group-hover:text-indigo-500"></i>
                    </div>
                </button>
            `;
        });
        
        html += `</div>`;
        resultsContainer.innerHTML = html;

        // Add Listeners
        document.querySelectorAll('.sub-topic-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Get text content cleanly (removing icon text if any)
                const topicText = btn.querySelector('span').innerText;
                handleVideoSearch(topicText);
            });
        });
    };

    const renderResults = (videos, summaryHTML) => {
        let html = '';
        
        // Summary Section
        if (summaryHTML) {
            html += `
                <div class="bg-gradient-to-br from-indigo-50 to-white p-8 rounded-2xl shadow-sm border border-indigo-100 mb-12 prose prose-indigo max-w-none animate-fade-in">
                    <div class="flex items-center gap-2 mb-4">
                        <i class="fa-solid fa-wand-magic-sparkles text-indigo-500"></i>
                        <h3 class="text-lg font-bold text-indigo-800 m-0">AI Summary</h3>
                    </div>
                    ${summaryHTML}
                </div>
            `;
        }

        // Playlist Header
        html += `
            <div class="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
                <h3 class="text-3xl font-bold text-slate-900">Curated Playlist</h3>
                ${currentUserId 
                    ? `<button id="save-playlist-btn" class="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-md transition transform hover:scale-105 flex items-center gap-2"><i class="fa-regular fa-bookmark"></i> Save to Dashboard</button>` 
                    : `<a href="./login.html" class="text-indigo-600 font-bold hover:underline">Login to save this playlist</a>`
                }
            </div>
            <div class="grid gap-8">
        `;

        // Videos
        videos.forEach(video => {
            html += `
                <div class="bg-white rounded-2xl shadow-sm border border-slate-100 overflow-hidden flex flex-col md:flex-row hover:shadow-xl transition-all duration-300 group">
                    <div class="md:w-1/3 aspect-video relative bg-black">
                        <iframe class="absolute inset-0 w-full h-full" src="https://www.youtube.com/embed/${video.videoId}" frameborder="0" allowfullscreen></iframe>
                    </div>
                    <div class="p-6 md:w-2/3 flex flex-col justify-between">
                        <div>
                            <h4 class="text-xl font-bold text-slate-900 line-clamp-2 mb-3 group-hover:text-indigo-600 transition-colors">${video.title}</h4>
                            <p class="text-slate-500 text-sm line-clamp-2 leading-relaxed">${video.description}</p>
                        </div>
                        <div class="mt-4 pt-4 border-t border-slate-50 flex justify-between items-center">
                            <span class="text-xs font-medium text-slate-400 bg-slate-50 px-2 py-1 rounded">Published: ${new Date(video.publishedAt).toLocaleDateString()}</span>
                            <a href="https://www.youtube.com/watch?v=${video.videoId}" target="_blank" class="text-indigo-600 font-bold text-sm hover:text-indigo-800 flex items-center gap-1">Watch on YouTube <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i></a>
                        </div>
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        resultsContainer.innerHTML = html;

        // Save Listener
        const saveBtn = document.getElementById('save-playlist-btn');
        if (saveBtn) {
            saveBtn.addEventListener('click', handleSavePlaylist);
        }
    };

    // ----------------------------------------------------
    // 6. Save Logic
    // ----------------------------------------------------
    const handleSavePlaylist = async () => {
        const btn = document.getElementById('save-playlist-btn');
        if (btn) { 
            btn.innerHTML = '<i class="fa-solid fa-circle-notch fa-spin"></i> Saving...'; 
            btn.disabled = true; 
        }

        try {
            const idToken = await auth.currentUser.getIdToken(true);
            const response = await fetch(`${API_BASE_URL}/playlist/save`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({
                    title: currentQuery,
                    videos: currentPlaylistVideos,
                    topics: [currentQuery]
                })
            });

            if (response.ok) {
                if (btn) { 
                    btn.innerHTML = '<i class="fa-solid fa-check"></i> Saved!'; 
                    btn.classList.replace('bg-emerald-600', 'bg-slate-400'); 
                }
                alert('Playlist saved to Dashboard!');
            } else {
                const err = await response.json();
                if(err.message.includes("already saved")) {
                     alert("You already saved this playlist!");
                     if (btn) { btn.innerHTML = 'Already Saved'; btn.classList.replace('bg-emerald-600', 'bg-slate-400'); }
                } else {
                    alert(`Error: ${err.message}`);
                    if (btn) { btn.textContent = 'Save to Dashboard'; btn.disabled = false; }
                }
            }
        } catch (error) {
            console.error("Save Error:", error);
            alert("Failed to save.");
            if (btn) { btn.textContent = 'Save to Dashboard'; btn.disabled = false; }
        }
    };

    // ----------------------------------------------------
    // 7. Attach Global Event Listeners
    // ----------------------------------------------------
    console.log("✅ Attaching Event Listeners...");
    
    if (searchButton) {
        searchButton.addEventListener('click', handleTopicSearch);
        console.log("   - Search Button listener attached");
    } else {
        console.error("❌ ERROR: Search Button ID 'search-button' not found in HTML!");
    }
    
    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleTopicSearch();
        });
    }

}); // End Window Load