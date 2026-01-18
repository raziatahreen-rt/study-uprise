// frontend/js/dashboard.js

// CRITICAL FIX: Wait for window load to ensure Firebase is ready
window.addEventListener('load', () => {
  console.log("✅ dashboard.js: Window loaded.");

  // 1. Initialize Firebase
  if (typeof firebase === 'undefined') {
      console.error("❌ Firebase SDK is missing.");
      return;
  }
  const auth = firebase.auth();
  const db = firebase.firestore();

  // 2. Config & Elements
  const API_BASE_URL = 'http://localhost:5000/api';
  const dashboardUserInfo = document.getElementById('dashboard-user-info');
  const logoutButton = document.getElementById('logout-button');
  const playlistsContainer = document.getElementById('playlists-container');
  
  const statTotalPlaylists = document.getElementById('stat-total-playlists');
  const statTopicsCompleted = document.getElementById('stat-topics-completed');
  const statInProgress = document.getElementById('stat-in-progress');

  // 3. Auth Listener
  auth.onAuthStateChanged((user) => {
      if (user) {
          console.log('User logged in:', user.email);
          if (dashboardUserInfo) dashboardUserInfo.textContent = `Welcome, ${user.displayName || user.email}`;
          loadPlaylists(user);
      } else {
          console.log('User not logged in. Redirecting.');
          window.location.href = 'login.html';
      }
  });

  // 4. Load Playlists
  const loadPlaylists = async (user) => {
      playlistsContainer.innerHTML = '<div class="text-center py-10 text-gray-500">Loading your playlists...</div>';

      try {
          const idToken = await user.getIdToken(true);
          const response = await fetch(`${API_BASE_URL}/playlist/get`, {
              method: 'GET',
              headers: { 'Authorization': `Bearer ${idToken}` }
          });

          if (!response.ok) throw new Error("Failed to fetch playlists.");

          const data = await response.json();
          renderPlaylists(data.playlists);

      } catch (error) {
          console.error('Error loading playlists:', error);
          playlistsContainer.innerHTML = `<p class="text-center text-red-500">Error: ${error.message}</p>`;
      }
  };

  // 5. Render Playlists
  const renderPlaylists = (playlists) => {
      // Stats
      const total = playlists.length;
      const completed = playlists.filter(p => p.status === 'completed').length;
      const inProgress = total - completed;

      if (statTotalPlaylists) statTotalPlaylists.textContent = total;
      if (statTopicsCompleted) statTopicsCompleted.textContent = completed;
      if (statInProgress) statInProgress.textContent = inProgress;

      playlistsContainer.innerHTML = '';

      if (total === 0) {
          playlistsContainer.innerHTML = '<p class="text-center text-gray-500 py-10">You haven\'t saved any playlists yet.</p>';
          return;
      }

      playlists.forEach(playlist => {
          const firstVideoThumbnail = playlist.videos[0]?.thumbnailUrl || 'https://via.placeholder.com/150';
          const isCompleted = playlist.status === 'completed';

          const card = document.createElement('div');
          card.className = `playlist-card bg-white p-6 rounded-2xl shadow-sm border flex flex-col md:flex-row items-center gap-6 transition hover:shadow-md ${isCompleted ? 'border-emerald-200 bg-emerald-50/30' : 'border-slate-100'}`;
          card.dataset.id = playlist.id;
          card.dataset.status = playlist.status || 'in-progress';

          card.innerHTML = `
              <div class="flex-shrink-0 relative w-full md:w-40">
                  <img class="w-full h-24 object-cover rounded-lg ${isCompleted ? 'opacity-60 grayscale' : ''}" src="${firstVideoThumbnail}" alt="Thumbnail">
                  ${isCompleted ? '<div class="absolute inset-0 flex items-center justify-center"><span class="bg-emerald-600 text-white text-xs font-bold px-2 py-1 rounded-full shadow-sm">COMPLETED</span></div>' : ''}
              </div>
              
              <div class="flex-grow text-center md:text-left">
                  <h4 class="text-xl font-bold text-slate-800 ${isCompleted ? 'line-through text-slate-400' : ''}">${playlist.title}</h4>
                  <p class="text-slate-500 text-sm mt-1">${playlist.videos.length} videos • Saved ${new Date(playlist.createdAt).toLocaleDateString()}</p>
              </div>
              
              <div class="flex flex-col gap-2 w-full md:w-auto">
                  <!-- CHANGED TO BUTTON type="button" TO PREVENT RELOAD -->
                  <button type="button" class="view-button px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg transition shadow-sm w-full">
                      View
                  </button>
                  
                  <button type="button" class="status-button px-4 py-2 text-sm font-semibold rounded-lg border w-full transition ${isCompleted ? 'border-amber-400 text-amber-600 hover:bg-amber-50' : 'border-emerald-500 text-emerald-600 hover:bg-emerald-50'}">
                      ${isCompleted ? 'Mark In-Progress' : 'Mark Complete'}
                  </button>

                  <button type="button" class="delete-button px-4 py-2 text-white bg-red-500 hover:bg-red-600 text-sm font-semibold rounded-lg transition shadow-sm w-full">
                      Delete
                  </button>
              </div>
          `;
          playlistsContainer.appendChild(card);
      });
  };

  // 6. Global Event Listener (View / Status / Delete)
  if (playlistsContainer) {
      playlistsContainer.addEventListener('click', async (e) => {
          const card = e.target.closest('.playlist-card');
          if (!card) return;
          const playlistId = card.dataset.id;

          // --- A. DELETE ---
          if (e.target.closest('.delete-button')) {
              if (!confirm("Delete this playlist?")) return;
              
              try {
                  const idToken = await auth.currentUser.getIdToken(true);
                  const res = await fetch(`${API_BASE_URL}/playlist/${playlistId}`, {
                      method: 'DELETE',
                      headers: { 'Authorization': `Bearer ${idToken}` }
                  });
                  if (res.ok) {
                      card.remove();
                      // Recalculate basic stats visually or reload
                      location.reload(); 
                  } else {
                      alert("Failed to delete.");
                  }
              } catch (err) { console.error(err); }
          }

          // --- B. STATUS ---
          if (e.target.closest('.status-button')) {
              const currentStatus = card.dataset.status;
              const newStatus = currentStatus === 'completed' ? 'in-progress' : 'completed';
              
              // Optimistic Update
              e.target.textContent = "Updating...";
              
              try {
                  const idToken = await auth.currentUser.getIdToken(true);
                  await fetch(`${API_BASE_URL}/playlist/${playlistId}/status`, {
                      method: 'PATCH',
                      headers: { 
                          'Content-Type': 'application/json',
                          'Authorization': `Bearer ${idToken}` 
                      },
                      body: JSON.stringify({ status: newStatus })
                  });
                  // Reload to update stats and UI cleanly
                  loadPlaylists(auth.currentUser);
              } catch (err) { console.error(err); }
          }

          // --- C. VIEW (The Fix) ---
          if (e.target.closest('.view-button')) {
              console.log("View clicked for:", playlistId);
              
              try {
                  const idToken = await auth.currentUser.getIdToken(true);
                  // Fetch fresh data to ensure we have everything
                  const res = await fetch(`${API_BASE_URL}/playlist/get`, {
                      method: 'GET',
                      headers: { 'Authorization': `Bearer ${idToken}` }
                  });
                  const data = await res.json();
                  const playlist = data.playlists.find(p => p.id === playlistId);

                  if (playlist) {
                      // 1. Save to LocalStorage
                      localStorage.setItem('currentPlaylist', JSON.stringify(playlist));
                      console.log("Data saved. Redirecting...");
                      // 2. Redirect
                      window.location.href = 'playlist.html';
                  } else {
                      alert("Error: Playlist data not found.");
                  }
              } catch (err) {
                  console.error(err);
                  alert("Error opening playlist.");
              }
          }
      });
  }

  // 7. Logout Listener
  if (logoutButton) {
      logoutButton.addEventListener('click', async () => {
          await auth.signOut();
      });
  }

}); // End Window Load