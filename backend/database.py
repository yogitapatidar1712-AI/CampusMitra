import sqlite3
import os
from datetime import datetime

DB_PATH = os.path.join(os.path.dirname(__file__), 'campus_mitra.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """Initializes tables for Campus Mitra AI: Chats, Knowledge Base, and Grievances."""
    conn = get_db_connection()
    cursor = conn.cursor()

    # 1. Chat History Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS chat_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            session_id TEXT NOT NULL,
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # 2. Knowledge Base Table (Campus FAQs, Departments, Rules)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS knowledge_base (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            category TEXT NOT NULL,
            keywords TEXT NOT NULL,
            question TEXT NOT NULL,
            answer TEXT NOT NULL
        )
    ''')

    # 3. Student Grievances / Tickets Table
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS complaints (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_name TEXT,
            roll_number TEXT,
            category TEXT NOT NULL,
            description TEXT NOT NULL,
            status TEXT DEFAULT 'OPEN',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    ''')

    # Seed Knowledge Base if empty
    cursor.execute('SELECT COUNT(*) FROM knowledge_base')
    if cursor.fetchone()[0] == 0:
        seed_default_knowledge(cursor)

    conn.commit()
    conn.close()
    print("[DB] Campus Mitra Database initialized successfully at:", DB_PATH)

def seed_default_knowledge(cursor):
    """Seed foundational Mandsaur University knowledge."""
    seed_records = [
        (
            'HACKATHON',
            'anant hackathon chancellor brigade competition mu anant',
            'What is MU ANANT 1.0 Hackathon?',
            'MU ANANT 1.0 is the flagship national hackathon of Mandsaur University with the motto "Kuch Karke Dikhana Hai". Organized by the Chancellor\'s Brigade, it provides innovators a platform to build impactful tech solutions.'
        ),
        (
            'ACADEMICS',
            'exam datesheet exam cell admit card test schedule',
            'When are the semester exams held and how to get admit cards?',
            'Semester exams follow the Mandsaur University Academic Calendar. Admit cards are released 5-7 days before exams on the MU ERP Portal. Minimum 75% attendance is required to appear in examinations.'
        ),
        (
            'HOSTEL',
            'hostel mess food timing warden room complaint wifi',
            'What are the hostel timings and mess schedule?',
            'Hostel in-time is strictly 08:30 PM. Mess schedule: Breakfast (07:30 - 09:00 AM), Lunch (12:30 - 02:30 PM), Dinner (07:30 - 09:30 PM). For room repairs or Wi-Fi issues, submit a ticket via Campus Mitra or contact the warden office.'
        ),
        (
            'LIBRARY',
            'library timing books issue renewal central library',
            'What are the Central Library working hours and borrowing rules?',
            'The Central Library is open Mon-Sat from 08:30 AM to 08:00 PM. Each student can borrow up to 4 books for 14 days using their university ID card. Digital library terminals are available on the 2nd floor.'
        ),
        (
            'NAVIGATION',
            'auditorium location campus block cs lab canteen sports',
            'Where are the main campus buildings located?',
            'Administrative Block is at the entrance. CS/IT labs are in Block C (1st & 2nd floors). The Central Auditorium is adjacent to Block B. The Canteen and Mess are located opposite the residential hostel blocks.'
        )
    ]
    cursor.executemany('''
        INSERT INTO knowledge_base (category, keywords, question, answer)
        VALUES (?, ?, ?, ?)
    ''', seed_records)

def log_message(session_id: str, role: str, content: str):
    """Logs conversation messages to SQLite."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO chat_logs (session_id, role, content)
        VALUES (?, ?, ?)
    ''', (session_id, role, content))
    conn.commit()
    conn.close()

def query_knowledge_base(query_text: str):
    """Simple keyword-based match against knowledge base."""
    conn = get_db_connection()
    cursor = conn.cursor()
    words = query_text.lower().split()

    # Search for matching keywords
    for word in words:
        if len(word) > 3:
            cursor.execute('''
                SELECT question, answer, category FROM knowledge_base
                WHERE keywords LIKE ? OR question LIKE ?
                LIMIT 1
            ''', (f'%{word}%', f'%{word}%'))
            row = cursor.fetchone()
            if row:
                conn.close()
                return dict(row)

    conn.close()
    return None

def submit_complaint(category: str, description: str, student_name: str = "Anonymous", roll_number: str = "N/A"):
    """Submits a maintenance or campus complaint."""
    conn = get_db_connection()
    cursor = conn.cursor()
    cursor.execute('''
        INSERT INTO complaints (student_name, roll_number, category, description)
        VALUES (?, ?, ?, ?)
    ''', (student_name, roll_number, category, description))
    ticket_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return ticket_id
