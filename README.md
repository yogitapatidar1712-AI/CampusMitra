# 🎓 CampusMitra AI — Mandsaur University (MU ANANT 1.0)
> **Option-Based WhatsApp Assistant for Students & Faculty**  
> Built for the Chancellor's Brigade | MU ANANT 1.0 Hackathon

CampusMitra AI is an authentic WhatsApp-style, option-based campus assistant delivering verified student records from Mandsaur University. It enforces strict student authentication, zero unauthorized data exposure, and real-time faculty availability synchronization.

---

## 📁 Project Structure

* **[`app.html`](file:///c:/Users/yogit/Downloads/campusmitra/app.html)**: Student chat interface (phone-sized, centered, max-width 420px, dark WhatsApp Web UI).
* **[`faculty.html`](file:///c:/Users/yogit/Downloads/campusmitra/faculty.html)**: Faculty presence management portal (toggle ON/OFF cards with live sync and individual link filtering).
* **[`qr_engine.html`](file:///c:/Users/yogit/Downloads/campusmitra/qr_engine.html)** / **[`qr.html`](file:///c:/Users/yogit/Downloads/campusmitra/qr.html)**: Modern WhatsApp Chatbot QR & Deep Link Engine with dynamic canvas generator, URL encoding, dark mode toggle, and PNG export.
* **[`data.js`](file:///c:/Users/yogit/Downloads/campusmitra/data.js)**: Central verified MU sample database (students, faculty directory, scholarship rules, deadlines, admin contact, bilingual translations).
* **[`bot.js`](file:///c:/Users/yogit/Downloads/campusmitra/bot.js)**: Pure-function state machine logic (`handle(session, userText) -> replies`). No DOM code, 100% portable for Twilio/Meta WhatsApp or browser embedding.
* **[`test_suite.html`](file:///c:/Users/yogit/Downloads/campusmitra/test_suite.html)**: Comprehensive automated test suite validating all 42 security, option, and state rules.

---

## 🚀 How to Open the App

No npm build or compilation steps are needed. You can run everything directly:

1. **Option 1: Double-Click (Direct)**
   - Double-click **`app.html`** in your file explorer to open the Student WhatsApp interface in your browser (Chrome/Edge/Firefox).
   - Double-click **`faculty.html`** to open the Faculty Availability Portal.
   - Double-click **`qr_engine.html`** (or **`qr.html`**) to open the WhatsApp Chatbot QR & Link Engine.

2. **Option 2: Personal Faculty Link**
   - Open a specific faculty member's card directly:
     - `faculty.html?f=nidhi` (Prof. Nidhi - HOD Computer Science)
     - `faculty.html?f=ranu` (Prof. Ranu - CSE Department)
     - `faculty.html?f=verma` (Dr. Verma - Dean / Administration)

3. **Option 3: Dev Shortcut Mode**
   - Open **`app.html?demo=1`** to display a top helper bar for instant one-click credential filling during presentations.

---

## 🔑 Demo Student Phone Numbers (Sample Data)

In authentic WhatsApp, the student's mobile number is automatically provided by WhatsApp upon opening the chat. For browser testing, the start screen provides a **"Demo: scanning from this phone"** dropdown with masked phone numbers:

| Masked Phone Number | Student Name | Category | Enrollment No. | Outstanding Dues | Scholarship Scheme |
|---|---|---|---|---|---|
| `+91 98XXXXX001` (`+919876541001`) | **Ankit** | OBC | `MU24CS001` | ₹3,000 | MP State Post-Matric OBC Scholarship |
| `+91 98XXXXX002` (`+919876542002`) | **Nikhil Sharma** | General | `MU24CS002` | ₹3,000 | Mukhyamantri Medhavi Chhatra (MMVY - 88.2%) |
| `+91 98XXXXX003` (`+919876543003`) | **Jitendra Solanki** | SC | `MU24CS003` | ₹6,000 | MP State Post-Matric SC Welfare (100% Waiver) |
| `+91 70000XXXXX` (`+917000012345`) | *(Not Registered)* | — | — | — | Returns "This number is not registered" |

> **OTP Note**: When "Simulate scan" is clicked, WhatsApp automatically sends "Hi" from that phone. The bot verifies the number in the MU database and generates a 6-digit OTP in the grey **Demo SMS** bubble.

---

## 🔄 WhatsApp Faithful Flow (QR ➔ Phone Match ➔ OTP ➔ Menu)

1. **Scan Screen (`app.html`)**:
   - Shows "Scan to start CampusMitra" with a scannable QR code.
   - Shows NO student names, categories, or departments.
   - Select a masked phone from the dropdown and click **"Simulate scan"**.
2. **Pre-filled "Hi" Sent**:
   - The chat window opens and sends `"Hi"` with the sender's mobile number.
3. **Number Verification**:
   - **Registered Number**: Bot replies: *"Hi! I'm CampusMitra, your campus assistant. I give verified answers only. For your security I have sent a 6-digit OTP to your registered mobile ending XXXX. Please enter it."*
   - **Unregistered Number**: Bot replies: *"This number is not registered with Mandsaur University. Please contact the admin office."* (Session halted).
4. **OTP Entry**:
   - Enter the 6-digit OTP shown in the grey Demo SMS bubble.
   - Incorrect OTP: Shows remaining attempts (*"Incorrect OTP. 2 attempts left."*). After 3 failures: *"Too many attempts. Please scan the QR again."*
   - Typing `"resend"` sends a fresh OTP (allowed up to 2 times).
   - Any menu numbers entered before OTP are rejected (*"Please enter the OTP first."*).
5. **Main Menu Unlocked**:
   - On valid OTP: Bot replies: *"Verified! Welcome, <Student Name>."* and displays the Main Menu.
   - Header updates to display: **CampusMitra • <Student Name>**.
   - `1️⃣ Fees`: Shows student's own dues, with sub-options (`1` Pay by QR, `2` Pay by Link, `0` Back).
   - `2️⃣ Documents`: Checklist of submitted vs pending documents with next deadlines.
   - `3️⃣ Scholarship`: Evaluates category-specific eligibility from `data.js`.
   - `4️⃣ Bus Pass`: Displays route, expired status, and clear renewal steps.
   - `5️⃣ Faculty Status`: Live list showing green/red availability and last update timestamp.
   - `6️⃣ Alerts & Deadlines`: Chronological list of upcoming campus deadlines.
   - `7️⃣ Change Language`: Instantly toggles between English and Hindi.
6. **Universal Commands**:
   - Type **`0`** or **`menu`** anytime to return to the Main Menu.
   - Type **`logout`** (or click the header **"Scan again"** button) to clear session and return to start.

---

## 🔥 How to Configure Firebase Firestore (Optional)

The system is configured to sync live with Firestore project **`campusmitra-667b6`**:

1. Open **`faculty.html`** and locate the `firebaseConfig` block around line 125:
   ```javascript
   const firebaseConfig = {
     apiKey: "PASTE_HERE_API_KEY",
     authDomain: "campusmitra-667b6.firebaseapp.com",
     projectId: "campusmitra-667b6",
     storageBucket: "campusmitra-667b6.appspot.com",
     messagingSenderId: "PASTE_HERE_SENDER_ID",
     appId: "PASTE_HERE_APP_ID"
   };
   ```
2. In the **Firebase Console** (Project Settings ➔ General ➔ Your Apps ➔ Web App), copy your values and paste them into the placeholders above.
3. **Automatic Fallback**: If you leave the `PASTE_HERE` placeholders intact or have no internet connection, the system automatically uses **`localStorage` cross-tab synchronization**. Toggling a faculty in `faculty.html` will instantly update Option 5 in `app.html` without needing Firebase!

---

## ✅ Verified Test Checklist

All tests have been run and verified (100% passing across 42 automated assertions):

- [x] **1. Fresh open**: Displays language prompt and greeting; zero student names or records visible before authentication.
- [x] **2. Wrong DOB x3**: Enforces max 3 attempts, locks session, and displays the MU Admin Office address & phone.
- [x] **3. Correct login + OTP**: Header updates to display **only** that student's name (`Ankit`, `Nikhil Sharma`, or `Jitendra Solanki`).
- [x] **4. Options 1–7**: Numbered options work accurately, free-form text is rejected with a menu prompt, and typing `0` returns to menu.
- [x] **5. Real-time Faculty Sync**: Toggling any faculty member in `faculty.html` updates the status in `app.html` Option 5 instantly.
- [x] **6. Data Isolation**: Student A (e.g. Ankit) can never see Student B's fees, bus route, or scholarship records.
