// Utility functions for the deployment slot booking application

// Format a date as "Mon, Apr 03, 2025"
function formatDate(date) {
    const options = { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
}

// Format a date as "Apr 03"
function formatShortDate(date) {
    const options = { month: 'short', day: 'numeric' };
    return new Date(date).toLocaleDateString('en-US', options);
}

// Format a date as "2025-04-03" (ISO format for database)
function formatISODate(date) {
    return date.toISOString().split('T')[0];
}

// Get time slot details based on slot number
function getSlotTimeDetail(slotNumber) {
    switch (slotNumber) {
        case 1:
            return '09:00 AM - 11:00 AM IST';
        case 2:
            return '02:00 PM - 04:00 PM IST';
        case 3:
            return '07:00 PM - 09:00 PM IST';
        default:
            return 'Unknown time slot';
    }
}

// Get short time label based on slot number
function getSlotTimeShort(slotNumber) {
    switch (slotNumber) {
        case 1:
            return '09:00 AM';
        case 2:
            return '02:00 PM';
        case 3:
            return '07:00 PM';
        default:
            return 'Unknown';
    }
}

// Get badge class based on release type
function getReleaseTypeBadgeClass(type) {
    const types = {
        feature: 'badge-feature',
        enhancement: 'badge-enhancement',
        bugfix: 'badge-bugfix',
        migration: 'badge-migration',
        other: 'badge-other'
    };
    return types[type.toLowerCase()] || types.other;
}

// Get badge class based on status
function getStatusBadgeClass(status) {
    const statuses = {
        pending: 'badge-pending',
        completed: 'badge-completed',
        canceled: 'badge-canceled',
        released: 'badge-completed',
        reverted: 'badge-canceled',
        skipped: 'badge-pending'
    };
    return statuses[status.toLowerCase()] || statuses.pending;
}

// Show a toast notification
function showToast(message, type = 'success') {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toast-message');
    
    // Set message and style based on type
    toastMessage.textContent = message;
    
    if (type === 'success') {
        toast.className = 'fixed top-4 right-4 px-4 py-2 bg-green-500 text-white rounded-md shadow-lg transform transition-all duration-300 z-50';
    } else if (type === 'error') {
        toast.className = 'fixed top-4 right-4 px-4 py-2 bg-red-500 text-white rounded-md shadow-lg transform transition-all duration-300 z-50';
    } else if (type === 'warning') {
        toast.className = 'fixed top-4 right-4 px-4 py-2 bg-yellow-500 text-white rounded-md shadow-lg transform transition-all duration-300 z-50';
    }
    
    // Show toast with animation
    toast.classList.add('toast-enter');
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
    
    // Hide toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('toast-enter');
        toast.classList.add('toast-exit');
        
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(8px)';
            toast.classList.remove('toast-exit');
        }, 300);
    }, 3000);
}

// Show loading overlay
function showLoading() {
    document.getElementById('loading-overlay').classList.remove('hidden');
}

// Hide loading overlay
function hideLoading() {
    document.getElementById('loading-overlay').classList.add('hidden');
}

// Get day of week name from date
function getDayOfWeek(date) {
    const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return days[new Date(date).getDay()];
}

// Get the start of the week (Monday) for a given date
function getStartOfWeek(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is Sunday
    return new Date(d.setDate(diff));
}

// Get the end of the week (Sunday) for a given date
function getEndOfWeek(date) {
    const startOfWeek = getStartOfWeek(date);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    return endOfWeek;
}

// Format a week range as "Apr 3 - Apr 9, 2025"
function formatWeekRange(startDate, endDate) {
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const startDay = startDate.getDate();
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    const endDay = endDate.getDate();
    const year = endDate.getFullYear();
    
    return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
}