// ========================================
// TOUR RECOMMENDATION SYSTEM - MAIN JS
// ========================================

// API Configuration
const API_BASE_URL = 'http://localhost:5000/api';

// Global Variables
let currentUser = null;
let authToken = localStorage.getItem('access_token');

// ========================================
// UTILITY FUNCTIONS
// ========================================

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

function showLoading(element) {
    element.innerHTML = '<div class="loading"><div class="spinner"></div></div>';
}

function hideLoading(element) {
    // Remove loading spinner
}

// ========================================
// AUTHENTICATION FUNCTIONS
// ========================================

async function login(email, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            authToken = data.access_token;
            currentUser = data.user;
            
            showToast('Login successful!');
            
            // Redirect based on role
            setTimeout(() => {
                if (data.user.role === 'admin') {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/user.html';
                }
            }, 1000);
        } else {
            showToast(data.error || 'Login failed', 'error');
        }
    } catch (error) {
        console.error('Login error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

async function register(userData) {
    try {
        const response = await fetch(`${API_BASE_URL}/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(userData)
        });
        
        const data = await response.json();
        
        if (response.ok) {
            localStorage.setItem('access_token', data.access_token);
            localStorage.setItem('user', JSON.stringify(data.user));
            authToken = data.access_token;
            currentUser = data.user;
            
            showToast('Registration successful!');
            
            setTimeout(() => {
                if (data.user.role === 'admin') {
                    window.location.href = '/admin.html';
                } else {
                    window.location.href = '/user.html';
                }
            }, 1000);
        } else {
            showToast(data.error || 'Registration failed', 'error');
        }
    } catch (error) {
        console.error('Registration error:', error);
        showToast('Network error. Please try again.', 'error');
    }
}

function logout() {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    authToken = null;
    currentUser = null;
    showToast('Logged out successfully');
    setTimeout(() => {
        window.location.href = '/';
    }, 1000);
}

// ========================================
// MODAL FUNCTIONS
// ========================================

function showLoginModal() {
    const modal = document.getElementById('loginModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function showRegisterModal() {
    const modal = document.getElementById('registerModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
}

// ========================================
// FORM HANDLERS
// ========================================

function handleLogin(event) {
    event.preventDefault();
    const email = document.getElementById('loginEmail').value;
    const password = document.getElementById('loginPassword').value;
    login(email, password);
}

function handleRegister(event) {
    event.preventDefault();
    const userData = {
        full_name: document.getElementById('regFullName').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value,
        phone: document.getElementById('regPhone').value,
        role: 'user'
    };
    
    const confirmPassword = document.getElementById('regConfirmPassword').value;
    if (userData.password !== confirmPassword) {
        showToast('Passwords do not match', 'error');
        return;
    }
    
    register(userData);
}

// ========================================
// DESTINATION FUNCTIONS
// ========================================

async function loadPopularDestinations() {
    try {
        const response = await fetch(`${API_BASE_URL}/tours?limit=6`);
        const data = await response.json();
        
        const container = document.getElementById('destinationsGrid');
        if (container && data.tours) {
            container.innerHTML = data.tours.map(tour => `
                <div class="destination-card">
                    <div class="destination-image">
                        <img src="${tour.image_url || 'https://images.unsplash.com/photo-1469474968028-56623f02e42e'}" alt="${tour.name}">
                    </div>
                    <div class="destination-content">
                        <h3>${tour.name}</h3>
                        <div class="destination-location">
                            <i class="fas fa-map-marker-alt"></i>
                            <span>${tour.destination}</span>
                        </div>
                        <p class="destination-description">${tour.description.substring(0, 100)}...</p>
                        <div class="destination-price">
                            $${tour.price} <span>per person</span>
                        </div>
                        <button class="btn-book" onclick="viewTourDetails(${tour.id})">View Details</button>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading destinations:', error);
    }
}

function viewTourDetails(tourId) {
    if (!authToken) {
        showToast('Please login to view tour details', 'error');
        showLoginModal();
        return;
    }
    window.location.href = `/user.html?tour=${tourId}`;
}

// ========================================
// SCROLL FUNCTIONS
// ========================================

function scrollToFeatures() {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
}

function scrollToDestinations() {
    document.getElementById('destinations')?.scrollIntoView({ behavior: 'smooth' });
}

// ========================================
// CHECK AUTH STATUS
// ========================================

function checkAuthStatus() {
    if (authToken && localStorage.getItem('user')) {
        currentUser = JSON.parse(localStorage.getItem('user'));
        // Update UI for logged in user
        const navButtons = document.querySelector('.nav-buttons');
        if (navButtons && currentUser) {
            navButtons.innerHTML = `
                <span style="color: white; display: flex; align-items: center; gap: 10px;">
                    <i class="fas fa-user-circle"></i>
                    Welcome, ${currentUser.full_name.split(' ')[0]}
                </span>
                <button class="btn-login" onclick="logout()">Logout</button>
            `;
        }
    }
}

// ========================================
// INITIALIZATION
// ========================================

document.addEventListener('DOMContentLoaded', () => {
    checkAuthStatus();
    loadPopularDestinations();
    
    // Close modals when clicking outside
    window.onclick = (event) => {
        if (event.target.classList.contains('modal')) {
            event.target.classList.remove('active');
        }
    };
});