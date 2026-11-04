-- Create Database
CREATE DATABASE IF NOT EXISTS tour_recommendation_db;
USE tour_recommendation_db;

-- Users Table
CREATE TABLE IF NOT EXISTS users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('user', 'admin') DEFAULT 'user',
    phone VARCHAR(20),
    profile_picture VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_role (role)
);

-- User Preferences Table
CREATE TABLE IF NOT EXISTS user_preferences (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    budget_range ENUM('budget', 'medium', 'luxury') DEFAULT 'medium',
    preferred_destinations TEXT,
    interests VARCHAR(255),
    travel_style ENUM('adventure', 'relaxation', 'cultural', 'family', 'general') DEFAULT 'general',
    preferred_season VARCHAR(50),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_pref (user_id)
);

-- Tours Table
CREATE TABLE IF NOT EXISTS tours (
    id INT PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(200) NOT NULL,
    destination VARCHAR(100) NOT NULL,
    description TEXT,
    price DECIMAL(10, 2) NOT NULL,
    duration_days INT NOT NULL,
    image_url VARCHAR(500),
    category VARCHAR(50),
    rating DECIMAL(3, 1) DEFAULT 0,
    highlights TEXT,
    included TEXT,
    excluded TEXT,
    availability INT DEFAULT 10,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_destination (destination),
    INDEX idx_category (category),
    INDEX idx_price (price)
);

-- Bookings Table
CREATE TABLE IF NOT EXISTS bookings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    tour_id INT NOT NULL,
    booking_date DATE NOT NULL,
    travelers INT DEFAULT 1,
    total_price DECIMAL(10, 2) NOT NULL,
    status ENUM('pending', 'confirmed', 'cancelled', 'completed') DEFAULT 'pending',
    special_requests TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
    INDEX idx_user (user_id),
    INDEX idx_status (status)
);

-- Reviews Table
CREATE TABLE IF NOT EXISTS reviews (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    tour_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_tour_review (user_id, tour_id),
    INDEX idx_tour (tour_id)
);

-- Insert Sample Tours
INSERT INTO tours (name, destination, description, price, duration_days, image_url, category, rating, highlights, included, excluded, availability) VALUES
('Maasai Mara Safari Adventure', 'Maasai Mara', 'Experience the wonder of the Great Migration in Maasai Mara National Reserve. See the Big Five and witness nature\'s greatest spectacle.', 850.00, 3, 'https://images.unsplash.com/photo-1516426122078-c23e76319801', 'adventure', 4.8, 'Game drives, Sunset viewing, Cultural visit', 'Park fees, Accommodation, Meals, Transport', 'International flights, Visa fees, Personal items', 15),

('Lake Nakuru Bird Watching', 'Lake Nakuru', 'Discover thousands of flamingos and other bird species at Lake Nakuru National Park. Also home to rhinos and lions.', 450.00, 2, 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e', 'nature', 4.5, 'Bird watching, Rhino sanctuary, Photography', 'Park fees, Guide, Lunch', 'Transport to park, Personal expenses', 20),

('Hell\'s Gate Cycling Adventure', 'Hell\'s Gate', 'Cycle through stunning gorges and spot zebras and giraffes in Hell\'s Gate National Park. Enjoy natural hot springs.', 120.00, 1, 'https://images.unsplash.com/photo-1551632811-561732d1e306', 'adventure', 4.3, 'Cycling, Rock climbing, Hot springs', 'Bike rental, Park fees, Guide', 'Personal items, Tips', 30),

('Mount Longonot Hiking', 'Mount Longonot', 'Hike to the rim of an extinct volcano with breathtaking views of Lake Naivasha and the Great Rift Valley.', 95.00, 1, 'https://images.unsplash.com/photo-1551632811-561732d1e306', 'adventure', 4.6, 'Volcano crater hike, Scenic views, Photography', 'Park fees, Guide', 'Transport, Meals', 25),

('Lake Naivasha Boat Ride', 'Lake Naivasha', 'Enjoy a peaceful boat ride on Lake Naivasha, home to hippos and over 400 bird species. Visit Crescent Island.', 80.00, 1, 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e', 'relaxation', 4.4, 'Boat safari, Hippo viewing, Bird watching', 'Boat ride, Guide', 'Park fees, Transport', 35),

('Nakuru City Cultural Tour', 'Nakuru City', 'Explore the vibrant culture and history of Nakuru City. Visit local markets, art galleries, and historical sites.', 150.00, 1, 'https://images.unsplash.com/photo-1533105079780-92b9be482077', 'cultural', 4.2, 'City tour, Market visit, Local cuisine', 'Guide, Transport, Lunch', 'Personal shopping, Tips', 20),

('Menengai Crater Hike', 'Menengai Crater', 'Hike to one of the largest calderas in the world. Enjoy panoramic views of the Rift Valley from the viewpoint.', 75.00, 1, 'https://images.unsplash.com/photo-1551632811-561732d1e306', 'adventure', 4.5, 'Crater hike, Scenic views, Photography', 'Guide, Park fees', 'Transport, Meals', 30),

('Elementaita Hot Springs', 'Lake Elementaita', 'Relax in natural hot springs and enjoy the alkaline lake known for its flamingos and pelicans.', 110.00, 1, 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e', 'relaxation', 4.3, 'Hot springs, Bird watching, Photography', 'Hot springs entry, Guide', 'Transport, Meals', 25),

('Hyrax Hill Museum Tour', 'Nakuru', 'Visit the prehistoric archaeological site of Hyrax Hill. Learn about early human settlements in the region.', 60.00, 1, 'https://images.unsplash.com/photo-1533105079780-92b9be482077', 'cultural', 4.1, 'Museum tour, Archaeological site, History', 'Entry fee, Guide', 'Transport, Personal items', 40),

('Kariandusi Prehistoric Site', 'Kariandusi', 'Explore one of Kenya\'s most important archaeological sites. See stone tools and fossils from the Acheulian period.', 70.00, 1, 'https://images.unsplash.com/photo-1533105079780-92b9be482077', 'cultural', 4.0, 'Archaeological tour, Museum, History', 'Entry fee, Guide', 'Transport, Meals', 30);

-- Insert Admin User (password: admin123)
INSERT INTO users (full_name, email, password, role, phone) VALUES 
('Kenya Guide Admin', 'admin@kenyaguide.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPjFjJQz4hY.S', 'admin', '+254700000000');

-- Insert Sample User (password: user123)
INSERT INTO users (full_name, email, password, role, phone) VALUES 
('John Doe', 'john@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPjFjJQz4hY.S', 'user', '+254711111111');