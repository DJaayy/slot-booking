// Weekly slots page functionality

document.addEventListener('DOMContentLoaded', () => {
    // Initialize variables
    let currentWeek = new Date(); // Current week
    let currentSlots = {}; // Store current slots
    
    // Initialize UI elements and event listeners
    initUI();
    
    // Load initial slots for current week
    loadSlots(currentWeek);
    
    /**
     * Initialize UI elements and event handlers
     */
    function initUI() {
        // Week navigation
        document.getElementById('prev-week-btn').addEventListener('click', navigateToPreviousWeek);
        document.getElementById('next-week-btn').addEventListener('click', navigateToNextWeek);
        
        // Modal close buttons
        document.getElementById('close-booking-modal').addEventListener('click', () => {
            document.getElementById('booking-modal').classList.add('hidden');
        });
        
        document.getElementById('close-details-modal').addEventListener('click', () => {
            document.getElementById('details-modal').classList.add('hidden');
        });
        
        document.getElementById('close-status-modal').addEventListener('click', () => {
            document.getElementById('status-modal').classList.add('hidden');
        });
        
        document.getElementById('cancel-status-update').addEventListener('click', () => {
            document.getElementById('status-modal').classList.add('hidden');
        });
        
        // Form submissions
        document.getElementById('booking-form').addEventListener('submit', handleBookingFormSubmit);
        document.getElementById('status-form').addEventListener('submit', handleStatusFormSubmit);
        
        // Action buttons
        document.getElementById('cancel-booking-btn').addEventListener('click', handleCancelBooking);
        document.getElementById('update-status-btn').addEventListener('click', handleUpdateStatus);
        
        // Update week range text
        updateWeekRangeText();
    }
    
    /**
     * Load slots for a specific week
     */
    function loadSlots(date) {
        showLoading();
        
        // Format date as ISO string for the API
        const dateParam = formatISODate(date);
        
        // Reference to slots collection
        db.collection('slots')
            .where('date', '>=', getStartOfWeek(date))
            .where('date', '<=', getEndOfWeek(date))
            .get()
            .then((querySnapshot) => {
                // Process slots
                const slots = [];
                querySnapshot.forEach((doc) => {
                    slots.push({
                        id: doc.id,
                        ...doc.data(),
                        // Convert Firestore timestamp to JS Date
                        date: doc.data().date.toDate()
                    });
                });
                
                // Group slots by day
                const slotsByDay = groupSlotsByDay(slots);
                
                // Store current slots for reference
                currentSlots = slotsByDay;
                
                // Render slots for each day
                renderSlots(slotsByDay);
                hideLoading();
            })
            .catch((error) => {
                console.error('Error loading slots:', error);
                showToast('Failed to load slots. Please try again.', 'error');
                hideLoading();
            });
    }
    
    /**
     * Group slots by day of the week
     */
    function groupSlotsByDay(slots) {
        return slots.reduce((acc, slot) => {
            const day = getDayOfWeek(slot.date);
            if (!acc[day]) {
                acc[day] = [];
            }
            acc[day].push(slot);
            return acc;
        }, {});
    }
    
    /**
     * Render slots for each day
     */
    function renderSlots(slotsByDay) {
        // Get all day containers
        const dayContainers = document.querySelectorAll('.day-container');
        
        // Clear all day slots
        dayContainers.forEach(container => {
            const day = container.getAttribute('data-day');
            const slotsContainer = container.querySelector('.day-slots');
            
            // Clear current content
            slotsContainer.innerHTML = '';
            
            // Get slots for this day
            const daySlots = slotsByDay[day] || [];
            
            if (daySlots.length === 0) {
                // No slots for this day
                slotsContainer.innerHTML = `
                    <p class="text-center text-gray-500 py-4">No slots available</p>
                `;
                return;
            }
            
            // Sort slots by slot number
            daySlots.sort((a, b) => a.slotNumber - b.slotNumber);
            
            // Render each slot
            daySlots.forEach(slot => {
                const slotCard = createSlotCard(slot);
                slotsContainer.appendChild(slotCard);
            });
        });
    }
    
    /**
     * Create a slot card element
     */
    function createSlotCard(slot) {
        const slotCard = document.createElement('div');
        
        // Determine if slot is booked
        const isBooked = slot.booked === 1;
        
        // Set classes based on booking status
        slotCard.className = `slot-card p-4 bg-white rounded-lg shadow-sm ${isBooked ? 'booked' : 'available'}`;
        
        // Get short time and tooltip
        const timeShort = getSlotTimeShort(slot.slotNumber);
        const timeDetail = getSlotTimeDetail(slot.slotNumber);
        
        // Format date
        const formattedDate = formatShortDate(slot.date);
        
        // Create HTML content
        slotCard.innerHTML = `
            <div class="flex justify-between items-start">
                <div>
                    <span class="time-tooltip font-medium">
                        Slot ${slot.slotNumber} (${timeShort})
                        <span class="tooltip-text">${timeDetail}</span>
                    </span>
                    <p class="text-xs text-gray-500">${formattedDate}</p>
                </div>
                <div>
                    ${isBooked ? 
                        `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                            Booked
                        </span>` : 
                        `<span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Available
                        </span>`
                    }
                </div>
            </div>
            ${isBooked && slot.release ? 
                `<div class="mt-2">
                    <p class="text-sm font-medium">${slot.release.name}</p>
                    <p class="text-xs text-gray-500">${slot.release.team}</p>
                </div>` : ''
            }
            <div class="mt-3">
                <button data-slot-id="${slot.id}" class="${isBooked ? 'view-slot-btn' : 'book-slot-btn'} text-sm px-3 py-1 rounded-md font-medium ${
                    isBooked ? 
                    'bg-gray-100 text-gray-700 hover:bg-gray-200' : 
                    'bg-blue-100 text-blue-700 hover:bg-blue-200'
                }">
                    ${isBooked ? 'View Details' : 'Book Slot'}
                </button>
            </div>
        `;
        
        // Add event listeners
        const button = slotCard.querySelector(isBooked ? '.view-slot-btn' : '.book-slot-btn');
        
        if (isBooked) {
            button.addEventListener('click', () => viewSlotDetails(slot));
        } else {
            button.addEventListener('click', () => openBookingModal(slot));
        }
        
        return slotCard;
    }
    
    /**
     * Navigate to previous week
     */
    function navigateToPreviousWeek() {
        // Get the start of the current week
        const startOfCurrentWeek = getStartOfWeek(currentWeek);
        
        // Create a new date 7 days before
        const newDate = new Date(startOfCurrentWeek);
        newDate.setDate(newDate.getDate() - 7);
        
        // Update current week
        currentWeek = newDate;
        
        // Update week range text
        updateWeekRangeText();
        
        // Load slots for new week
        loadSlots(currentWeek);
    }
    
    /**
     * Navigate to next week
     */
    function navigateToNextWeek() {
        // Get the start of the current week
        const startOfCurrentWeek = getStartOfWeek(currentWeek);
        
        // Create a new date 7 days after
        const newDate = new Date(startOfCurrentWeek);
        newDate.setDate(newDate.getDate() + 7);
        
        // Update current week
        currentWeek = newDate;
        
        // Update week range text
        updateWeekRangeText();
        
        // Load slots for new week
        loadSlots(currentWeek);
    }
    
    /**
     * Update the week range text
     */
    function updateWeekRangeText() {
        const startOfWeek = getStartOfWeek(currentWeek);
        const endOfWeek = getEndOfWeek(currentWeek);
        
        document.getElementById('week-range').textContent = formatWeekRange(startOfWeek, endOfWeek);
    }
    
    /**
     * Open the booking modal for a slot
     */
    function openBookingModal(slot) {
        // Set slot ID in the form
        document.getElementById('slot-id').value = slot.id;
        
        // Set slot time in the modal
        const day = getDayOfWeek(slot.date);
        const date = formatDate(slot.date);
        const time = getSlotTimeDetail(slot.slotNumber);
        document.getElementById('booking-slot-time').textContent = `${day}, ${date}: ${time}`;
        
        // Reset form
        document.getElementById('booking-form').reset();
        
        // Show modal
        document.getElementById('booking-modal').classList.remove('hidden');
    }
    
    /**
     * View slot details
     */
    function viewSlotDetails(slot) {
        // We need to fetch the release for this slot
        const releaseId = slot.releaseId;
        
        if (!releaseId) {
            showToast('Release information not available', 'error');
            return;
        }
        
        showLoading();
        
        // Fetch release from Firestore
        db.collection('releases').doc(releaseId)
            .get()
            .then((doc) => {
                if (doc.exists) {
                    const release = {
                        id: doc.id,
                        ...doc.data()
                    };
                    
                    showReleaseDetails(slot, release);
                } else {
                    showToast('Release not found', 'error');
                }
                hideLoading();
            })
            .catch((error) => {
                console.error('Error fetching release:', error);
                showToast('Failed to load release details', 'error');
                hideLoading();
            });
    }
    
    /**
     * Show release details in modal
     */
    function showReleaseDetails(slot, release) {
        // Format date and time
        const date = formatDate(slot.date);
        const time = getSlotTimeDetail(slot.slotNumber);
        
        // Set release details in modal
        document.getElementById('details-datetime').textContent = `${date}, ${time}`;
        document.getElementById('details-name').textContent = release.name;
        document.getElementById('details-version').textContent = release.version || 'N/A';
        document.getElementById('details-team').textContent = release.team;
        document.getElementById('details-type').textContent = release.releaseType.charAt(0).toUpperCase() + release.releaseType.slice(1);
        document.getElementById('details-description').textContent = release.description || 'No description provided';
        
        // Set status with badge
        const statusBadge = `<span class="badge ${getStatusBadgeClass(release.status)}">${release.status.charAt(0).toUpperCase() + release.status.slice(1)}</span>`;
        document.getElementById('details-status').innerHTML = statusBadge;
        
        // Add comments if available
        if (release.comments) {
            document.getElementById('details-status').innerHTML += `<p class="mt-1 text-sm text-gray-500">${release.comments}</p>`;
        }
        
        // Set release ID for cancel booking and update status
        document.getElementById('cancel-booking-btn').dataset.id = release.id;
        document.getElementById('update-status-btn').dataset.id = release.id;
        
        // Show modal
        document.getElementById('details-modal').classList.remove('hidden');
    }
    
    /**
     * Handle booking form submission
     */
    function handleBookingFormSubmit(event) {
        event.preventDefault();
        
        // Get form data
        const slotId = document.getElementById('slot-id').value;
        const releaseName = document.getElementById('release-name').value;
        const version = document.getElementById('version').value;
        const team = document.getElementById('team').value;
        const releaseType = document.getElementById('release-type').value;
        const description = document.getElementById('description').value;
        
        // Validate form data
        if (!slotId || !releaseName || !team || !releaseType) {
            showToast('Please fill in all required fields', 'error');
            return;
        }
        
        showLoading();
        
        // First, check if the slot is still available
        db.collection('slots').doc(slotId)
            .get()
            .then((doc) => {
                if (!doc.exists) {
                    showToast('Slot not found', 'error');
                    hideLoading();
                    return;
                }
                
                const slot = doc.data();
                
                if (slot.booked === 1) {
                    showToast('This slot has already been booked', 'error');
                    hideLoading();
                    return;
                }
                
                // Create a new release
                db.collection('releases').add({
                    name: releaseName,
                    version: version || null,
                    team: team,
                    releaseType: releaseType,
                    description: description || null,
                    status: 'pending',
                    slotId: slotId,
                    slotDate: slot.date,
                    slotNumber: slot.slotNumber,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                })
                .then((docRef) => {
                    // Update the slot with release ID and marked as booked
                    db.collection('slots').doc(slotId).update({
                        booked: 1,
                        releaseId: docRef.id,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    })
                    .then(() => {
                        // Success
                        showToast('Slot booked successfully!');
                        document.getElementById('booking-modal').classList.add('hidden');
                        
                        // Reload slots
                        loadSlots(currentWeek);
                    })
                    .catch((error) => {
                        console.error('Error updating slot:', error);
                        showToast('Failed to book slot. Please try again.', 'error');
                        hideLoading();
                    });
                })
                .catch((error) => {
                    console.error('Error creating release:', error);
                    showToast('Failed to create release. Please try again.', 'error');
                    hideLoading();
                });
            })
            .catch((error) => {
                console.error('Error checking slot:', error);
                showToast('Failed to check slot availability. Please try again.', 'error');
                hideLoading();
            });
    }
    
    /**
     * Handle cancel booking button click
     */
    function handleCancelBooking(event) {
        const releaseId = event.target.dataset.id;
        if (!releaseId) return;
        
        if (confirm('Are you sure you want to cancel this booking? This action cannot be undone.')) {
            showLoading();
            
            // First get the release to get the slot ID
            db.collection('releases').doc(releaseId)
                .get()
                .then((doc) => {
                    if (!doc.exists) {
                        showToast('Release not found', 'error');
                        hideLoading();
                        return;
                    }
                    
                    const release = doc.data();
                    const slotId = release.slotId;
                    
                    // Update the slot to be available again
                    db.collection('slots').doc(slotId).update({
                        booked: 0,
                        releaseId: null,
                        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
                    })
                    .then(() => {
                        // Delete the release
                        db.collection('releases').doc(releaseId).delete()
                            .then(() => {
                                // Success
                                showToast('Booking cancelled successfully');
                                document.getElementById('details-modal').classList.add('hidden');
                                
                                // Reload slots
                                loadSlots(currentWeek);
                            })
                            .catch((error) => {
                                console.error('Error deleting release:', error);
                                showToast('Failed to cancel booking. Please try again.', 'error');
                                hideLoading();
                            });
                    })
                    .catch((error) => {
                        console.error('Error updating slot:', error);
                        showToast('Failed to cancel booking. Please try again.', 'error');
                        hideLoading();
                    });
                })
                .catch((error) => {
                    console.error('Error fetching release:', error);
                    showToast('Failed to fetch release information. Please try again.', 'error');
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
        
        // Reset form
        document.getElementById('status-form').reset();
        
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
            // Success
            showToast('Status updated successfully');
            document.getElementById('status-modal').classList.add('hidden');
            
            // Reload slots
            loadSlots(currentWeek);
        })
        .catch((error) => {
            console.error('Error updating status:', error);
            showToast('Failed to update status. Please try again.', 'error');
            hideLoading();
        });
    }
});