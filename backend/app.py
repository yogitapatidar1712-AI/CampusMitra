import os
import sys
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Import database module
import database

# Load environment variables
load_dotenv()

app = Flask(__name__)
# Enable CORS for frontend interaction
CORS(app, resources={r"/api/*": {"origins": "*"}})

# Initialize SQLite database
database.init_db()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
LLM_ENABLED = False

if GEMINI_API_KEY:
    try:
        import google.generativeai as genai
        genai.configure(api_key=GEMINI_API_KEY)
        model = genai.GenerativeModel('gemini-1.5-flash')
        LLM_ENABLED = True
        print("[AI] Google Gemini API configured successfully.")
    except Exception as e:
        print(f"[AI] Gemini setup warning: {e}")
        LLM_ENABLED = False
else:
    print("[AI] No GEMINI_API_KEY detected in .env. Running in Database + Knowledge Engine mode.")

SYSTEM_PROMPT = """
You are Campus Mitra AI, the official intelligent digital campus companion for Mandsaur University (MU), built for the MU ANANT 1.0 Hackathon ("Kuch Karke Dikhana Hai") by Chancellor's Brigade.

Your job is to assist students, teachers, and visitors with:
1. Academic schedules, exam datesheets, attendance criteria, and syllabus.
2. Campus navigation (blocks, auditoriums, labs, mess, library).
3. Hostel rules, timings, mess menus, and maintenance grievances.
4. MU ANANT 1.0 Hackathon details, workshops, and student club events.
5. Campus emergencies and university contacts.

Tone: Friendly, encouraging, polite, concise, structured with bullet points.
If unsure about university data, advise the student to contact the respective Dean or Exam Cell.
"""

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint polled by the frontend."""
    return jsonify({
        "status": "healthy",
        "service": "Campus Mitra AI Backend",
        "llm_connected": LLM_ENABLED,
        "database": "SQLite (campus_mitra.db)"
    }), 200

@app.route('/api/chat', methods=['POST'])
def chat():
    """Main AI conversation endpoint."""
    data = request.get_json() or {}
    user_message = data.get('message', '').strip()
    session_id = data.get('session_id', 'default_session')
    history = data.get('history', [])

    if not user_message:
        return jsonify({"error": "Empty message"}), 400

    # 1. Log user message to database
    database.log_message(session_id, 'user', user_message)

    reply = ""

    # 2. Check local Knowledge Base first
    kb_match = database.query_knowledge_base(user_message)

    # 3. If LLM is enabled (Gemini)
    if LLM_ENABLED:
        try:
            # Build conversation context
            kb_context = f"\n[Campus Database Context: {kb_match['answer']}]" if kb_match else ""
            prompt_with_context = f"{SYSTEM_PROMPT}{kb_context}\n\nStudent: {user_message}\nCampus Mitra:"
            
            ai_response = model.generate_content(prompt_with_context)
            reply = ai_response.text
        except Exception as e:
            print(f"[AI Error] {e}")
            # Fall back to knowledge base
            if kb_match:
                reply = f"**{kb_match['question']}**\n\n{kb_match['answer']}"
            else:
                reply = "I am currently processing your request using offline campus knowledge. Please verify with the University Academic Desk."
    else:
        # Fallback knowledge base engine
        if kb_match:
            reply = f"ℹ️ **{kb_match['question']}**\n\n{kb_match['answer']}"
        else:
            reply = (
                f"👋 **Campus Mitra AI (Mandsaur University)**\n\n"
                f"Thank you for asking about: *{user_message}*.\n\n"
                "• For official exam dates, visit the MU ERP Portal.\n"
                "• For hostel maintenance or Wi-Fi grievances, submit a ticket in Campus Mitra.\n"
                "• To activate live LLM capabilities, add your `GEMINI_API_KEY` to the `.env` file!"
            )

    # 4. Log AI reply to database
    database.log_message(session_id, 'assistant', reply)

    return jsonify({
        "reply": reply,
        "session_id": session_id,
        "source": "Gemini LLM" if LLM_ENABLED else "Campus Knowledge Base"
    }), 200

@app.route('/api/complaint', methods=['POST'])
def log_complaint():
    """Grievance / Ticket submission endpoint."""
    data = request.get_json() or {}
    category = data.get('category', 'GENERAL')
    description = data.get('description', '')
    student_name = data.get('student_name', 'Student')
    roll_number = data.get('roll_number', 'N/A')

    if not description:
        return jsonify({"error": "Description required"}), 400

    ticket_id = database.submit_complaint(category, description, student_name, roll_number)
    return jsonify({
        "success": True,
        "ticket_id": ticket_id,
        "message": f"Complaint registered with Ticket #{ticket_id}. It will be forwarded to the warden/admin."
    }), 201

if __name__ == '__main__':
    port = int(os.getenv("PORT", 5000))
    print(f"🚀 Campus Mitra AI Backend starting on http://localhost:{port}")
    app.run(host='0.0.0.0', port=port, debug=True)
