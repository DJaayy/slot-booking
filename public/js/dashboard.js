// Dashboard page functionality

document.addEventListener('DOMContentLoaded', () => {
    // Initialize variables
    let currentReleases = [];
    
    // Initialize UI elements and event listeners
    initUI();
    
    // Load initial data
    loadReleases();
    loadStats();
    
    /**
     * Initialize UI elements and event handlers
     */
    function initUI() {
        // Close Details Modal
        document.getElementById('close-details-modal').addEventListener('click', () => {
            document.getElementById('details-modal').classList.add('hidden');
        });
        
        // Close Status Modal
        document.getElementById('close-status-modal').addEventListener('click', () => {
            document.getElementById('status-modal').classList.add('hidden');
        });
        
        // Cancel Status Update Button
        document.getElementById('cancel-status-update').addEventListener('click', () => {
            document.getElementById('status-modal').classList.add('hidden');
        });
        
        // Status Form Submission
        document.getElementById('status-form').addEventListener('submit', handleStatusFormSubmit);
        
        // Handle cancel booking button
        document.getElementById('cancel-booking-btn').addEventListener('click', handleCancelBooking);
        
        // Handle update status button
        document.getElementById('update-status-btn').addEventListener('click', handleUpdateStatus);
    }
    
    /**
     * Load releases from Firestore
     */
    function loadReleases() {
        showLoading();
        
        // Get today's date at the beginning of the day
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Reference to releases collection
        db.collection('releases')
            .where('slotDate', '>=', today)
            .orderBy('slotDate')
            .orderBy('slotNumber')
            .get()
            .then((querySnapshot) => {
                const releases = [];
                querySnapshot.forEach((doc) => {
                    releases.push({
                        id: doc.id,
                        ...doc.data(),
                        // Convert Firestore timestamp to JS Date
                        slotDate: doc.data().slotDate.toDate()
                    });
                });
                
                // Store releases for later use
                currentReleases = releases;
                
                // Render releases table
                renderReleasesTable(releases);
                hideLoading();
            })
            .catch((error) => {
                console.error('Error loading releases:', error);
                showToast('Failed to load releases. Please try again.', 'error');
                hideLoading();
            });
    }
    
    /**
     * Render the releases table
     */
    function renderReleasesTable(releases) {
        const tableBody = document.getElementById('releases-table-body');
        
        // Clear current content
        tableBody.innerHTML = '';
        
        if (releases.length === 0) {
            // Show "no releases" message
            tableBody.innerHTML = `
                <tr id="no-releases-row">
                    <td colspan="6" class="px-6 py-4 text-center text-sm text-gray-500">No upcoming releases found</td>
                </tr>
            `;
            return;
        }
        
        // Render each release
        releases.forEach(release => {
            const row = document.createElement('tr');
            
            // Format date and time
            const date = formatDate(release.slotDate);
            const time = getSlotTimeShort(release.slotNumber);
            
            // Create status badge
            const statusBadge = `<span class="badge ${getStatusBadgeClass(release.status)}">${release.status.charAt(0).toUpperCase() + release.status.slice(1)}</span>`;
            
            // Create type badge
            const typeBadge = `<span class="badge ${getReleaseTypeBadgeClass(release.type)}">${release.type.charAt(0).toUpperCase() + release.type.slice(1)}</span>`;
            
            row.innerHTML = `
                <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${date}, ${time}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${release.name} (v${release.version})</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${release.team}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${typeBadge}</td>
                <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${statusBadge}</td>
                <td class="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button 
                        data-id="${release.id}" 
                        class="text-blue-600 hover:text-blue-900 view-details-btn">
                        View Details
                    </button>
                </td>
            `;
            
            tableBody.appendChild(row);
        });
        
        // Add event listeners to the view details buttons
        document.querySelectorAll('.view-details-btn').forEach(btn => {
            btn.addEventListener('click', (event) => {
                const releaseId = event.target.dataset.id;
                const release = currentReleases.find(r => r.id === releaseId);
                if (release) {
                    showReleaseDetails(release);
                }
            });
        });
    }
    
    /**
     * Load statistics from Firestore
     */
    function loadStats() {
        showLoading();
        
        // Get today's date at the beginning of the day
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        // Get the start and end of the current week
        const startOfWeek = getStartOfWeek(today);
        const endOfWeek = getEndOfWeek(today);
        
        // Get the start and end of the next week
        const startOfNextWeek = new Date(startOfWeek);
        startOfNextWeek.setDate(startOfNextWeek.getDate() + 7);
        const endOfNextWeek = new Date(endOfWeek);
        endOfNextWeek.setDate(endOfNextWeek.getDate() + 7);
        
        // Load releases for statistics
        db.collection('releases')
            .where('slotDate', '>=', today)
            .get()
            .then((querySnapshot) => {
                // Statistics object
                const stats = {
                    total: querySnapshot.size,
                    thisWeek: 0,
                    nextWeek: 0,
                    byType: {},
                    byTeam: {}
                };
                
                // Process each release
                querySnapshot.forEach((doc) => {
                    const release = doc.data();
                    const releaseDate = release.slotDate.toDate();
                    
                    // Count releases this week
                    if (releaseDate >= startOfWeek && releaseDate <= endOfWeek) {
                        stats.thisWeek++;
                    }
                    
                    // Count releases next week
                    if (releaseDate >= startOfNextWeek && releaseDate <= endOfNextWeek) {
                        stats.nextWeek++;
                    }
                    
                    // Count by release type
                    stats.byType[release.type] = (stats.byType[release.type] || 0) + 1;
                    
                    // Count by team
                    stats.byTeam[release.team] = (stats.byTeam[release.team] || 0) + 1;
                });
                
                // Load all slots to calculate available slots
                db.collection('slots')
                    .where('date', '>=', today)
                    .get()
                    .then((slotsSnapshot) => {
                        let totalSlots = 0;
                        slotsSnapshot.forEach((doc) => {
                            totalSlots++;
                        });
                        
                        // Calculate available slots
                        stats.available = totalSlots - stats.total;
                        
                        // Render statistics
                        renderStatistics(stats);
                        hideLoading();
                    })
                    .catch((error) => {
                        console.error('Error loading slots:', error);
                        hideLoading();
                    });
            })
            .catch((error) => {
                console.error('Error loading statistics:', error);
                showToast('Failed to load statistics. Please try again.', 'error');
                hideLoading();
            });
    }
    
    /**
     * Render statistics on the dashboard
     */
    function renderStatistics(stats) {
        // Update summary statistics
        document.getElementById('stats-total').textContent = stats.total;
        document.getElementById('stats-this-week').textContent = stats.thisWeek;
        document.getElementById('stats-next-week').textContent = stats.nextWeek;
        document.getElementById('stats-available').textContent = stats.available;
        
        // Render release type statistics
        const typeStatsContainer = document.getElementById('type-stats-container');
        typeStatsContainer.innerHTML = '';
        
        // Check if there are any types to display
        if (Object.keys(stats.byType).length === 0) {
            document.getElementById('no-type-stats').classList.remove('hidden');
        } else {
            document.getElementById('no-type-stats')?.classList.add('hidden');
            
            // Create and append bars for each type
            Object.entries(stats.byType).sort((a, b) => b[1] - a[1]).forEach(([type, count]) => {
                // Calculate percentage (max 100%)
                const percentage = Math.min(Math.round((count / stats.total) * 100), 100);
                
                // Create element
                const typeBar = document.createElement('div');
                typeBar.innerHTML = `
                    <div class="flex justify-between mb-1">
                        <span class="text-sm font-medium text-gray-700">${type.charAt(0).toUpperCase() + type.slice(1)}</span>
                        <span class="text-sm font-medium text-gray-700">${count}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="h-2 rounded-full ${getReleaseTypeBadgeColor(type)}" style="width: ${percentage}%"></div>
                    </div>
                `;
                
                typeStatsContainer.appendChild(typeBar);
            });
        }
        
        // Render team statistics
        const teamStatsContainer = document.getElementById('team-stats-container');
        teamStatsContainer.innerHTML = '';
        
        // Check if there are any teams to display
        if (Object.keys(stats.byTeam).length === 0) {
            document.getElementById('no-team-stats').classList.remove('hidden');
        } else {
            document.getElementById('no-team-stats')?.classList.add('hidden');
            
            // Create and append bars for each team
            Object.entries(stats.byTeam).sort((a, b) => b[1] - a[1]).forEach(([team, count]) => {
                // Calculate percentage (max 100%)
                const percentage = Math.min(Math.round((count / stats.total) * 100), 100);
                
                // Create element
                const teamBar = document.createElement('div');
                teamBar.innerHTML = `
                    <div class="flex justify-between mb-1">
                        <span class="text-sm font-medium text-gray-700">${team}</span>
                        <span class="text-sm font-medium text-gray-700">${count}</span>
                    </div>
                    <div class="w-full bg-gray-200 rounded-full h-2">
                        <div class="h-2 rounded-full bg-blue-600" style="width: ${percentage}%"></div>
                    </div>
                `;
                
                teamStatsContainer.appendChild(teamBar);
            });
        }
    }
    
    /**
     * Get color for release type progress bar
     */
    function getReleaseTypeBadgeColor(type) {
        const colors = {
            feature: 'bg-blue-600',
            enhancement: 'bg-green-600',
            bugfix: 'bg-red-600',
            migration: 'bg-purple-600',
            other: 'bg-gray-600'
        };
        return colors[type.toLowerCase()] || colors.other;
    }
    
    /**
     * Show release details in modal
     */
    function showReleaseDetails(release) {
        // Set release details in modal
        document.getElementById('details-datetime').textContent = `${formatDate(release.slotDate)}, ${getSlotTimeDetail(release.slotNumber)}`;
        document.getElementById('details-name').textContent = release.name;
        document.getElementById('details-version').textContent = release.version;
        document.getElementById('details-team').textContent = release.team;
        document.getElementById('details-type').textContent = release.type.charAt(0).toUpperCase() + release.type.slice(1);
        document.getElementById('details-description').textContent = release.description || 'No description provided';
        
        // Set status with badge
        const statusBadge = `<span class="badge ${getStatusBadgeClass(release.status)}">${release.status.charAt(0).toUpperCase() + release.status.slice(1)}</span>`;
        document.getElementById('details-status').innerHTML = statusBadge;
        
        // Add comments if available
        if (release.comments) {
            document.getElementById('details-status').innerHTML += `<p class="mt-1 text-sm text-gray-500">${release.comments}</p>`;
        }
        
        // Set release ID for cancel booking
        document.getElementById('cancel-booking-btn').dataset.id = release.id;
        document.getElementById('update-status-btn').dataset.id = release.id;
        
        // Show modal
        document.getElementById('details-modal').classList.remove('hidden');
    }
    
    /**
     * Handle cancel booking button click
     */
    function handleCancelBooking(event) {
        const releaseId = event.target.dataset.id;
        if (!releaseId) return;
        
        if (confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
            showLoading();
            
            // Delete the release document
            db.collection('releases').doc(releaseId).delete()
                .then(() => {
                    // Success - reload releases and hide modal
                    showToast('Booking cancelled successfully');
                    document.getElementById('details-modal').classList.add('hidden');
                    loadReleases();
                    loadStats();
                })
                .catch((error) => {
                    console.error('Error cancelling booking:', error);
                    showToast('Failed to cancel booking. Please try again.', 'error');
                    hideLoading();
                });
        }
    }
    
    /**
     * Handle update status button click
     */
    function handleUpdateStatus(event) {
        const releaseId = event.target.dataset.id;
        if (!releaseId) return;
        
        // Hide details modal and show status modal
        document.getElementById('details-modal').classList.add('hidden');
        
        // Set release ID in form
        document.getElementById('release-id').value = releaseId;
        
        // Show status modal
        document.getElementById('status-modal').classList.remove('hidden');
    }
    
    /**
     * Handle status form submission
     */
    function handleStatusFormSubmit(event) {
        event.preventDefault();
        
        // Get form data
        const releaseId = document.getElementById('release-id').value;
        const status = document.querySelector('input[name="status"]:checked')?.value;
        const comments = document.getElementById('status-comments').value;
        
        // Validate form data
        if (!releaseId || !status) {
            showToast('Please select a status', 'error');
            return;
        }
        
        showLoading();
        
        // Update release status in Firestore
        db.collection('releases').doc(releaseId).update({
            status: status,
            comments: comments,
            updatedAt: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(() => {
            // Success - reload releases and hide modal
            showToast('Status updated successfully');
            document.getElementById('status-modal').classList.add('hidden');
            loadReleases();
        })
        .catch((error) => {
            console.error('Error updating status:', error);
            showToast('Failed to update status. Please try again.', 'error');
            hideLoading();
        });
    }
});