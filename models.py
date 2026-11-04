import hashlib
import bcrypt
from datetime import datetime
import MySQLdb.cursors
from flask import current_app

class Database:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def get_connection(self):
        import MySQLdb
        return MySQLdb.connect(
            host=current_app.config['MYSQL_HOST'],
            user=current_app.config['MYSQL_USER'],
            passwd=current_app.config['MYSQL_PASSWORD'],
            db=current_app.config['MYSQL_DATABASE'],
            port=current_app.config['MYSQL_PORT'],
            cursorclass=MySQLdb.cursors.DictCursor,
            autocommit=True
        )

class User:
    @staticmethod
    def create_user(full_name, email, password, role='user', phone=None):
        db = Database().get_connection()
        cursor = db.cursor()
        
        # Hash password
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
        db = Database().get_connection()
        cursor = db.cursor()
        cursor.execute("SELECT * FROM users WHERE email = %s", (email,))
        user = cursor.fetchone()
        cursor.close()
        db.close()
        return user
    
    @staticmethod
    def get_user_by_id(user_id):
        db = Database().get_connection()
        cursor = db.cursor()
        cursor.execute("SELECT id, full_name, email, role, phone, profile_picture, created_at FROM users WHERE id = %s", (user_id,))
        user = cursor.fetchone()
        cursor.close()
        db.close()
        return user
    
    @staticmethod
    def verify_password(password, hashed):
        return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))
    
    @staticmethod
    def update_profile(user_id, full_name=None, phone=None):
        db = Database().get_connection()
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
            cursor.execute(
                f"UPDATE users SET {', '.join(updates)} WHERE id = %s",
                values
            )
            db.commit()
        
        cursor.close()
        db.close()
        return True

class UserPreference:
    @staticmethod
    def save_preferences(user_id, preferences):
        db = Database().get_connection()
        cursor = db.cursor()
        
        # Check if preferences exist
        cursor.execute("SELECT id FROM user_preferences WHERE user_id = %s", (user_id,))
        existing = cursor.fetchone()
        
        try:
            if existing:
                cursor.execute("""
                    UPDATE user_preferences 
                    SET budget_range = %s, preferred_destinations = %s, interests = %s, 
                        travel_style = %s, preferred_season = %s
                    WHERE user_id = %s
                """, (
                    preferences.get('budget_range'),
                    preferences.get('preferred_destinations'),
                    preferences.get('interests'),
                    preferences.get('travel_style'),
                    preferences.get('preferred_season'),
                    user_id
                ))
            else:
                cursor.execute("""
                    INSERT INTO user_preferences (user_id, budget_range, preferred_destinations, interests, travel_style, preferred_season)
                    VALUES (%s, %s, %s, %s, %s, %s)
                """, (
                    user_id,
                    preferences.get('budget_range'),
                    preferences.get('preferred_destinations'),
                    preferences.get('interests'),
                    preferences.get('travel_style'),
                    preferences.get('preferred_season')
                ))
            db.commit()
            return True
        except Exception as e:
            db.rollback()
            raise e
        finally:
            cursor.close()
            db.close()
    
    @staticmethod
    def get_preferences(user_id):
        db = Database().get_connection()
        cursor = db.cursor()
        cursor.execute("SELECT * FROM user_preferences WHERE user_id = %s", (user_id,))
        prefs = cursor.fetchone()
        cursor.close()
        db.close()
        return prefs

class Tour:
    @staticmethod
    def create_tour(data):
        db = Database().get_connection()
        cursor = db.cursor()
        
        cursor.execute("""
            INSERT INTO tours (name, destination, description, price, duration_days, image_url, category, rating, highlights, included, excluded, availability)
            VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
        """, (
            data.get('name'),
            data.get('destination'),
            data.get('description'),
            data.get('price'),
            data.get('duration_days'),
            data.get('image_url'),
            data.get('category'),
            data.get('rating', 0),
            data.get('highlights'),
            data.get('included'),
            data.get('excluded'),
            data.get('availability', 10)
        ))
        db.commit()
        tour_id = cursor.lastrowid
        cursor.close()
        db.close()
        return tour_id
    
    @staticmethod
    def get_all_tours(limit=None, offset=0):
        db = Database().get_connection()
        cursor = db.cursor()
        
        query = "SELECT * FROM tours ORDER BY rating DESC, created_at DESC"
        if limit:
            query += f" LIMIT {limit} OFFSET {offset}"
        
        cursor.execute(query)
        tours = cursor.fetchall()
        cursor.close()
        db.close()
        return tours
    
    @staticmethod
    def get_tour_by_id(tour_id):
        db = Database().get_connection()
        cursor = db.cursor()
        cursor.execute("SELECT * FROM tours WHERE id = %s", (tour_id,))
        tour = cursor.fetchone()
        cursor.close()
        db.close()
        return tour
    
    @staticmethod
    def update_tour(tour_id, data):
        db = Database().get_connection()
        cursor = db.cursor()
        
        cursor.execute("""
            UPDATE tours 
            SET name = %s, destination = %s, description = %s, price = %s, 
                duration_days = %s, image_url = %s, category = %s, rating = %s,
                highlights = %s, included = %s, excluded = %s, availability = %s
            WHERE id = %s
        """, (
            data.get('name'),
            data.get('destination'),
            data.get('description'),
            data.get('price'),
            data.get('duration_days'),
            data.get('image_url'),
            data.get('category'),
            data.get('rating'),
            data.get('highlights'),
            data.get('included'),
            data.get('excluded'),
            data.get('availability'),
            tour_id
        ))
        db.commit()
        cursor.close()
        db.close()
        return True
    
    @staticmethod
    def delete_tour(tour_id):
        db = Database().get_connection()
        cursor = db.cursor()
        cursor.execute("DELETE FROM tours WHERE id = %s", (tour_id,))
        db.commit()
        cursor.close()
        db.close()
        return True
    
    @staticmethod
    def get_tours_by_destination(destination):
        db = Database().get_connection()
        cursor = db.cursor()
        cursor.execute("SELECT * FROM tours WHERE destination LIKE %s", (f'%{destination}%',))
        tours = cursor.fetchall()
        cursor.close()
        db.close()
        return tours
    
    @staticmethod
    def get_tours_by_category(category):
        db = Database().get_connection()
        cursor = db.cursor()
        cursor.execute("SELECT * FROM tours WHERE category = %s", (category,))
        tours = cursor.fetchall()
        cursor.close()
        db.close()
        return tours

class Booking:
    @staticmethod
    def create_booking(user_id, tour_id, booking_date, travelers, total_price, special_requests=None):
        db = Database().get_connection()
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
        db = Database().get_connection()
        cursor = db.cursor()
        cursor.execute("""
            SELECT b.*, t.name as tour_name, t.destination, t.image_url 
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
    def update_booking_status(booking_id, status):
        db = Database().get_connection()
        cursor = db.cursor()
        cursor.execute("UPDATE bookings SET status = %s WHERE id = %s", (status, booking_id))
        db.commit()
        cursor.close()
        db.close()
        return True

class Review:
    @staticmethod
    def create_review(user_id, tour_id, rating, comment):
        db = Database().get_connection()
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
        db = Database().get_connection()
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