"""CampusMitra WhatsApp bot (hackathon prototype).
Flow: student scans QR -> says Hi -> OTP login -> menu -> verified answers from data.json.
Faculty sends ON or OFF from their own number to update availability."""
import json, os, random, time, threading
import requests
from flask import Flask, request, jsonify
from dotenv import load_dotenv

load_dotenv()
VERIFY_TOKEN = os.getenv("VERIFY_TOKEN", "campusmitra123")
WA_TOKEN = os.getenv("WHATSAPP_TOKEN", "")
PHONE_ID = os.getenv("PHONE_NUMBER_ID", "")
ANTHROPIC_KEY = os.getenv("ANTHROPIC_API_KEY", "")
CLAUDE_MODEL = os.getenv("CLAUDE_MODEL", "claude-sonnet-5-5")
ADMIN_KEY = os.getenv("ADMIN_KEY", "demo123")
DRY_RUN = os.getenv("DRY_RUN", "0") == "1"
DATA_FILE = os.path.join(os.path.dirname(__file__), "data.json")

app = Flask(__name__)
lock = threading.Lock()
sessions = {}      # phone -> {"step", "otp", "otp_exp", "until"}
seen_ids = set()   # to ignore repeated deliveries from Meta
outbox = []        # used only in DRY_RUN to see what the bot would send

def load():
    with open(DATA_FILE, encoding="utf-8") as f:
        return json.load(f)

def save(d):
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(d, f, indent=2, ensure_ascii=False)

# ---------- sending messages ----------
def send(to, payload):
    body = {"messaging_product": "whatsapp", "to": to, **payload}
    if DRY_RUN or not WA_TOKEN:
        outbox.append(body); print("[DRY RUN] to", to, json.dumps(payload, ensure_ascii=False)[:300]); return
    r = requests.post(f"https://graph.facebook.com/v21.0/{PHONE_ID}/messages",
                      headers={"Authorization": f"Bearer {WA_TOKEN}"}, json=body, timeout=15)
    if r.status_code >= 300: print("SEND ERROR", r.status_code, r.text)

def text(to, msg): send(to, {"type": "text", "text": {"body": msg}})

MENU = [
    ("fees", "Fees", "Check dues, pay by QR or link"),
    ("docs", "Documents", "Checklist of pending documents"),
    ("scholar", "Scholarship", "Eligibility and status"),
    ("bus", "Bus Pass", "Route and pass status"),
    ("faculty", "Faculty Status", "Who is available now"),
    ("alerts", "Alerts & Deadlines", "What is coming up"),
]
def menu(to, name=""):
    send(to, {"type": "interactive", "interactive": {
        "type": "list", "body": {"text": f"Hi {name}! I give verified answers only.\nWhat do you need help with?"},
        "action": {"button": "Open menu", "sections": [{"title": "CampusMitra", "rows":
            [{"id": i, "title": t, "description": d} for i, t, d in MENU]}]}}})

# ---------- answers (all from data.json, never guessed) ----------
def ans_fees(s):
    rows = [f"{'✅' if f['paid'] else '⏳'} {f['item']}: ₹{f['amount']:,}" for f in s["fees"]]
    due = sum(f["amount"] for f in s["fees"] if not f["paid"])
    tail = (f"\n*Total due: ₹{due:,}*\nLast date: {s['fee_due_date']}\nPay here: {s['fee_pay_link']}") if due else "\nAll fees paid. 🎉"
    return "💳 *Fees*\n" + "\n".join(rows) + tail

def ans_docs(s):
    rows = [f"{'✅' if d['submitted'] else '⏳'} {d['name']}" for d in s["documents"]]
    pend = sum(1 for d in s["documents"] if not d["submitted"])
    tail = (f"\n*{pend} pending.* Last date: {s['doc_due_date']}\nChecklist: {s['doc_drive_link']}") if pend else "\nAll documents submitted. 🎉"
    return "📄 *Documents*\n" + "\n".join(rows) + tail

def ans_scholar(s):
    c = s["scholarship"]
    return f"🎓 *Scholarship*\nStatus: {c['status']}\nLast date: {c['last_date']}\n{c['note']}"

def ans_bus(s):
    b = s["bus"]
    return f"🚌 *Bus Pass*\nRoute: {b['route']}\nPass: {b['pass']}\n(Live tracking is coming soon.)"

def ans_faculty(d):
    rows = [f"{'🟢' if f['available'] else '🔴'} {f['name']} ({f['dept']}): {'Available' if f['available'] else 'Not available'}" for f in d["faculty"].values()]
    return "👨‍🏫 *Faculty Status* (live)\n" + "\n".join(rows)

def ans_alerts(d):
    return "🔔 *Alerts & Deadlines*\n" + "\n".join(f"⚠️ {x['date']}: {x['what']}" for x in d["deadlines"])

def ask_claude(student, question, d):
    """Optional: Claude answers ONLY from this student's record. If not found, says contact admin."""
    if not ANTHROPIC_KEY: return None
    system = ("You are CampusMitra, a campus assistant. Answer ONLY using the JSON data given. "
              "If the answer is not in the data, do not guess: say you do not have it and tell the student to contact: "
              + d["admin_contact"] + ". Keep replies under 80 words, simple English.")
    try:
        r = requests.post("https://api.anthropic.com/v1/messages",
            headers={"x-api-key": ANTHROPIC_KEY, "anthropic-version": "2023-06-01", "content-type": "application/json"},
            json={"model": CLAUDE_MODEL, "max_tokens": 250, "system": system,
                  "messages": [{"role": "user", "content": f"DATA:\n{json.dumps({'student': student, 'faculty': d['faculty'], 'deadlines': d['deadlines']})}\n\nQUESTION: {question}"}]},
            timeout=20)
        return r.json()["content"][0]["text"]
    except Exception as e:
        print("Claude error:", e); return None

# ---------- login ----------
def start_otp(phone):
    code = f"{random.randint(0, 999999):06d}"
    sessions[phone] = {"step": "otp", "otp": code, "otp_exp": time.time() + 300, "until": 0}
    # DEMO: OTP is sent in the chat. In the final product it goes by SMS.
    text(phone, f"🔐 Your CampusMitra OTP is *{code}*. It is valid for 5 minutes.\n(Demo: sent here. Final version: SMS.)")
    text(phone, "Please type the 6-digit OTP.")

def find_student(d, phone):
    for enr, st in d["students"].items():
        if phone in st.get("phones", []): return enr, st
    return None, None

def handle_faculty(phone, fid, msg, d):
    m = msg.strip().upper()
    if m in ("ON", "OFF"):
        with lock:
            d = load(); d["faculty"][fid]["available"] = (m == "ON"); save(d)
        text(phone, f"✅ Status updated: *{'Available' if m == 'ON' else 'Not available'}*. Students will see this now.")
    else:
        text(phone, f"Hello {d['faculty'][fid]['name']}. Send *ON* when you are in your cabin and *OFF* when you leave.")

def handle(phone, msg, reply_id):
    d = load()
    for fid, f in d["faculty"].items():          # faculty path
        if f["phone"] and f["phone"] == phone:
            return handle_faculty(phone, fid, msg, d)
    s = sessions.get(phone, {"step": "new", "until": 0})
    low = msg.strip().lower()
    logged_in = time.time() < s.get("until", 0)

    if not logged_in:
        if s["step"] == "otp":
            if time.time() > s["otp_exp"]:
                return start_otp(phone) if low else None
            if low == s["otp"]:
                sessions[phone] = {"step": "menu", "until": time.time() + 1800}
                text(phone, "✅ Login successful. Your identity is verified. 🔒")
                return menu(phone, find_student(d, phone)[1]["name"].split()[0])
            return text(phone, "❌ Wrong OTP. Please try again.")
        if s["step"] == "enroll":
            parts = msg.strip().split()
            if len(parts) == 2:
                for enr, st in d["students"].items():     # link a new phone: enrollment number AND date of birth must match
                    if enr.lower() == parts[0].lower() and st.get("dob") == parts[1]:
                        with lock:
                            d = load(); d["students"][enr].setdefault("phones", []).append(phone); save(d)
                        return start_otp(phone)
            return text(phone, "❌ Details did not match. Type enrollment number and date of birth like:\nMU2024001 01-01-2005\nOr contact: " + d["admin_contact"])
        if find_student(d, phone)[1]:
            text(phone, "👋 Welcome to *CampusMitra AI*. To keep your data safe, I will verify you first.")
            return start_otp(phone)
        sessions[phone] = {"step": "enroll", "until": 0}
        return text(phone, "👋 Welcome to *CampusMitra AI*. This number is not registered yet.\nPlease type your *enrollment number and date of birth* (DD-MM-YYYY) to link it.\nExample: MU2024001 01-01-2005")

    # logged in
    student = find_student(d, phone)[1]
    choice = reply_id or {"fees": "fees", "documents": "docs", "docs": "docs", "scholarship": "scholar",
                          "bus": "bus", "bus pass": "bus", "faculty": "faculty", "alerts": "alerts"}.get(low)
    if low in ("hi", "hello", "menu", "start"): return menu(phone, student["name"].split()[0])
    if low == "logout":
        sessions.pop(phone, None); return text(phone, "You are logged out. Type Hi to start again.")
    answers = {"fees": lambda: ans_fees(student), "docs": lambda: ans_docs(student), "scholar": lambda: ans_scholar(student),
               "bus": lambda: ans_bus(student), "faculty": lambda: ans_faculty(d), "alerts": lambda: ans_alerts(d)}
    if choice in answers:
        text(phone, answers[choice]())
        return text(phone, "Type *Menu* for more options.")
    reply = ask_claude(student, msg, d)
    if reply: return text(phone, reply)
    text(phone, "I only give verified answers, so I do not guess. Please pick from the menu, or contact: " + d["admin_contact"])
    menu(phone, student["name"].split()[0])

# ---------- web routes ----------
@app.get("/")
def home(): return "CampusMitra bot is running."

@app.get("/webhook")
def verify():
    if request.args.get("hub.mode") == "subscribe" and request.args.get("hub.verify_token") == VERIFY_TOKEN:
        return request.args.get("hub.challenge", ""), 200
    return "Verification failed", 403

@app.post("/webhook")
def incoming():
    data = request.get_json(silent=True) or {}
    try:
        for entry in data.get("entry", []):
            for ch in entry.get("changes", []):
                for m in ch["value"].get("messages", []):
                    if m["id"] in seen_ids: continue
                    seen_ids.add(m["id"])
                    reply_id, body = None, ""
                    if m["type"] == "text": body = m["text"]["body"]
                    elif m["type"] == "interactive":
                        it = m["interactive"]; sel = it.get("list_reply") or it.get("button_reply") or {}
                        reply_id, body = sel.get("id"), sel.get("title", "")
                    else: body = ""
                    if body or reply_id:
                        try: handle(m["from"], body, reply_id)
                        except Exception as e: print("HANDLE ERROR:", e)
    except Exception as e:
        print("WEBHOOK ERROR:", e)
    return jsonify(ok=True)   # always answer 200 so Meta does not keep retrying

@app.get("/demo_alert")   # open: /demo_alert?key=demo123&to=91XXXXXXXXXX  (works if the student messaged in the last 24h)
def demo_alert():
    if request.args.get("key") != ADMIN_KEY: return "forbidden", 403
    to = request.args.get("to", ""); d = load()
    text(to, "🔔 *Reminder*\n" + "\n".join(f"⚠️ {x['date']}: {x['what']}" for x in d["deadlines"][:2]))
    return "alert sent"

if __name__ == "__main__":
    app.run(port=5000)
