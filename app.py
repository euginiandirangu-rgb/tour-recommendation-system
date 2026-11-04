import pymysql
pymysql.install_as_MySQLdb()

from flask import Flask, jsonify, request, render_template
from flask_cors import CORS
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity
from datetime import timedelta, datetime
import os
import time
import bcrypt
import MySQLdb
import MySQLdb.cursors
from dotenv import load_dotenv
import traceback
load_dotenv()

app = Flask(__name__, template_folder='templates')

# Configuration
app.config['MYSQL_HOST'] = os.getenv('MYSQL_HOST', 'localhost')
app.config['MYSQL_USER'] = os.getenv('MYSQL_USER', 'root')
app.config['MYSQL_PASSWORD'] = os.getenv('MYSQL_PASSWORD', '')
app.config['MYSQL_DATABASE'] = os.getenv('MYSQL_DATABASE', 'kenya_tour_db')
app.config['MYSQL_PORT'] = int(os.getenv('MYSQL_PORT', 3306))
app.config['JWT_SECRET_KEY'] = 'super-secret-key-change-this-12345'
app.config['JWT_ACCESS_TOKEN_EXPIRES'] = timedelta(hours=24)
app.config['ADMIN_EMAIL'] = os.getenv('ADMIN_EMAIL', 'admin@kenyaguide.com')
app.config['ADMIN_PASSWORD'] = os.getenv('ADMIN_PASSWORD', 'admin123')
app.config['RESET_ADMIN_PASSWORD_ON_STARTUP'] = os.getenv('RESET_ADMIN_PASSWORD_ON_STARTUP', 'false').lower() in ('1', 'true', 'yes')

# CORS - allow all for testing
CORS(app, supports_credentials=True, origins='*')

jwt = JWTManager(app)

# ========================================
# DATABASE CONNECTION
# ========================================

def get_db_connection():
    """Get MySQL database connection"""
    try:
        return MySQLdb.connect(
            host=app.config['MYSQL_HOST'],
            user=app.config['MYSQL_USER'],
            passwd=app.config['MYSQL_PASSWORD'],
            db=app.config['MYSQL_DATABASE'],
            port=app.config['MYSQL_PORT'],
            cursorclass=MySQLdb.cursors.DictCursor,
            autocommit=True,
            charset='utf8mb4'
        )
    except MySQLdb.OperationalError as e:
        print(f"❌ MySQL Connection Error: {e}")
        print(f"   Host: {app.config['MYSQL_HOST']}")
        print(f"   User: {app.config['MYSQL_USER']}")
        print(f"   Database: {app.config['MYSQL_DATABASE']}")
        print(f"   Port: {app.config['MYSQL_PORT']}")
        raise

def create_database_if_not_exists():
    """Create database if it doesn't exist"""
    try:
        # Connect without database selection
        conn = MySQLdb.connect(
            host=app.config['MYSQL_HOST'],
            user=app.config['MYSQL_USER'],
            passwd=app.config['MYSQL_PASSWORD'],
            port=app.config['MYSQL_PORT']
        )
        cursor = conn.cursor()
        
        # Create database if it doesn't exist
        cursor.execute(f"""
            CREATE DATABASE IF NOT EXISTS {app.config['MYSQL_DATABASE']} 
            CHARACTER SET utf8mb4 
            COLLATE utf8mb4_unicode_ci
        """)
        
        cursor.close()
        conn.close()
        print(f"✅ Database '{app.config['MYSQL_DATABASE']}' created or already exists")
        return True
    except MySQLdb.OperationalError as e:
        print(f"❌ Error creating database: {e}")
        print("   Please make sure MySQL is running and credentials are correct")
        print("   Try: Start MySQL in XAMPP Control Panel")
        return False

# ========================================
# DATABASE INITIALIZATION
# ========================================

def ensure_admin_user(cursor):
    """Create the admin account if missing, and only reset its password when explicitly requested."""
    admin_email = app.config['ADMIN_EMAIL']
    admin_password = app.config['ADMIN_PASSWORD']
    reset_password = app.config['RESET_ADMIN_PASSWORD_ON_STARTUP']

    cursor.execute("SELECT id, email, password FROM users WHERE role = 'admin' ORDER BY id LIMIT 1")
    admin_user = cursor.fetchone()
    hashed = bcrypt.hashpw(admin_password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

    if admin_user:
        if reset_password:
            cursor.execute(
                "UPDATE users SET password = %s, email = %s WHERE id = %s",
                (hashed, admin_email, admin_user['id'])
            )
            print(f"✅ Admin password reset for {admin_email}")
        else:
            print(f"✅ Existing admin account preserved for {admin_user['email']}")
    else:
        cursor.execute(
            """
            INSERT INTO users (full_name, email, password, role, phone)
            VALUES (%s, %s, %s, %s, %s)
            """,
            ('Kenya Guide Admin', admin_email, hashed, 'admin', '+254 700 000 000')
        )
        print(f"✅ Admin account created for {admin_email}")

    return admin_email, admin_password


def init_database():
    """Initialize database tables and sample data"""
    try:
        db = get_db_connection()
        cursor = db.cursor()
        
        # Create users table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS users (
                id INT PRIMARY KEY AUTO_INCREMENT,
                full_name VARCHAR(255) NOT NULL,
                email VARCHAR(255) UNIQUE NOT NULL,
                password VARCHAR(255) NOT NULL,
                role ENUM('user', 'admin') DEFAULT 'user',
                phone VARCHAR(50),
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ users table ready")
        
        # Create tours table with Kenyan destinations
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS tours (
                id INT PRIMARY KEY AUTO_INCREMENT,
                name VARCHAR(255) NOT NULL,
                destination VARCHAR(255) NOT NULL,
                description TEXT,
                price DECIMAL(12, 2) NOT NULL,
                duration_days INT NOT NULL,
                image_url TEXT,
                category VARCHAR(100),
                rating DECIMAL(3, 1) DEFAULT 0,
                highlights TEXT,
                included TEXT,
                excluded TEXT,
                availability INT DEFAULT 10,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        print("✅ tours table ready")
        
        # Create bookings table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS bookings (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                tour_id INT NOT NULL,
                booking_date DATE NOT NULL,
                travelers INT DEFAULT 1,
                total_price DECIMAL(12, 2) NOT NULL,
                status ENUM('pending', 'confirmed', 'completed', 'cancelled') DEFAULT 'pending',
                special_requests TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
            )
        """)
        print("✅ bookings table ready")
        
        # Create reviews table
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS reviews (
                id INT PRIMARY KEY AUTO_INCREMENT,
                user_id INT NOT NULL,
                tour_id INT NOT NULL,
                rating INT CHECK (rating >= 1 AND rating <= 5),
                comment TEXT,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
            )
        """)
        print("✅ reviews table ready")
        
        # Restore or create the admin account with the configured credentials
        ensure_admin_user(cursor)
        
        # Insert sample Kenyan tours
        cursor.execute("SELECT COUNT(*) as count FROM tours")
        result = cursor.fetchone()
        if result and result['count'] == 0:
            sample_tours = [
                # Kenyan Destinations
                ('Maasai Mara Safari', 'Maasai Mara', 
                 'Witness the Great Migration and see the Big Five in Kenya\'s most famous game reserve. Experience the thrill of a safari with expert guides.', 
                 85000.00, 3, 
                 'https://images.unsplash.com/photo-1516426122078-c23e76319801', 
                 'adventure', 4.9,
                 '🦁 Big Five game drives, 🌅 Sunrise and sunset safaris, 🏕️ Luxury tented camp experience',
                 'Park fees, Safari vehicle, All meals, Professional guide, Bottled water',
                 'International flights, Travel insurance, Personal items, Tips', 15),
                
                ('Lake Nakuru Bird Watching', 'Lake Nakuru', 
                 'Discover the stunning pink flamingos and rhinos at Lake Nakuru National Park. A paradise for bird lovers and wildlife photographers.',
                 45000.00, 2, 
                 'https://images.unsplash.com/photo-1547471080-7cc2caa01a7e', 
                 'nature', 4.7,
                 '🦩 Flamingo watching, 🦏 Rhino sanctuary, 🦒 Giraffe spotting',
                 'Park fees, Safari vehicle, Picnic lunch, Guide service',
                 'Accommodation, Flights, Personal items', 20),
                
                ("Hell's Gate Cycling", "Hell's Gate", 
                 'Cycle through geothermal valleys and spot wildlife in Hell\'s Gate National Park. Enjoy rock climbing and natural hot springs.',
                 12000.00, 1, 
                 'https://images.unsplash.com/photo-1551632811-561732d1e306', 
                 'adventure', 4.5,
                 '🚲 Bike rental, 🌋 Geothermal walks, 🧗 Rock climbing',
                 'Bike rental, Park fees, Guide service',
                 'Transport to park, Meals, Personal items', 25),
                
                ('Diani Beach Escape', 'Diani Beach', 
                 'Relax on pristine white sands and enjoy water sports at Diani Beach. Perfect for beach lovers and water sports enthusiasts.',
                 55000.00, 4, 
                 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e', 
                 'relaxation', 4.8,
                 '🏖️ White sand beaches, 🤿 Snorkeling, 🏄 Water sports',
                 'Beachfront accommodation, Breakfast, Water activities',
                 'Flights, Lunch and dinner, Spa treatments', 12),
                
                ('Amboseli Elephants', 'Amboseli', 
                 'See majestic elephants with Mount Kilimanjaro as the backdrop. One of Kenya\'s most iconic safari experiences.',
                 65000.00, 3, 
                 'https://images.unsplash.com/photo-1549366021-9f761d450615', 
                 'nature', 4.9,
                 '🐘 Elephant herds, 🏔️ Mount Kilimanjaro views, 📸 Photography spots',
                 'Park fees, Safari vehicle, All meals, Guide service',
                 'International flights, Insurance, Personal items', 18),
                
                ('Lamu Old Town', 'Lamu', 
                 'Explore the UNESCO World Heritage site of Lamu Old Town. Experience Swahili culture and traditional dhow sailing.',
                 40000.00, 3, 
                 'https://images.unsplash.com/photo-1590047096316-2ce8d7352539', 
                 'cultural', 4.6,
                 '🏛️ UNESCO Heritage site, ⛵ Dhow sailing, 🕌 Historic mosques',
                 'Accommodation, Breakfast, Guide service, Museum entry',
                 'Flights, Lunch and dinner, Personal items', 10),
                
                ('Tsavo National Park', 'Tsavo', 
                 'Discover Kenya\'s largest national park with diverse wildlife including the famous red elephants.',
                 48000.00, 3, 
                 'https://images.unsplash.com/photo-1549366021-9f761d450615', 
                 'nature', 4.5,
                 '🐘 Red elephants, 🌊 Mzima Springs, 🐆 Leopard sightings',
                 'Park fees, Safari vehicle, Camping equipment',
                 'Flights, Meals, Personal items', 20),
                
                ('Samburu Cultural Tour', 'Samburu', 
                 'Experience Samburu culture and unique wildlife species found only in northern Kenya.',
                 38000.00, 2, 
                 'https://images.unsplash.com/photo-1516426122078-c23e76319801', 
                 'cultural', 4.4,
                 '🏠 Samburu village visit, 🦒 Unique wildlife, 💃 Cultural dances',
                 'Accommodation, Meals, Guide service, Cultural activities',
                 'Flights, Insurance, Personal items', 15),
                
                ('Mount Kenya Hiking', 'Mount Kenya', 
                 'Trek Africa\'s second-highest mountain with experienced guides. A challenging but rewarding adventure.',
                 78000.00, 5, 
                 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b', 
                 'adventure', 4.7,
                 '🗻 Summit attempt, 🌄 Sunrise views, 🏕️ Mountain camping',
                 'Park fees, Guide service, Camping equipment, Meals on the mountain',
                 'Flights, Insurance, Equipment rental, Tips', 8),
                
                ('Mombasa Cultural Tour', 'Mombasa', 
                 'Explore Kenya\'s historic coastal city with its blend of Swahili, Arab, and European influences.',
                 25000.00, 2, 
                 'https://images.unsplash.com/photo-1580060839134-75a5edca2e99', 
                 'cultural', 4.3,
                 '🏛️ Fort Jesus, 🕌 Old Town, 🐪 Dhow harbor tour',
                 'Guide service, Museum entries, Local transport',
                 'Accommodation, Meals, Personal items', 25)
            ]
            
            for tour in sample_tours:
                cursor.execute("""
                    INSERT INTO tours (name, destination, description, price, duration_days, image_url, 
                                     category, rating, highlights, included, excluded, availability)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """, tour)
            print("✅ Sample tours created")
        
        db.commit()
        cursor.close()
        db.close()
        print("✅ Database initialization complete!")
        return True
        
    except Exception as e:
        print(f"❌ Database initialization error: {e}")
        traceback.print_exc()
        return False

# ========================================
# INITIALIZE DATABASE ON STARTUP
# ========================================

def initialize_app():
    """Initialize the application - create database and tables"""
    print("\n" + "="*50)
    print("   🦁 KENYA GUIDE - TOUR SYSTEM")
    print("="*50)
    
    # First, ensure database exists
    if not create_database_if_not_exists():
        print("\n❌ Failed to create database. Please check:")
        print("   1. MySQL is running in XAMPP")
        print("   2. MySQL credentials are correct")
        print("   3. Port 3306 is available")
        print("\nPress Ctrl+C to exit or fix the issue and restart.")
        time.sleep(3)
        return False
    
    # Then initialize tables and sample data
    success = init_database()
    
    if success:
        print("\n" + "="*50)
        print("   🌍 SERVER IS READY!")
        print("="*50)
        print("📍 Server: http://localhost:5000")
        print("👑 Admin Login: admin@kenyaguide.com / admin123")
        print("👤 User Registration: Create account at /")
        print("📍 All destinations are located in Kenya")
        print("💰 Prices are in Kenyan Shillings (KES)")
        print("="*50 + "\n")
    else:
        print("\n❌ Failed to initialize database. Please check the errors above.")
    
    return success

# ========================================
# USER MODEL
# ========================================

class User:
    @staticmethod
    def create_user(full_name, email, password, role='user', phone=None):
        db = get_db_connection()
        cursor = db.cursor()
        hashed = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
        
        try:
            cursor.execute(
                "INSERT INTO users (full_name, email, password, role, phone) VALUES (%s, %s, %s, %s, %s)",
                (full_name, email, hashed.decode('utf-8'), role, phone)
            )
            db.commit()
            return cursor.lastrowid
        except Exception as e:
            db.rollback()
            raise e
        finally:
            cursor.close()
            db.close()
    
    @staticmethod
    def get_user_by_email(email):
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        cursor.close()
        db.close()
        return user
    
    @staticmethod
    def get_user_by_id(user_id):
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("SELECT id, full_name, email, role, phone, created_at FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        cursor.close()
        db.close()
        return user
    
    @staticmethod
    def verify_password(password, hashed):
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    @staticmethod
    def update_profile(user_id, full_name=None, phone=None):
        db = get_db_connection()
        cursor = db.cursor()
        
        updates = []
        values = []
        
        if full_name:
            updates.append("full_name = %s")
            values.append(full_name)
        if phone:
            updates.append("phone = %s")
            values.append(phone)
        
        if updates:
            values.append(user_id)
            cursor.execute(f"UPDATE users SET {', '.join(updates)} WHERE id = %s", values)
            db.commit()
        
        cursor.close()
        db.close()
        return True
    
    @staticmethod
    def get_all_users():
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("SELECT id, full_name, email, role, phone, created_at FROM users ORDER BY created_at DESC")
        users = cursor.fetchall()
        cursor.close()
        db.close()
        return users
    
    @staticmethod
    def update_user_role(user_id, role):
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("UPDATE users SET role = %s WHERE id = %s", (role, user_id))
        db.commit()
        cursor.close()
        db.close()
        return True
    
    @staticmethod
    def delete_user(user_id):
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("DELETE FROM users WHERE id = %s", (user_id,))
        db.commit()
        cursor.close()
        db.close()
        return True

class Tour:
    @staticmethod
    def get_all_tours(search=None, category=None, limit=None):
        db = get_db_connection()
        cursor = db.cursor()
        
        query = "SELECT * FROM tours"
        conditions = []
        params = []
        
        if search:
            conditions.append("(name LIKE %s OR destination LIKE %s OR category LIKE %s)")
            search_param = f"%{search}%"
            params.extend([search_param, search_param, search_param])
        
        if category:
            conditions.append("category = %s")
            params.append(category)
        
        if conditions:
            query += " WHERE " + " AND ".join(conditions)
        
        query += " ORDER BY rating DESC, created_at DESC"
        
        if limit:
            query += " LIMIT %s"
            params.append(limit)
        
        cursor.execute(query, params)
        tours = cursor.fetchall()
        cursor.close()
        db.close()
        return tours
    
    @staticmethod
    def get_tour_by_id(tour_id):
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("SELECT * FROM tours WHERE id = %s", (tour_id,))
        tour = cursor.fetchone()
        cursor.close()
        db.close()
        return tour
    
    @staticmethod
    def create_tour(data):
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("""
            INSERT INTO tours (name, destination, description, price, duration_days, image_url, category, rating, highlights, included, excluded, availability)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data.get('name'), data.get('destination'), data.get('description'),
            data.get('price'), data.get('duration_days'), data.get('image_url'),
            data.get('category'), data.get('rating', 0), data.get('highlights'),
            data.get('included'), data.get('excluded'), data.get('availability', 10)
        ))
        db.commit()
        tour_id = cursor.lastrowid
        cursor.close()
        db.close()
        return tour_id
    
    @staticmethod
    def update_tour(tour_id, data):
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("""
            UPDATE tours SET name=%s, destination=%s, description=%s, price=%s, 
                duration_days=%s, image_url=%s, category=%s, rating=%s,
                highlights=%s, included=%s, excluded=%s, availability=%s
            WHERE id=%s
        """, (
            data.get('name'), data.get('destination'), data.get('description'),
            data.get('price'), data.get('duration_days'), data.get('image_url'),
            data.get('category'), data.get('rating', 0), data.get('highlights'),
            data.get('included'), data.get('excluded'), data.get('availability', 10), tour_id
        ))
        db.commit()
        cursor.close()
        db.close()
        return True
    
    @staticmethod
    def delete_tour(tour_id):
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("DELETE FROM tours WHERE id = %s", (tour_id,))
        db.commit()
        cursor.close()
        db.close()
        return True
    
    @staticmethod
    def get_tours_stats():
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("SELECT COUNT(*) as total FROM tours")
        total = cursor.fetchone()
        cursor.execute("SELECT COUNT(DISTINCT destination) as destinations FROM tours")
        destinations = cursor.fetchone()
        cursor.execute("SELECT AVG(rating) as avg_rating FROM tours WHERE rating > 0")
        avg_rating = cursor.fetchone()
        cursor.close()
        db.close()
        return {
            'total_tours': total['total'] if total else 0,
            'total_destinations': destinations['destinations'] if destinations else 0,
            'avg_rating': round(avg_rating['avg_rating'], 1) if avg_rating and avg_rating['avg_rating'] else 0
        }

class Booking:
    @staticmethod
    def create_booking(user_id, tour_id, booking_date, travelers, total_price, special_requests=None):
        db = get_db_connection()
        cursor = db.cursor()
        
        cursor.execute("""
            INSERT INTO bookings (user_id, tour_id, booking_date, travelers, total_price, status, special_requests)
            VALUES (%s, %s, %s, %s, %s, %s, %s)
        """, (user_id, tour_id, booking_date, travelers, total_price, 'pending', special_requests))
        
        db.commit()
        booking_id = cursor.lastrowid
        cursor.close()
        db.close()
        return booking_id
    
    @staticmethod
    def get_user_bookings(user_id):
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("""
            SELECT b.*, t.name as tour_name, t.destination, t.image_url, t.price as tour_price
            FROM bookings b
            JOIN tours t ON b.tour_id = t.id
            WHERE b.user_id = %s
            ORDER BY b.created_at DESC
        """, (user_id,))
        bookings = cursor.fetchall()
        cursor.close()
        db.close()
        return bookings
    
    @staticmethod
    def get_all_bookings(status=None):
        db = get_db_connection()
        cursor = db.cursor()
        
        query = """
            SELECT b.*, u.full_name as user_name, u.email, t.name as tour_name, t.destination
            FROM bookings b
            JOIN users u ON b.user_id = u.id
            JOIN tours t ON b.tour_id = t.id
        """
        params = []
        if status and status != 'all':
            query += " WHERE b.status = %s"
            params.append(status)
        
        query += " ORDER BY b.created_at DESC"
        
        cursor.execute(query, params)
        bookings = cursor.fetchall()
        cursor.close()
        db.close()
        return bookings
    
    @staticmethod
    def update_booking_status(booking_id, status):
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("UPDATE bookings SET status = %s WHERE id = %s", (status, booking_id))
        db.commit()
        cursor.close()
        db.close()
        return True
    
    @staticmethod
    def cancel_booking(booking_id):
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("UPDATE bookings SET status = 'cancelled' WHERE id = %s", (booking_id,))
        db.commit()
        cursor.close()
        db.close()
        return True
    
    @staticmethod
    def get_booking_stats():
        db = get_db_connection()
        cursor = db.cursor()
        
        cursor.execute("SELECT COUNT(*) as total FROM bookings")
        total = cursor.fetchone()
        
        cursor.execute("SELECT COUNT(*) as total FROM bookings WHERE status='pending'")
        pending = cursor.fetchone()
        
        cursor.execute("SELECT COUNT(*) as total FROM bookings WHERE status='confirmed'")
        confirmed = cursor.fetchone()
        
        cursor.execute("SELECT COUNT(*) as total FROM bookings WHERE status='completed'")
        completed = cursor.fetchone()
        
        cursor.execute("SELECT COUNT(*) as total FROM bookings WHERE status='cancelled'")
        cancelled = cursor.fetchone()
        
        cursor.execute("SELECT COALESCE(SUM(total_price), 0) as revenue FROM bookings WHERE status IN ('confirmed', 'completed')")
        revenue = cursor.fetchone()
        
        cursor.close()
        db.close()
        
        return {
            'total_bookings': total['total'] if total else 0,
            'pending': pending['total'] if pending else 0,
            'confirmed': confirmed['total'] if confirmed else 0,
            'completed': completed['total'] if completed else 0,
            'cancelled': cancelled['total'] if cancelled else 0,
            'total_revenue': float(revenue['revenue']) if revenue and revenue['revenue'] else 0
        }

class Review:
    @staticmethod
    def create_review(user_id, tour_id, rating, comment):
        db = get_db_connection()
        cursor = db.cursor()
        
        cursor.execute("""
            INSERT INTO reviews (user_id, tour_id, rating, comment)
            VALUES (%s, %s, %s, %s)
        """, (user_id, tour_id, rating, comment))
        
        db.commit()
        review_id = cursor.lastrowid
        
        # Update tour average rating
        cursor.execute("SELECT AVG(rating) as avg_rating FROM reviews WHERE tour_id = %s", (tour_id,))
        result = cursor.fetchone()
        if result and result['avg_rating']:
            cursor.execute("UPDATE tours SET rating = %s WHERE id = %s", (round(result['avg_rating'], 1), tour_id))
            db.commit()
        
        cursor.close()
        db.close()
        return review_id
    
    @staticmethod
    def get_tour_reviews(tour_id):
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("""
            SELECT r.*, u.full_name as user_name 
            FROM reviews r
            JOIN users u ON r.user_id = u.id
            WHERE r.tour_id = %s
            ORDER BY r.created_at DESC
        """, (tour_id,))
        reviews = cursor.fetchall()
        cursor.close()
        db.close()
        return reviews

# ========================================
# FRONTEND ROUTES
# ========================================

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/admin.html')
def admin_dashboard():
    return render_template('admin.html')

@app.route('/user.html')
def user_dashboard():
    return render_template('user.html')

# ========================================
# API ROUTES - AUTHENTICATION
# ========================================

@app.route('/api/register', methods=['POST'])
def register():
    try:
        data = request.get_json()
        
        if not data.get('full_name') or not data.get('email') or not data.get('password'):
            return jsonify({'error': 'Full name, email and password are required'}), 400
        
        existing_user = User.get_user_by_email(data.get('email'))
        if existing_user:
            return jsonify({'error': 'Email already registered'}), 400
        
        user_id = User.create_user(
            full_name=data.get('full_name'),
            email=data.get('email'),
            password=data.get('password'),
            role=data.get('role', 'user'),
            phone=data.get('phone')
        )
        
        access_token = create_access_token(identity=str(user_id))
        
        return jsonify({
            'message': 'User registered successfully',
            'access_token': access_token,
            'user': {
                'id': user_id,
                'full_name': data.get('full_name'),
                'email': data.get('email'),
                'role': data.get('role', 'user')
            }
        }), 201
        
    except Exception as e:
        print(f"Registration error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get('email')
        password = data.get('password')
        
        if not email or not password:
            return jsonify({'error': 'Email and password are required'}), 400
        
        user = User.get_user_by_email(email)
        if not user:
            return jsonify({'error': 'Invalid credentials'}), 401
        
        if not User.verify_password(password, user['password']):
            return jsonify({'error': 'Invalid credentials'}), 401
        
        access_token = create_access_token(identity=str(user['id']))
        
        return jsonify({
            'message': 'Login successful',
            'access_token': access_token,
            'user': {
                'id': user['id'],
                'full_name': user['full_name'],
                'email': user['email'],
                'role': user['role']
            }
        }), 200
        
    except Exception as e:
        print(f"Login error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/profile', methods=['GET', 'PUT'])
@jwt_required()
def profile():
    try:
        user_id = int(get_jwt_identity())
        
        if request.method == 'GET':
            user = User.get_user_by_id(user_id)
            if not user:
                return jsonify({'error': 'User not found'}), 404
            return jsonify({'user': user}), 200
        
        else:  # PUT
            data = request.get_json()
            User.update_profile(
                user_id=user_id,
                full_name=data.get('full_name'),
                phone=data.get('phone')
            )
            return jsonify({'message': 'Profile updated successfully'}), 200
            
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========================================
# API ROUTES - TOURS
# ========================================

@app.route('/api/tours', methods=['GET'])
def get_tours():
    try:
        limit = request.args.get('limit', type=int)
        search = request.args.get('search')
        category = request.args.get('category')
        tours = Tour.get_all_tours(search, category, limit)
        return jsonify({'tours': tours}), 200
    except Exception as e:
        print(f"Get tours error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/tours/<int:tour_id>', methods=['GET'])
def get_tour(tour_id):
    try:
        tour = Tour.get_tour_by_id(tour_id)
        if not tour:
            return jsonify({'error': 'Tour not found'}), 404
        
        reviews = Review.get_tour_reviews(tour_id)
        
        return jsonify({
            'tour': tour,
            'reviews': reviews
        }), 200
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========================================
# API ROUTES - BOOKINGS (USER)
# ========================================

@app.route('/api/bookings', methods=['GET', 'POST'])
@jwt_required()
def user_bookings():
    try:
        user_id = int(get_jwt_identity())
        
        if request.method == 'GET':
            bookings = Booking.get_user_bookings(user_id)
            return jsonify({'bookings': bookings}), 200
        
        else:  # POST
            data = request.get_json()
            
            tour = Tour.get_tour_by_id(data.get('tour_id'))
            if not tour:
                return jsonify({'error': 'Tour not found'}), 404
            
            if tour.get('availability', 0) < data.get('travelers', 1):
                return jsonify({'error': 'Not enough availability'}), 400
            
            booking_id = Booking.create_booking(
                user_id=user_id,
                tour_id=data.get('tour_id'),
                booking_date=data.get('booking_date'),
                travelers=data.get('travelers', 1),
                total_price=data.get('total_price'),
                special_requests=data.get('special_requests')
            )
            
            # Update availability
            db = get_db_connection()
            cursor = db.cursor()
            new_availability = tour['availability'] - data.get('travelers', 1)
            cursor.execute("UPDATE tours SET availability = %s WHERE id = %s", (new_availability, data.get('tour_id')))
            db.commit()
            cursor.close()
            db.close()
            
            return jsonify({'message': 'Booking created successfully', 'booking_id': booking_id}), 201
            
    except Exception as e:
        print(f"Bookings error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/bookings/<int:booking_id>/cancel', methods=['PUT'])
@jwt_required()
def cancel_booking(booking_id):
    try:
        user_id = int(get_jwt_identity())
        
        # Verify booking belongs to user
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("SELECT user_id FROM bookings WHERE id = %s", (booking_id,))
        booking = cursor.fetchone()
        cursor.close()
        db.close()
        
        if not booking or booking['user_id'] != user_id:
            return jsonify({'error': 'Booking not found'}), 404
        
        Booking.cancel_booking(booking_id)
        return jsonify({'message': 'Booking cancelled successfully'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========================================
# API ROUTES - REVIEWS
# ========================================

@app.route('/api/reviews', methods=['POST'])
@jwt_required()
def create_review():
    try:
        user_id = int(get_jwt_identity())
        data = request.get_json()
        
        review_id = Review.create_review(
            user_id=user_id,
            tour_id=data.get('tour_id'),
            rating=data.get('rating'),
            comment=data.get('comment')
        )
        
        return jsonify({'message': 'Review submitted successfully', 'review_id': review_id}), 201
        
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========================================
# ADMIN API ROUTES
# ========================================

def check_admin():
    try:
        user_id = int(get_jwt_identity())
        user = User.get_user_by_id(user_id)
        return user and user.get('role') == 'admin'
    except:
        return False

@app.route('/api/admin/stats', methods=['GET'])
@jwt_required()
def admin_stats():
    try:
        if not check_admin():
            return jsonify({'error': 'Admin access required'}), 403
        
        users = User.get_all_users()
        tours = Tour.get_all_tours()
        booking_stats = Booking.get_booking_stats()
        
        return jsonify({
            'total_users': len(users),
            'total_tours': len(tours),
            'total_bookings': booking_stats['total_bookings'],
            'total_revenue': booking_stats['total_revenue'],
            'pending_bookings': booking_stats['pending'],
            'confirmed_bookings': booking_stats['confirmed'],
            'completed_bookings': booking_stats['completed'],
            'cancelled_bookings': booking_stats['cancelled']
        }), 200
    except Exception as e:
        print(f"Admin stats error: {str(e)}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/tours', methods=['POST'])
@jwt_required()
def admin_create_tour():
    try:
        if not check_admin():
            return jsonify({'error': 'Admin access required'}), 403
        data = request.get_json()
        tour_id = Tour.create_tour(data)
        return jsonify({'message': 'Tour created', 'tour_id': tour_id}), 201
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/tours/<int:tour_id>', methods=['PUT'])
@jwt_required()
def admin_update_tour(tour_id):
    try:
        if not check_admin():
            return jsonify({'error': 'Admin access required'}), 403
        data = request.get_json()
        Tour.update_tour(tour_id, data)
        return jsonify({'message': 'Tour updated'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/tours/<int:tour_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_tour(tour_id):
    try:
        if not check_admin():
            return jsonify({'error': 'Admin access required'}), 403
        Tour.delete_tour(tour_id)
        return jsonify({'message': 'Tour deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/users', methods=['GET'])
@jwt_required()
def admin_get_users():
    try:
        if not check_admin():
            return jsonify({'error': 'Admin access required'}), 403
        users = User.get_all_users()
        return jsonify({'users': users}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/users/<int:user_id>', methods=['DELETE'])
@jwt_required()
def admin_delete_user(user_id):
    try:
        if not check_admin():
            return jsonify({'error': 'Admin access required'}), 403
        current_id = int(get_jwt_identity())
        if user_id == current_id:
            return jsonify({'error': 'Cannot delete yourself'}), 400
        User.delete_user(user_id)
        return jsonify({'message': 'User deleted'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/users/<int:user_id>/role', methods=['PUT'])
@jwt_required()
def admin_update_role(user_id):
    try:
        if not check_admin():
            return jsonify({'error': 'Admin access required'}), 403
        data = request.get_json()
        new_role = data.get('role')
        if new_role not in ['user', 'admin']:
            return jsonify({'error': 'Invalid role'}), 400
        User.update_user_role(user_id, new_role)
        return jsonify({'message': 'Role updated'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/bookings', methods=['GET'])
@jwt_required()
def admin_get_bookings():
    try:
        if not check_admin():
            return jsonify({'error': 'Admin access required'}), 403
        status = request.args.get('status')
        bookings = Booking.get_all_bookings(status)
        return jsonify({'bookings': bookings}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/bookings/<int:booking_id>/status', methods=['PUT'])
@jwt_required()
def admin_update_booking(booking_id):
    try:
        if not check_admin():
            return jsonify({'error': 'Admin access required'}), 403
        data = request.get_json()
        new_status = data.get('status')
        if new_status not in ['pending', 'confirmed', 'completed', 'cancelled']:
            return jsonify({'error': 'Invalid status'}), 400
        Booking.update_booking_status(booking_id, new_status)
        return jsonify({'message': 'Status updated'}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/reports/bookings', methods=['GET'])
@jwt_required()
def admin_report():
    try:
        if not check_admin():
            return jsonify({'error': 'Admin access required'}), 403
        bookings = Booking.get_all_bookings()
        return jsonify({'bookings': bookings, 'count': len(bookings)}), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/admin/system/monitor', methods=['GET'])
@jwt_required()
def admin_monitor():
    try:
        if not check_admin():
            return jsonify({'error': 'Admin access required'}), 403
        return jsonify({
            'cpu_percent': 45,
            'memory_percent': 60,
            'disk_usage': 55,
            'system_time': datetime.now().strftime('%Y-%m-%d %H:%M:%S'),
            'status': 'healthy'
        }), 200
    except Exception as e:
        return jsonify({'error': str(e)}), 500

# ========================================
# HEALTH CHECK
# ========================================

@app.route('/api/health', methods=['GET'])
def health_check():
    try:
        db = get_db_connection()
        cursor = db.cursor()
        cursor.execute("SELECT 1")
        cursor.close()
        db.close()
        db_status = 'connected'
    except Exception as e:
        db_status = f'error: {str(e)}'
    
    return jsonify({
        'status': 'healthy',
        'timestamp': datetime.now().isoformat(),
        'database': db_status,
        'server': 'Kenya Guide API'
    }), 200

# ========================================
# ERROR HANDLERS
# ========================================

@app.errorhandler(404)
def not_found(error):
    return jsonify({'error': 'Resource not found'}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({'error': 'Internal server error'}), 500

# ========================================
# START APPLICATION
# ========================================

if __name__ == '__main__':
    # Initialize the application
    if initialize_app():
        print("🚀 Starting Flask server...")
        print("📍 Press Ctrl+C to stop the server\n")
        app.run(debug=True, port=5000, host='0.0.0.0')
    else:
        print("\n❌ Application initialization failed. Exiting...")
        exit(1)