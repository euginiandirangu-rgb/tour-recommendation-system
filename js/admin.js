// ========================================
// TOUR RECOMMENDATION SYSTEM - ADMIN DASHBOARD
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
    loadDashboard();
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
        if (currentUser.role !== 'admin') {
            window.location.href = '/user.html';
            return;
        }
        document.getElementById('adminName').textContent = currentUser.full_name;
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
    
    // Tour form
    document.getElementById('tourForm')?.addEventListener('submit', saveTour);
}

function navigateToSection(section) {
    currentSection = section;
    
    // Update active state
    document.querySelectorAll('.sidebar-nav a').forEach(link => {
        link.classList.remove('active');
        if (link.dataset.section === section) {
            link.classList.add('active');
        }
    });
    
    // Load section content
    switch(section) {
        case 'dashboard':
            loadDashboard();
            break;
        case 'tours':
            loadTours();
            break;
        case 'users':
            loadUsers();
            break;
        case 'bookings':
            loadAllBookings();
            break;
        case 'add-tour':
            showAddTourForm();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// ========================================
// DASHBOARD
// ========================================

async function loadDashboard() {
    const container = document.getElementById('mainContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="dashboard-header">
            <h1>Admin Dashboard</h1>
            <p>Welcome back, ${currentUser?.full_name}</p>
        </div>
        
        <div class="stats-grid" id="statsGrid">
            <div class="loading"><div class="spinner"></div></div>
        </div>
        
        <div class="section-header">
            <h2>Popular Tours</h2>
            <p>Most booked tours this month</p>
        </div>
        
        <div id="popularTours" class="tours-grid">
            <div class="loading"><div class="spinner"></div></div>
        </div>
    `;
    
    await loadStats();
    await loadPopularTours();
}

async function loadStats() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        const container = document.getElementById('statsGrid');
        
        if (container) {
            container.innerHTML = `
                <div class="stat-card">
                    <div class="stat-info">
                        <h3>Total Users</h3>
                        <div class="stat-number">${data.total_users || 0}</div>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-users"></i>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-info">
                        <h3>Total Tours</h3>
                        <div class="stat-number">${data.total_tours || 0}</div>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-map-marked-alt"></i>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-info">
                        <h3>Total Bookings</h3>
                        <div class="stat-number">${data.total_bookings || 0}</div>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-ticket-alt"></i>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-info">
                        <h3>Total Revenue</h3>
                        <div class="stat-number">$${data.total_revenue || 0}</div>
                    </div>
                    <div class="stat-icon">
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

async function loadPopularTours() {
    try {
        const response = await fetch(`${API_BASE_URL}/tours?limit=6`);
        const data = await response.json();
        const container = document.getElementById('popularTours');
        
        if (container && data.tours) {
            container.innerHTML = data.tours.map(tour => renderAdminTourCard(tour)).join('');
        }
    } catch (error) {
        console.error('Error loading popular tours:', error);
    }
}

// ========================================
// TOURS MANAGEMENT
// ========================================

async function loadTours() {
    const container = document.getElementById('mainContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="dashboard-header">
            <h1>Manage Tours</h1>
            <p>Add, edit, or remove tour packages</p>
            <button class="btn-primary mt-4" onclick="navigateToSection('add-tour')">
                <i class="fas fa-plus"></i> Add New Tour
            </button>
        </div>
        
        <div class="filters">
            <input type="text" id="searchTours" placeholder="Search tours..." onkeyup="searchAdminTours(this.value)">
            <select id="filterCategory" onchange="filterAdminTours(this.value)">
                <option value="">All Categories</option>
                <option value="adventure">Adventure</option>
                <option value="nature">Nature</option>
                <option value="cultural">Cultural</option>
                <option value="relaxation">Relaxation</option>
            </select>
        </div>
        
        <div id="toursList" class="tours-grid">
            <div class="loading"><div class="spinner"></div></div>
        </div>
    `;
    
    await fetchAllToursForAdmin();
}

async function fetchAllToursForAdmin() {
    try {
        const response = await fetch(`${API_BASE_URL}/tours`);
        const data = await response.json();
        const container = document.getElementById('toursList');
        
        if (container && data.tours) {
            if (data.tours.length === 0) {
                container.innerHTML = '<p class="text-center">No tours found. Click "Add New Tour" to create one.</p>';
            } else {
                container.innerHTML = data.tours.map(tour => renderAdminTourCard(tour)).join('');
            }
        }
    } catch (error) {
        console.error('Error fetching tours:', error);
    }
}

function searchAdminTours(query) {
    const cards = document.querySelectorAll('.tour-card');
    cards.forEach(card => {
        const title = card.querySelector('.tour-title')?.textContent.toLowerCase();
        if (title?.includes(query.toLowerCase())) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function filterAdminTours(category) {
    const cards = document.querySelectorAll('.tour-card');
    cards.forEach(card => {
        if (!category || card.dataset.category === category) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
}

function showAddTourForm() {
    const container = document.getElementById('mainContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="dashboard-header">
            <h1>${currentEditingTourId ? 'Edit Tour' : 'Add New Tour'}</h1>
            <p>${currentEditingTourId ? 'Update tour information' : 'Create a new tour package'}</p>
        </div>
        
        <div class="form-container">
            <form id="tourForm">
                <div class="form-row">
                    <div class="form-group">
                        <label>Tour Name *</label>
                        <input type="text" name="name" id="tourName" required>
                    </div>
                    <div class="form-group">
                        <label>Destination *</label>
                        <input type="text" name="destination" id="tourDestination" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Price (USD) *</label>
                        <input type="number" step="0.01" name="price" id="tourPrice" required>
                    </div>
                    <div class="form-group">
                        <label>Duration (Days) *</label>
                        <input type="number" name="duration_days" id="tourDuration" required>
                    </div>
                </div>
                
                <div class="form-row">
                    <div class="form-group">
                        <label>Category *</label>
                        <select name="category" id="tourCategory" required>
                            <option value="">Select Category</option>
                            <option value="adventure">Adventure</option>
                            <option value="nature">Nature</option>
                            <option value="cultural">Cultural</option>
                            <option value="relaxation">Relaxation</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Rating</label>
                        <input type="number" step="0.1" name="rating" id="tourRating" value="0">
                    </div>
                </div>
                
                <div class="form-group">
                    <label>Image URL</label>
                    <input type="url" name="image_url" id="tourImage" placeholder="https://example.com/image.jpg">
                </div>
                
                <div class="form-group">
                    <label>Description *</label>
                    <textarea name="description" id="tourDescription" rows="4" required></textarea>
                </div>
                
                <div class="form-group">
                    <label>Highlights</label>
                    <textarea name="highlights" id="tourHighlights" rows="3" placeholder="Separate highlights with commas"></textarea>
                </div>
                
                <div class="form-group">
                    <label>Included</label>
                    <textarea name="included" id="tourIncluded" rows="3" placeholder="What's included in the tour"></textarea>
                </div>
                
                <div class="form-group">
                    <label>Excluded</label>
                    <textarea name="excluded" id="tourExcluded" rows="3" placeholder="What's not included"></textarea>
                </div>
                
                <div class="form-group">
                    <label>Availability</label>
                    <input type="number" name="availability" id="tourAvailability" value="10">
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn-submit">${currentEditingTourId ? 'Update Tour' : 'Create Tour'}</button>
                    <button type="button" class="btn-secondary" onclick="navigateToSection('tours')">Cancel</button>
                </div>
            </form>
        </div>
    `;
    
    if (currentEditingTourId) {
        loadTourForEditing(currentEditingTourId);
    }
    
    document.getElementById('tourForm')?.addEventListener('submit', saveTour);
}

let currentEditingTourId = null;

async function editTour(tourId) {
    currentEditingTourId = tourId;
    navigateToSection('add-tour');
}

async function loadTourForEditing(tourId) {
    try {
        const response = await fetch(`${API_BASE_URL}/tours/${tourId}`);
        const data = await response.json();
        const tour = data.tour;
        
        if (tour) {
            document.getElementById('tourName').value = tour.name || '';
            document.getElementById('tourDestination').value = tour.destination || '';
            document.getElementById('tourPrice').value = tour.price || '';
            document.getElementById('tourDuration').value = tour.duration_days || '';
            document.getElementById('tourCategory').value = tour.category || '';
            document.getElementById('tourRating').value = tour.rating || 0;
            document.getElementById('tourImage').value = tour.image_url || '';
            document.getElementById('tourDescription').value = tour.description || '';
            document.getElementById('tourHighlights').value = tour.highlights || '';
            document.getElementById('tourIncluded').value = tour.included || '';
            document.getElementById('tourExcluded').value = tour.excluded || '';
            document.getElementById('tourAvailability').value = tour.availability || 10;
        }
    } catch (error) {
        console.error('Error loading tour for editing:', error);
        showToast('Error loading tour data', 'error');
    }
}

async function saveTour(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const tourData = {
        name: formData.get('name'),
        destination: formData.get('destination'),
        price: parseFloat(formData.get('price')),
        duration_days: parseInt(formData.get('duration_days')),
        category: formData.get('category'),
        rating: parseFloat(formData.get('rating')) || 0,
        image_url: formData.get('image_url'),
        description: formData.get('description'),
        highlights: formData.get('highlights'),
        included: formData.get('included'),
        excluded: formData.get('excluded'),
        availability: parseInt(formData.get('availability')) || 10
    };
    
    try {
        let url = `${API_BASE_URL}/tours`;
        let method = 'POST';
        
        if (currentEditingTourId) {
            url = `${API_BASE_URL}/tours/${currentEditingTourId}`;
            method = 'PUT';
        }
        
        const response = await fetch(url, {
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify(tourData)
        });
        
        if (response.ok) {
            showToast(currentEditingTourId ? 'Tour updated successfully!' : 'Tour created successfully!');
            currentEditingTourId = null;
            navigateToSection('tours');
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to save tour', 'error');
        }
    } catch (error) {
        console.error('Error saving tour:', error);
        showToast('Network error', 'error');
    }
}

async function deleteTour(tourId) {
    if (!confirm('Are you sure you want to delete this tour? This action cannot be undone.')) {
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/tours/${tourId}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            showToast('Tour deleted successfully');
            loadTours();
        } else {
            const data = await response.json();
            showToast(data.error || 'Failed to delete tour', 'error');
        }
    } catch (error) {
        console.error('Error deleting tour:', error);
        showToast('Network error', 'error');
    }
}

// ========================================
// USERS MANAGEMENT
// ========================================

async function loadUsers() {
    const container = document.getElementById('mainContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="dashboard-header">
            <h1>Manage Users</h1>
            <p>View and manage system users</p>
        </div>
        
        <div class="filters">
            <input type="text" id="searchUsers" placeholder="Search users..." onkeyup="searchUsers(this.value)">
        </div>
        
        <div id="usersList">
            <div class="loading"><div class="spinner"></div></div>
        </div>
    `;
    
    await fetchAllUsers();
}

async function fetchAllUsers() {
    try {
        const response = await fetch(`${API_BASE_URL}/admin/users`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });
        
        const data = await response.json();
        const container = document.getElementById('usersList');
        
        if (container && data.users) {
            if (data.users.length === 0) {
                container.innerHTML = '<p class="text-center">No users found.</p>';
            } else {
                container.innerHTML = `
                    <table class="data-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Role</th>
                                <th>Phone</th>
                                <th>Joined</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${data.users.map(user => `
                                <tr>
                                    <td>${user.id}</td>
                                    <td>${user.full_name}</td>
                                    <td>${user.email}</td>
                                    <td><span class="role-badge ${user.role}">${user.role}</span></td>
                                    <td>${user.phone || '-'}</td>
                                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                `;
            }
        }
    } catch (error) {
        console.error('Error fetching users:', error);
    }
}

function searchUsers(query) {
    const rows = document.querySelectorAll('.data-table tbody tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        if (text.includes(query.toLowerCase())) {
            row.style.display = '';
        } else {
            row.style.display = 'none';
        }
    });
}

// ========================================
// BOOKINGS MANAGEMENT
// ========================================

async function loadAllBookings() {
    // For admin, we would need a separate endpoint to get all bookings
    // For now, showing a placeholder
    const container = document.getElementById('mainContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="dashboard-header">
            <h1>All Bookings</h1>
            <p>View and manage all customer bookings</p>
        </div>
        
        <div class="filters">
            <select id="filterBookingStatus" onchange="filterAllBookings(this.value)">
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="confirmed">Confirmed</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
            </select>
        </div>
        
        <div id="allBookingsList">
            <div class="loading"><div class="spinner"></div></div>
        </div>
    `;
    
    // For demo, show placeholder
    document.getElementById('allBookingsList').innerHTML = `
        <div class="text-center">
            <p>Booking management feature coming soon.</p>
        </div>
    `;
}

function filterAllBookings(status) {
    // Implement filtering
}

// ========================================
// SETTINGS
// ========================================

function loadSettings() {
    const container = document.getElementById('mainContent');
    if (!container) return;
    
    container.innerHTML = `
        <div class="dashboard-header">
            <h1>System Settings</h1>
            <p>Configure system preferences</p>
        </div>
        
        <div class="settings-container">
            <div class="settings-section">
                <h3>General Settings</h3>
                <form id="settingsForm">
                    <div class="form-group">
                        <label>System Name</label>
                        <input type="text" value="TourGuide Recommendation System">
                    </div>
                    <div class="form-group">
                        <label>Contact Email</label>
                        <input type="email" value="admin@tourguide.com">
                    </div>
                    <div class="form-group">
                        <label>Currency</label>
                        <select>
                            <option>USD ($)</option>
                            <option>EUR (€)</option>
                            <option>GBP (£)</option>
                            <option>KES (KSh)</option>
                        </select>
                    </div>
                    <button type="submit" class="btn-submit">Save Settings</button>
                </form>
            </div>
            
            <div class="settings-section">
                <h3>API Configuration</h3>
                <form>
                    <div class="form-group">
                        <label>Weather API Key</label>
                        <input type="password" placeholder="Enter API key">
                    </div>
                    <div class="form-group">
                        <label>Maps API Key</label>
                        <input type="password" placeholder="Enter API key">
                    </div>
                    <button type="submit" class="btn-submit">Save API Keys</button>
                </form>
            </div>
        </div>
    `;
}

// ========================================
// RENDER FUNCTIONS
// ========================================

function renderAdminTourCard(tour) {
    const stars = '★'.repeat(Math.floor(tour.rating || 0)) + '☆'.repeat(5 - Math.floor(tour.rating || 0));
    
    return `
        <div class="tour-card" data-category="${tour.category}">
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
                <div class="tour-availability">
                    <i class="fas fa-calendar-check"></i> ${tour.availability} spots left
                </div>
                <div class="tour-actions">
                    <button class="btn-edit" onclick="editTour(${tour.id})">Edit</button>
                    <button class="btn-delete" onclick="deleteTour(${tour.id})">Delete</button>
                </div>
            </div>
        </div>
    `;
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