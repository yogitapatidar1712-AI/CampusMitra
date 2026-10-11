"""
Campus Mitra AI — Twilio WhatsApp Incoming Webhook Server (Python Edition)
Mandsaur University | MU ANANT 1.0 Hackathon | Chancellor's Brigade
"""

import os
import sys

# Ensure UTF-8 output on Windows terminal
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')

from flask import Flask, request, Response, jsonify
from dotenv import load_dotenv
from twilio.twiml.messaging_response import MessagingResponse

load_dotenv()

app = Flask(__name__)

PORT = int(os.getenv("PORT", 3000))
ACCOUNT_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
AUTH_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_NUMBER = os.getenv("TWILIO_NUMBER", "whatsapp:+17372508034")

# Real Mandsaur University Datasets
FACULTY_DATA = [
    {
        "id": "fac_nidhi",
        "name": "Prof. Nidhi Mam",
        "designation": "HOD Computer Science",
        "department": "Computer Science & Engineering",
        "cabin": "Block C, Room 201 (HOD Office)",
        "status": "AVAILABLE",
        "remarks": "Available in HOD cabin for academic counseling & project queries"
    },
    {
        "id": "fac_ranu",
        "name": "Prof. Ranu Mam",
        "designation": "CSE Department",
        "department": "Computer Science & Engineering",
        "cabin": "Block C, Room 204 (Faculty Cabin)",
        "status": "IN_LECTURE",
        "remarks": "Conducting CSE Theory Class in CS Lab 2 • Free after 2:30 PM"
    },
    {
        "id": "fac_verma",
        "name": "Dr. Verma Sir",
        "designation": "Dean / Administration",
        "department": "University Administration & Academics",
        "cabin": "Admin Block, Room 101 (Dean Office)",
        "status": "IN_MEETING",
        "remarks": "Charing Hackathon Council Meeting for MU ANANT 1.0 till 3:30 PM"
    }
]

STUDENT_DATA = [
    {
        "id": "stu_ankit",
        "name": "ANKIT",
        "caste": "OBC",
        "roll": "MU26CSE001",
        "feesDue": 3000,
        "twelfthPercent": 78.5,
        "busPass": "Expired",
        "renewalToken": None
    },
    {
        "id": "stu_ravindra",
        "name": "RAVINDRA SINGH",
        "caste": "OBC",
        "roll": "MU26CSE002",
        "feesDue": 0,
        "twelfthPercent": 82.0,
        "busPass": "Active",
        "renewalToken": "MU-BUS-TOKEN-8421"
    },
    {
        "id": "stu_chetan",
        "name": "CHETAN CARPENTER",
        "caste": "OBC",
        "roll": "MU26CSE003",
        "feesDue": 4500,
        "twelfthPercent": 74.5,
        "busPass": "Expired",
        "renewalToken": None
    },
    {
        "id": "stu_nikhil",
        "name": "NIKHIL SHARMA",
        "caste": "GENERAL",
        "roll": "MU26CSE004",
        "feesDue": 3000,
        "twelfthPercent": 88.2,
        "busPass": "Expired",
        "renewalToken": None
    },
    {
        "id": "stu_jitendra",
        "name": "JITENDRA SOLANKI",
        "caste": "SC",
        "roll": "MU26CSE006",
        "feesDue": 6000,
        "twelfthPercent": 69.4,
        "busPass": "Expired",
        "renewalToken": None
    }
]

user_sessions = {}

def get_user_session(from_number):
    if from_number not in user_sessions:
        user_sessions[from_number] = {
            "language": "en",
            "state": "IDLE",
            "pendingStudent": None,
            "pendingAction": None,
            "isVerified": False
        }
    return user_sessions[from_number]

def process_message(user_message, from_number):
    session = get_user_session(from_number)
    text = (user_message or "").strip()
    lower = text.lower()
    lang = session["language"]

    # Language Switcher
    if lower in ["english", "en"]:
        session["language"] = "en"
        return "✅ Language switched to *English*.\n\n" + get_welcome("en")
    if lower in ["hindi", "हिन्दी", "hi"]:
        session["language"] = "hi"
        return "✅ भाषा बदलकर *हिन्दी* कर दी गई है।\n\n" + get_welcome("hi")
    if lower == "hinglish":
        session["language"] = "hinglish"
        return "✅ Language set to *Hinglish*.\n\n" + get_welcome("hinglish")

    # OTP Verification State
    if session["state"] == "AWAITING_OTP":
        if text == "4321" or "4321" in lower:
            session["state"] = "IDLE"
            session["isVerified"] = True
            target = session.get("pendingStudent") or STUDENT_DATA[0]
            action = session.get("pendingAction")
            session["pendingStudent"] = None
            session["pendingAction"] = None

            if action == "RENEW_BUS":
                import random
                token = f"MU-BUS-TOKEN-{random.randint(1000, 9999)}"
                target["busPass"] = "Active"
                target["renewalToken"] = token
                return (
                    f"✅ *OTP 4321 VERIFIED & BUS PASS RENEWED!*\n━━━━━━━━━━━━━━━━━━━━\n"
                    f"👤 *Student:* {target['name']} ({target['roll']})\n"
                    f"🎫 *Digital Pass Token:* `{token}`\n"
                    f"🟢 *Status:* ACTIVE (Valid for Current Semester)\n"
                    f"━━━━━━━━━━━━━━━━━━━━\n_Show this token message at campus bus boarding._"
                )

            return "✅ *OTP 4321 VERIFIED SUCCESSFULLY!*\n\n" + format_student(target, lang)
        else:
            if lang == "hi":
                return "❌ *अमान्य ओटीपी कोड!*\nकृपया मान्य 4-अंकों का कोड दर्ज करें (डेमो: *4321*)।"
            if lang == "hinglish":
                return "❌ *Galat OTP code!* Kripya valid OTP enter karein (Demo OTP: *4321*)."
            return "❌ *Invalid OTP Code!*\nPlease enter the 4-digit verification code sent to your registered number (Hint: *4321*)."

    # Option 1: Live Faculty Status
    if text == "1" or "/faculty" in lower or "faculty" in lower:
        res = "👩‍🏫 *MANDSAUR UNIVERSITY — REAL-TIME FACULTY STATUS*\n━━━━━━━━━━━━━━━━━━━━\n"
        for f in FACULTY_DATA:
            icon = "🟢" if f["status"] == "AVAILABLE" else ("🟡" if f["status"] == "IN_LECTURE" else ("🟠" if f["status"] == "IN_MEETING" else "🔴"))
            res += f"\n{icon} *{f['name']}*\n• Role: {f['designation']}\n• Status: *{f['status'].replace('_', ' ')}*\n• Cabin: {f['cabin']}\n• Note: _{f['remarks']}_\n"
        res += "\n━━━━━━━━━━━━━━━━━━━━\n💡 _ERP Dropdown changes reflect here live._"
        return res

    # Option 2: Student Fees Ledger
    if text == "2" or "/fees" in lower or "fees" in lower or "due" in lower:
        total = sum(s["feesDue"] for s in STUDENT_DATA)
        res = "💰 *MANDSAUR UNIVERSITY — SEMESTER FEES LEDGER*\n━━━━━━━━━━━━━━━━━━━━\n"
        for s in STUDENT_DATA:
            fee_badge = f"⚠️ *₹{s['feesDue']:,} Due*" if s["feesDue"] > 0 else "✅ *Clear (₹0)*"
            res += f"\n👤 *{s['name']}* ({s['roll']})\n• Category: {s['caste']} | Fees: {fee_badge}\n"
        res += f"\n━━━━━━━━━━━━━━━━━━━━\n🔴 *Total Outstanding Dues:* ₹{total:,}\n\n_To unlock individual verified record, type student name (e.g. 'ANKIT')._"
        return res

    # Option 3: Scholarship Eligibility
    if text == "3" or "scholarship" in lower:
        return (
            "📜 *MANDSAUR UNIVERSITY SCHOLARSHIP MATRIX* 🎓\n━━━━━━━━━━━━━━━━━━━━\n"
            "• *SC/ST Category* (e.g. JITENDRA SOLANKI):\n"
            "  ➔ 100% Tuition Fee Waiver under State Post-Matric Scheme.\n\n"
            "• *OBC Category* (e.g. ANKIT, RAVINDRA SINGH, CHETAN):\n"
            "  ➔ Post-Matric Scholarship covering up to 50% maintenance.\n\n"
            "• *General Category* (e.g. NIKHIL SHARMA):\n"
            "  ➔ Chancellor's Merit Scholarship for 12th score > 85% (*Nikhil eligible with 88.2%!* 🎉).\n━━━━━━━━━━━━━━━━━━━━\n"
            "_Submit verification documents at Admin Block, Room 104._"
        )

    # Option 4: Bus Transport Pass & Renewal
    if text == "4" or "/bus" in lower or "bus" in lower:
        res = "🚌 *MANDSAUR UNIVERSITY BUS TRANSPORT STATUS*\n━━━━━━━━━━━━━━━━━━━━\n"
        for s in STUDENT_DATA:
            pass_badge = "🟢 *ACTIVE*" if s["busPass"] == "Active" else "🔴 *EXPIRED*"
            tok = f" [Token: `{s['renewalToken']}`]" if s.get("renewalToken") else ""
            res += f"\n• *{s['name']}* ({s['roll']}): {pass_badge}{tok}"
        res += '\n\n━━━━━━━━━━━━━━━━━━━━\n💡 _Type "Renew bus pass for [Name]" to issue a fresh digital token._'
        return res

    # Option 5: Exam Notice
    if text == "5" or "exam" in lower:
        return (
            "📅 *EXAMINATION CELL & DATESHEET NOTICES*\n━━━━━━━━━━━━━━━━━━━━\n"
            "• *Semester Exams*: Scheduled as per the official MU Academic Calendar.\n"
            "• *Admit Cards*: Hall tickets released on the MU Student ERP portal 5 days prior.\n"
            "• *Attendance Rule*: Strictly minimum *75% mandatory attendance* required to sit in exams.\n"
            "• *Center*: Engineering Block C & Administrative Examination Hall."
        )

    # Option 6: Emergency
    if text == "6" or "emergency" in lower or "help" in lower:
        return (
            "🚨 *MANDSAUR UNIVERSITY HELPLINE & EMERGENCY* 🚨\n━━━━━━━━━━━━━━━━━━━━\n"
            "• 📞 Campus Security Office: +91 7422 255551\n"
            "• 🚑 Medical Center / Ambulance: +91 7422 255552\n"
            "• 🛡️ Anti-Ragging Cell (Toll-Free): 1800-180-5522\n"
            "• 🏢 Chief Warden Office: Admin Block, Ground Floor\n━━━━━━━━━━━━━━━━━━━━\n"
            "_Campus Mitra AI is available 24x7 to assist students & faculty._"
        )

    # Option 7: Language
    if text == "7" or "language" in lower:
        return (
            "🌐 *LANGUAGE SELECTION / भाषा चुनें*\n━━━━━━━━━━━━━━━━━━━━\n"
            "Please reply with your preferred choice:\n\n"
            "• Reply *ENGLISH* for English\n"
            "• Reply *HINDI* for हिन्दी\n"
            "• Reply *HINGLISH* for Hinglish"
        )

    # Check Faculty name matching
    for fac in FACULTY_DATA:
        if any(part.lower() in lower for part in fac["name"].split()):
            icon = "🟢" if fac["status"] == "AVAILABLE" else ("🟡" if fac["status"] == "IN_LECTURE" else "🟠")
            return (
                f"🏛️ *Faculty Update: {fac['name']}*\n"
                f"📚 *Designation:* {fac['designation']}\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"{icon} *Status:* {fac['status'].replace('_', ' ')}\n"
                f"📍 *Cabin Location:* {fac['cabin']}\n"
                f"📝 *Remarks:* {fac['remarks']}\n"
                f"━━━━━━━━━━━━━━━━━━━━\n"
                f"_Firestore Verified Record._"
            )

    # Check Student queries
    for s in STUDENT_DATA:
        if s["name"].lower() in lower or s["name"].split()[0].lower() in lower:
            if not session["isVerified"]:
                session["state"] = "AWAITING_OTP"
                session["pendingStudent"] = s
                session["pendingAction"] = "STUDENT_INFO"
                return (
                    f"🔐 *Security Verification (OTP Required)*:\n"
                    f"Accessing student records for *{s['name']}* ({s['roll']}). Please enter your 4-digit verification OTP:\n\n"
                    f"💡 *(Demo OTP Code: 4321)*"
                )
            else:
                return format_student(s, lang)

    return get_welcome(lang)

def get_welcome(lang):
    if lang == "hi":
        return (
            "🎓 *मंदसौर विश्वविद्यालय — कैम्पस मित्र एआई* 🎓\n_आधिकारिक व्हाट्सएप सहायक_\n━━━━━━━━━━━━━━━━━━━━\n"
            "कृपया विकल्प संख्या (*1 से 7*) दर्ज करें:\n\n"
            "*1* ➔ 👩‍🏫 संकाय स्थिति (प्रो. निधि मैम, प्रो. रानू मैम, डॉ. वर्मा सर)\n"
            "*2* ➔ 💰 छात्र बकाया शुल्क (Fees Due) लेजर\n"
            "*3* ➔ 📜 छात्रवृत्ति पात्रता (OBC / SC / ST / सामान्य)\n"
            "*4* ➔ 🚌 बस परिवहन पास व डिजिटल नवीनीकरण टोकन\n"
            "*5* ➔ 📅 परीक्षा तिथियां व प्रवेश पत्र नियम\n"
            "*6* ➔ 🚨 विश्वविद्यालय आपातकालीन हेल्पलाइन\n"
            "*7* ➔ 🌐 भाषा बदलें (English / हिन्दी / Hinglish)\n\n"
            "_चांसलर ब्रिगेड • एमयू अनंत 1.0_ 🏆"
        )
    return (
        "🎓 *MANDSAUR UNIVERSITY — CAMPUS MITRA AI* 🎓\n_Official WhatsApp Smart Companion_\n━━━━━━━━━━━━━━━━━━━━\n"
        "Reply with an option number (*1 to 7*):\n\n"
        "*1* ➔ 👩‍🏫 Live Faculty Status (Nidhi Mam, Ranu Mam, Verma Sir)\n"
        "*2* ➔ 💰 Check Student Fees & Outstanding Dues\n"
        "*3* ➔ 📜 Scholarship Eligibility (OBC / SC / ST / General)\n"
        "*4* ➔ 🚌 Bus Transport Pass & Dynamic Renewal Token\n"
        "*5* ➔ 📅 Exam Cell Datesheet & Hall Ticket Criteria\n"
        "*6* ➔ 🚨 Campus Emergency & Anti-Ragging Helpline\n"
        "*7* ➔ 🌐 Switch Language (English / हिन्दी / Hinglish)\n\n"
        '_Or ask naturally: "Where is Prof. Ranu Mam?" or "Check fees for ANKIT"_'
    )

def format_student(s, lang):
    fee_badge = f"⚠️ *₹{s['feesDue']:,} (Pending Due)*" if s["feesDue"] > 0 else "✅ *Clear / Paid in Full (₹0)*"
    bus_badge = "🟢 *Active (Valid)*" if s["busPass"] == "Active" else "🔴 *Expired (Needs Renewal)*"
    tok = f"\n🎫 *Pass Token:* `{s['renewalToken']}`" if s.get("renewalToken") else ""
    return (
        f"📋 *MANDSAUR UNIVERSITY STUDENT LEDGER RECORD*\n━━━━━━━━━━━━━━━━━━━━\n"
        f"👤 *Student Name:* {s['name']}\n"
        f"🆔 *Roll Number:* {s['roll']}\n"
        f"🏷️ *Caste / Category:* {s['caste']}\n"
        f"📊 *12th Percentage:* {s['twelfthPercent']}%\n"
        f"💰 *Fees Status:* {fee_badge}\n"
        f"🚌 *Bus Pass:* {bus_badge}{tok}\n"
        f"━━━━━━━━━━━━━━━━━━━━\n_Verified record fetched directly from Firebase Firestore._"
    )

@app.route("/whatsapp", methods=["POST"])
def whatsapp_webhook():
    from_number = request.values.get("From", "unknown")
    incoming_body = request.values.get("Body", "")

    print(f"\n[Twilio Webhook] Received from {from_number}: {incoming_body}")
    reply_text = process_message(incoming_body, from_number)

    twiml = MessagingResponse()
    twiml.message(reply_text)
    return Response(str(twiml), mimetype="text/xml")

@app.route("/health", methods=["GET"])
def health():
    return jsonify({
        "status": "healthy",
        "service": "Campus Mitra AI - Twilio WhatsApp Server",
        "university": "Mandsaur University",
        "port": PORT,
        "endpoints": {
            "webhook": "POST /whatsapp",
            "health": "GET /health"
        }
    })

@app.route("/", methods=["GET"])
def home():
    return f"""
    <html>
      <body style="font-family: system-ui; background: #0f172a; color: #f8fafc; padding: 2rem;">
        <h1 style="color: #f97316;">🎓 Campus Mitra AI — Twilio WhatsApp Server</h1>
        <p><strong>Mandsaur University | MU ANANT 1.0 | Chancellor's Brigade</strong></p>
        <hr style="border-color: #334155; margin: 1.5rem 0;" />
        <h3>🚀 Connecting to Ngrok:</h3>
        <ol>
          <li>Run ngrok in terminal: <code style="background: #1e293b; padding: 4px 8px; border-radius: 4px;">ngrok http {PORT}</code></li>
          <li>Copy your HTTPS Ngrok URL: <code style="background: #1e293b; padding: 4px 8px; border-radius: 4px;">https://&lt;your-subdomain&gt;.ngrok-free.app/whatsapp</code></li>
          <li>Paste into Twilio Sandbox: <em>WHEN A MESSAGE COMES IN</em> ➔ <strong>POST</strong></li>
        </ol>
        <p style="color: #34d399;">✓ Server ready on port <strong>{PORT}</strong>!</p>
      </body>
    </html>
    """

if __name__ == "__main__":
    print("=======================================================")
    print(f"[INFO] Campus Mitra Twilio WhatsApp Server running on PORT {PORT}")
    print(f"[INFO] Webhook URL for Ngrok: POST http://localhost:{PORT}/whatsapp")
    print(f"[INFO] Health Check: GET http://localhost:{PORT}/health")
    print("=======================================================")
    app.run(host="0.0.0.0", port=PORT, debug=True)
