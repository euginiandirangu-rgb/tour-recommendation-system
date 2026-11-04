// ========================================
// TOUR RECOMMENDATION SYSTEM - USER DASHBOARD
// ========================================

const API_BASE_URL = 'http://localhost:5000/api';

// Global Variables
let currentUser = null;
let authToken = localStorage.getItem('access_token');
let currentSection = 'dashboard';

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    loadUserProfile();
    loadDashboardContent();
    setupEventListeners();
});

function checkAuth() {
    if (!authToken) {
        window.location.href = '/';
        return;
    }
    
    const user = localStorage.getItem('user');
    if (user) {
        currentUser = JSON.parse(user);
        if (currentUser.role === 'admin') {
            window.location.href = '/admin.html';
            return;
        }
        document.getElementById('userName').textContent = currentUser.full_name;
    }
}

function setupEventListeners() {
    // Sidebar navigation
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            const section = link.dataset.section;
            if (section) {
                navigateToSection(section);
            }
        });
    });
    
    // Logout button
    document.getElementById('logoutBtn')?.addEventListener('click', logout);
    
    // Preference form
    document.getElementById('preferenceForm')?.addEventListener('submit', savePreferences);
    
    // Booking filters
    document.getElementById('filterBookings')?.addEventListener('change', filterBookings);
}

function navigateToSection(section) {
    currentSection = section;
    
    // Update active state in sidebar
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === section) {
            link.classList.add('active');
        }
    });
    
    // Load section content
    switch(section) {
        case 'dashboard':
            loadDashboardContent();
            break;
        case 'tours':
            loadTours();
            break;
        case 'recommendations':
            loadRecommendations();
            break;
        case 'bookings':
            loadBookings();
            break;
        case 'preferences':
            loadPreferencesForm();
            break;
        case 'profile':
            loadProfile();
            break;
    }
}

// ========================================
// DASHBOARD
// ========================================

async function loadDashboardContent() {
    const container = document.getElementById('mainContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="dashboard-header">
            <h1>Welcome back, ${currentUser?.full_name || 'Traveler'}!</h1>
            <p>Discover your next adventure with personalized recommendations</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <div class="stat-info">
                    <h3>Recommended Tours</h3>
                    <div class="stat-number" id="recCount">-</div>
                </div>
                <div class="stat-icon">
                    <i class="fas fa-compass"></i>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-info">
                    <h3>Your Bookings</h3>
                    <div class="stat-number" id="bookingCount">-</div>
                </div>
                <div class="stat-icon">
                    <i class="fas fa-ticket-alt"></i>
                </div>
            </div>
            <div class="stat-card">
                <div class="stat-info">
                    <h3>Reviews Written</h3>
                    <div class="stat-number" id="reviewCount">-</div>
                </div>
                <div class="stat-icon">
                    <i class="fas fa-star"></i>
                </div>
            </div>
        </div>
        
        <div class="section-header">
            <h2>Recommended For You</h2>
            <p>Based on your preferences and past bookings</p>
        </div>
        
        <div id="recommendedTours" class="tours-grid">
            <div class="loading"><div class="spinner"></div></div>
        </div>
    `;
    
    await loadRecommendedTours();
    await loadUserStats();
}

async function loadRecommendedTours() {
    try {
        const response = await fetch(`${API_BASE_URL}/recommendations`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        const container = document.getElementById('recommendedTours');
        
        if (container && data.recommendations) {
            if (data.recommendations.length === 0) {
                container.innerHTML = '<p class="text-center">No recommendations yet. Please update your preferences.</p>';
            } else {
                container.innerHTML = data.recommendations.map(tour => renderTourCard(tour)).join('');
            }
        }
    } catch (error) {
        console.error('Error loading recommendations:', error);
    }
}

async function loadUserStats() {
    try {
        const bookingsResponse = await fetch(`${API_BASE_URL}/bookings`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const bookings = await bookingsResponse.json();
        document.getElementById('bookingCount').textContent = bookings.bookings?.length || 0;
        
        // For demo, set recommendation count
        document.getElementById('recCount').textContent = '6';
        document.getElementById('reviewCount').textContent = '0';
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// ========================================
// TOURS
// ========================================

async function loadTours(category = null) {
    const container = document.getElementById('mainContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="dashboard-header">
            <h1>All Tours</h1>
            <p>Explore our amazing tour packages</p>
        </div>
        
        <div class="filters">
            <select id="categoryFilter" onchange="filterToursByCategory(this.value)">
                <option value="">All Categories</option>
                <option value="adventure">Adventure</option>
                <option value="nature">Nature</option>
                <option value="cultural">Cultural</option>
                <option value="relaxation">Relaxation</option>
            </select>
            <input type="text" id="searchInput" placeholder="Search tours..." onkeyup="searchTours(this.value)">
        </div>
        
        <div id="toursList" class="tours-grid">
            <div class="loading"><div class="spinner"></div></div>
        </div>
    `;
    
    await fetchAllTours(category);
}

async function fetchAllTours(category = null) {
    try {
        let url = `${API_BASE_URL}/tours`;
        if (category) {
            url = `${API_BASE_URL}/tours?category=${category}`;
        }
        
        const response = await fetch(url);
        const data = await response.json();
        
        const container = document.getElementById('toursList');
        if (container && data.tours) {
            if (data.tours.length === 0) {
                container.innerHTML = '<p class="text-center">No tours found.</p>';
            } else {
                container.innerHTML = data.tours.map(tour => renderTourCard(tour)).join('');
            }
        }
    } catch (error) {
        console.error('Error fetching tours:', error);
    }
}

function filterToursByCategory(category) {
    fetchAllTours(category);
}

function searchTours(query) {
    const cards = document.querySelectorAll('.tour-card');
    cards.forEach(card => {
        const title = card.querySelector('.tour-title')?.textContent.toLowerCase();
        const destination = card.querySelector('.tour-destination span')?.textContent.toLowerCase();
        if (title?.includes(query.toLowerCase()) || destination?.includes(query.toLowerCase())) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// ========================================
// RECOMMENDATIONS
// ========================================

async function loadRecommendations() {
    const container = document.getElementById('mainContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="dashboard-header">
            <h1>Personalized Recommendations</h1>
            <p>AI-powered tour suggestions tailored just for you</p>
        </div>
        
        <div class="recommendation-controls">
            <button class="btn-primary" onclick="refreshRecommendations()">
                <i class="fas fa-sync-alt"></i> Refresh Recommendations
            </button>
            <button class="btn-secondary" onclick="navigateToSection('preferences')">
                <i class="fas fa-sliders-h"></i> Update Preferences
            </button>
        </div>
        
        <div id="recommendationsList" class="tours-grid">
            <div class="loading"><div class="spinner"></div></div>
        </div>
    `;
    
    await fetchRecommendations();
}

async function fetchRecommendations() {
    try {
        const response = await fetch(`${API_BASE_URL}/recommendations`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        const container = document.getElementById('recommendationsList');
        
        if (container && data.recommendations) {
            if (data.recommendations.length === 0) {
                container.innerHTML = `
                    <div class="text-center">
                        <p>No recommendations yet. Please update your preferences to get personalized recommendations.</p>
                        <button class="btn-primary mt-4" onclick="navigateToSection('preferences')">
                            Update Preferences
                        </button>
                    </div>
                `;
            } else {
                container.innerHTML = data.recommendations.map(tour => renderTourCard(tour)).join('');
            }
        }
    } catch (error) {
        console.error('Error fetching recommendations:', error);
    }
}

function refreshRecommendations() {
    fetchRecommendations();
}

// ========================================
// BOOKINGS
// ========================================

async function loadBookings() {
    const container = document.getElementById('mainContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="dashboard-header">
            <h1>My Bookings</h1>
            <p>View and manage your tour bookings</p>
        </div>
        
        <div class="filters">
            <select id="filterBookings">
                <option value="all">All Bookings</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
            </select>
        </div>
        
        <div id="bookingsList">
            <div class="loading"><div class="spinner"></div></div>
        </div>
    `;
    
    await fetchBookings();
}

async function fetchBookings() {
    try {
        const response = await fetch(`${API_BASE_URL}/bookings`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        const data = await response.json();
        const container = document.getElementById('bookingsList');
        
        if (container && data.bookings) {
            if (data.bookings.length === 0) {
                container.innerHTML = `
                    <div class="text-center">
                        <p>You haven't made any bookings yet.</p>
                        <button class="btn-primary mt-4" onclick="navigateToSection('tours')">
                            Browse Tours
                        </button>
                    </div>
                `;
            } else {
                container.innerHTML = data.bookings.map(booking => renderBookingCard(booking)).join('');
            }
        }
    } catch (error) {
        console.error('Error fetching bookings:', error);
    }
}

function filterBookings() {
    const filter = document.getElementById('filterBookings')?.value;
    const cards = document.querySelectorAll('.booking-card');
    
    cards.forEach(card => {
        if (filter === 'all' || card.dataset.status === filter) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

// ========================================
// PREFERENCES
// ========================================

async function loadPreferencesForm() {
    const container = document.getElementById('mainContent');
    if (!container) return;
    
    // Load existing preferences
    let preferences = {};
    try {
        const response = await fetch(`${API_BASE_URL}/preferences`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        preferences = data.preferences || {};
    } catch (error) {
        console.error('Error loading preferences:', error);
    }
    
    container.innerHTML = `
        <div class="dashboard-header">
            <h1>Travel Preferences</h1>
            <p>Tell us about your travel style to get better recommendations</p>
        </div>
        
        <div class="form-container">
            <form id="preferenceForm">
                <div class="form-group">
                    <label>Budget Range</label>
                    <select name="budget_range">
                        <option value="budget" ${preferences.budget_range === 'budget' ? 'selected' : ''}>Budget ($0-500)</option>
                        <option value="medium" ${preferences.budget_range === 'medium' || !preferences.budget_range ? 'selected' : ''}>Medium ($500-1500)</option>
                        <option value="luxury" ${preferences.budget_range === 'luxury' ? 'selected' : ''}>Luxury ($1500+)</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Travel Style</label>
                    <select name="travel_style">
                        <option value="adventure" ${preferences.travel_style === 'adventure' ? 'selected' : ''}>Adventure & Trekking</option>
                        <option value="relaxation" ${preferences.travel_style === 'relaxation' ? 'selected' : ''}>Relaxation & Beach</option>
                        <option value="cultural" ${preferences.travel_style === 'cultural' ? 'selected' : ''}>Cultural & Historical</option>
                        <option value="family" ${preferences.travel_style === 'family' ? 'selected' : ''}>Family Friendly</option>
                        <option value="general" ${preferences.travel_style === 'general' || !preferences.travel_style ? 'selected' : ''}>General</option>
                    </select>
                </div>
                
                <div class="form-group">
                    <label>Interests</label>
                    <input type="text" name="interests" value="${preferences.interests || ''}" placeholder="e.g., hiking, photography, wildlife, cuisine">
                </div>
                
                <div class="form-group">
                    <label>Preferred Destinations</label>
                    <input type="text" name="preferred_destinations" value="${preferences.preferred_destinations || ''}" placeholder="e.g., Maasai Mara, Nakuru, Naivasha">
                </div>
                
                <div class="form-group">
                    <label>Preferred Season</label>
                    <select name="preferred_season">
                        <option value="">Any Season</option>
                        <option value="summer" ${preferences.preferred_season === 'summer' ? 'selected' : ''}>Summer (June-August)</option>
                        <option value="winter" ${preferences.preferred_season === 'winter' ? 'selected' : ''}>Winter (December-February)</option>
                        <option value="spring" ${preferences.preferred_season === 'spring' ? 'selected' : ''}>Spring (March-May)</option>
                        <option value="autumn" ${preferences.preferred_season === 'autumn' ? 'selected' : ''}>Autumn (September-November)</option>
                    </select>
                </div>
                
                <button type="submit" class="btn-submit">Save Preferences</button>
            </form>
        </div>
    `;
    
    document.getElementById('preferenceForm')?.addEventListener('submit', savePreferences);
}

async function savePreferences(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const preferences = {
        budget_range: formData.get('budget_range'),
        travel_style: formData.get('travel_style'),
        interests: formData.get('interests'),
        preferred_destinations: formData.get('preferred_destinations'),
        preferred_season: formData.get('preferred_season')
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/preferences`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(preferences)
        });
        
        if (response.ok) {
            showToast('Preferences saved successfully!');
            navigateToSection('dashboard');
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to save preferences', 'error');
        }
    } catch (error) {
        console.error('Error saving preferences:', error);
        showToast('Network error', 'error');
    }
}

// ========================================
// PROFILE
// ========================================

async function loadProfile() {
    const container = document.getElementById('mainContent');
    if (!container) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/profile`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        const data = await response.json();
        const user = data.user;
        
        container.innerHTML = `
            <div class="dashboard-header">
                <h1>My Profile</h1>
                <p>Manage your account information</p>
            </div>
            
            <div class="profile-container">
                <div class="profile-avatar">
                    <i class="fas fa-user-circle"></i>
                </div>
                
                <form id="profileForm">
                    <div class="form-group">
                        <label>Full Name</label>
                        <input type="text" name="full_name" value="${user.full_name || ''}" required>
                    </div>
                    
                    <div class="form-group">
                        <label>Email</label>
                        <input type="email" value="${user.email || ''}" disabled>
                        <small>Email cannot be changed</small>
                    </div>
                    
                    <div class="form-group">
                        <label>Phone Number</label>
                        <input type="tel" name="phone" value="${user.phone || ''}">
                    </div>
                    
                    <div class="form-group">
                        <label>Member Since</label>
                        <input type="text" value="${new Date(user.created_at).toLocaleDateString()}" disabled>
                    </div>
                    
                    <button type="submit" class="btn-submit">Update Profile</button>
                </form>
            </div>
        `;
        
        document.getElementById('profileForm')?.addEventListener('submit', updateProfile);
    } catch (error) {
        console.error('Error loading profile:', error);
    }
}

async function updateProfile(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const profileData = {
        full_name: formData.get('full_name'),
        phone: formData.get('phone')
    };
    
    try {
        const response = await fetch(`${API_BASE_URL}/profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(profileData)
        });
        
        if (response.ok) {
            showToast('Profile updated successfully!');
            // Update local storage
            if (currentUser) {
                currentUser.full_name = profileData.full_name;
                localStorage.setItem('user', JSON.stringify(currentUser));
                document.getElementById('userName').textContent = currentUser.full_name;
            }
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Error updating profile:', error);
        showToast('Network error', 'error');
    }
}

// ========================================
// BOOKING MODAL
// ========================================

function showBookingModal(tourId, tourName, tourPrice) {
    const modal = document.getElementById('bookingModal');
    if (!modal) return;
    
    document.getElementById('bookingTourId').value = tourId;
    document.getElementById('bookingTourName').textContent = tourName;
    document.getElementById('bookingPrice').textContent = `$${tourPrice}`;
    document.getElementById('totalPrice').textContent = `$${tourPrice}`;
    
    modal.classList.add('active');
}

function closeBookingModal() {
    const modal = document.getElementById('bookingModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function updateTotalPrice() {
    const travelers = document.getElementById('travelers').value;
    const price = parseFloat(document.getElementById('bookingPrice').textContent.replace('$', ''));
    const total = price * travelers;
    document.getElementById('totalPrice').textContent = `$${total}`;
}

async function confirmBooking() {
    const tourId = document.getElementById('bookingTourId').value;
    const travelers = parseInt(document.getElementById('travelers').value);
    const bookingDate = document.getElementById('bookingDate').value;
    const specialRequests = document.getElementById('specialRequests').value;
    const totalPrice = parseFloat(document.getElementById('totalPrice').textContent.replace('$', ''));
    
    if (!bookingDate) {
        showToast('Please select a booking date', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/bookings`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                tour_id: parseInt(tourId),
                travelers: travelers,
                booking_date: bookingDate,
                total_price: totalPrice,
                special_requests: specialRequests
            })
        });
        
        if (response.ok) {
            showToast('Booking confirmed successfully!');
            closeBookingModal();
            navigateToSection('bookings');
        } else {
            const data = await response.json();
            showToast(data.error || 'Booking failed', 'error');
        }
    } catch (error) {
        console.error('Error creating booking:', error);
        showToast('Network error', 'error');
    }
}

// ========================================
// REVIEW MODAL
// ========================================

function showReviewModal(tourId, tourName) {
    const modal = document.getElementById('reviewModal');
    if (!modal) return;
    
    document.getElementById('reviewTourId').value = tourId;
    document.getElementById('reviewTourName').textContent = tourName;
    
    modal.classList.add('active');
}

function closeReviewModal() {
    const modal = document.getElementById('reviewModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

function setRating(rating) {
    const stars = document.querySelectorAll('.rating-star');
    stars.forEach((star, index) => {
        if (index < rating) {
            star.classList.add('active');
        } else {
            star.classList.remove('active');
        }
    });
    document.getElementById('ratingValue').value = rating;
}

async function submitReview() {
    const tourId = document.getElementById('reviewTourId').value;
    const rating = document.getElementById('ratingValue').value;
    const comment = document.getElementById('reviewComment').value;
    
    if (!rating || rating === '0') {
        showToast('Please select a rating', 'error');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/reviews`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                tour_id: parseInt(tourId),
                rating: parseInt(rating),
                comment: comment
            })
        });
        
        if (response.ok) {
            showToast('Review submitted successfully!');
            closeReviewModal();
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to submit review', 'error');
        }
    } catch (error) {
        console.error('Error submitting review:', error);
        showToast('Network error', 'error');
    }
}

// ========================================
// RENDER FUNCTIONS
// ========================================

function renderTourCard(tour) {
    const stars = '★'.repeat(Math.floor(tour.rating || 0)) + '☆'.repeat(5 - Math.floor(tour.rating || 0));
    
    return `
        <div class="tour-card">
            <div class="tour-image">
                <img src="${tour.image_url || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e'}" alt="${tour.name}">
            </div>
            <div class="tour-info">
                <h3 class="tour-title">${tour.name}</h3>
                <div class="tour-destination">
                    <i class="fas fa-map-marker-alt"></i>
                    <span>${tour.destination}</span>
                </div>
                <div class="tour-rating">
                    <div class="stars">${stars}</div>
                    <span>(${tour.rating || 0})</span>
                </div>
                <p>${tour.description?.substring(0, 100)}...</p>
                <div class="tour-price">$${tour.price} <span>/ person</span></div>
                <div class="tour-actions">
                    <button class="btn-view" onclick="showTourDetails(${tour.id})">View Details</button>
                    <button class="btn-edit" onclick="showBookingModal(${tour.id}, '${tour.name}', ${tour.price})">Book Now</button>
                </div>
            </div>
        </div>
    `;
}

function renderBookingCard(booking) {
    const statusColors = {
        pending: '#f59e0b',
        confirmed: '#10b981',
        completed: '#6366f1',
        cancelled: '#ef4444'
    };
    
    return `
        <div class="booking-card" data-status="${booking.status}">
            <div class="booking-image">
                <img src="${booking.image_url || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e'}" alt="${booking.tour_name}">
            </div>
            <div class="booking-info">
                <h3>${booking.tour_name}</h3>
                <p><i class="fas fa-map-marker-alt"></i> ${booking.destination}</p>
                <p><i class="fas fa-calendar"></i> ${new Date(booking.booking_date).toLocaleDateString()}</p>
                <p><i class="fas fa-users"></i> ${booking.travelers} travelers</p>
                <p><i class="fas fa-tag"></i> $${booking.total_price}</p>
                <span class="booking-status" style="background: ${statusColors[booking.status]}">${booking.status.toUpperCase()}</span>
            </div>
        </div>
    `;
}

function showTourDetails(tourId) {
    // Implement tour details modal or page
    showToast('Tour details feature coming soon!');
}

function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    window.location.href = '/';
}

function showToast(message, type = 'success') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `
        <i class="fas ${type === 'success' ? 'fa-check-circle' : 'fa-exclamation-circle'}"></i>
        <span>${message}</span>
    `;
    document.body.appendChild(toast);
    
    setTimeout(() => {
        toast.remove();
    }, 3000);
}