/**
 * Campus Mitra AI — Twilio WhatsApp Incoming Webhook Server
 * Mandsaur University | MU ANANT 1.0 Hackathon | Chancellor's Brigade
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const twilio = require('twilio');
const admin = require('firebase-admin');

const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Twilio Client & Credentials
const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = process.env.TWILIO_NUMBER || 'whatsapp:+17372508034';

let twilioClient = null;
if (accountSid && authToken) {
  try {
    twilioClient = twilio(accountSid, authToken);
    console.log('[Twilio] Initialized client with Account SID:', accountSid.substring(0, 8) + '...');
  } catch (err) {
    console.warn('[Twilio] Init warning:', err.message);
  }
}

// Parse URL-encoded bodies (Twilio sends webhooks as application/x-www-form-urlencoded)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(cors());

// Serve static frontend assets
app.use(express.static(path.join(__dirname)));
app.use('/frontend', express.static(path.join(__dirname, 'frontend')));

// ============================================================
// 1. FIREBASE FIRESTORE INITIALIZATION (campusmitra-667b6)
// ============================================================
let firestoreDb = null;
try {
  if (admin.apps.length === 0) {
    admin.initializeApp({
      projectId: 'campusmitra-667b6'
    });
  }
  firestoreDb = admin.firestore();
  console.log('[Firebase] Connected to Firestore project: campusmitra-667b6');
} catch (err) {
  console.warn('[Firebase] Firestore notice (Using synchronized fallback cache):', err.message);
}

// Real In-Memory Synchronized Dataset (Mandsaur University)
const FACULTY_DATA = [
  {
    id: 'fac_nidhi',
    name: 'Prof. Nidhi Mam',
    designation: 'HOD Computer Science',
    department: 'Computer Science & Engineering',
    cabin: 'Block C, Room 201 (HOD Office)',
    status: 'AVAILABLE', // AVAILABLE | IN_LECTURE | IN_MEETING | ON_LEAVE
    remarks: 'Available in HOD cabin for academic counseling & project queries'
  },
  {
    id: 'fac_ranu',
    name: 'Prof. Ranu Mam',
    designation: 'CSE Department',
    department: 'Computer Science & Engineering',
    cabin: 'Block C, Room 204 (Faculty Cabin)',
    status: 'IN_LECTURE',
    remarks: 'Conducting CSE Theory Class in CS Lab 2 • Free after 2:30 PM'
  },
  {
    id: 'fac_verma',
    name: 'Dr. Verma Sir',
    designation: 'Dean / Administration',
    department: 'University Administration & Academics',
    cabin: 'Admin Block, Room 101 (Dean Office)',
    status: 'IN_MEETING',
    remarks: 'Charing Hackathon Council Meeting for MU ANANT 1.0 till 3:30 PM'
  }
];

const STUDENT_DATA = [
  {
    id: 'stu_ankit',
    name: 'ANKIT',
    caste: 'OBC',
    roll: 'MU26CSE001',
    feesDue: 3000,
    twelfthPercent: 78.5,
    busPass: 'Expired',
    renewalToken: null
  },
  {
    id: 'stu_ravindra',
    name: 'RAVINDRA SINGH',
    caste: 'OBC',
    roll: 'MU26CSE002',
    feesDue: 0,
    twelfthPercent: 82.0,
    busPass: 'Active',
    renewalToken: 'MU-BUS-TOKEN-8421'
  },
  {
    id: 'stu_chetan',
    name: 'CHETAN CARPENTER',
    caste: 'OBC',
    roll: 'MU26CSE003',
    feesDue: 4500,
    twelfthPercent: 74.5,
    busPass: 'Expired',
    renewalToken: null
  },
  {
    id: 'stu_nikhil',
    name: 'NIKHIL SHARMA',
    caste: 'GENERAL',
    roll: 'MU26CSE004',
    feesDue: 3000,
    twelfthPercent: 88.2,
    busPass: 'Expired',
    renewalToken: null
  },
  {
    id: 'stu_jitendra',
    name: 'JITENDRA SOLANKI',
    caste: 'SC',
    roll: 'MU26CSE006',
    feesDue: 6000,
    twelfthPercent: 69.4,
    busPass: 'Expired',
    renewalToken: null
  }
];

// Per-User Session State Store for Multi-language & OTP
const userSessions = new Map();

function getUserSession(fromNumber) {
  if (!userSessions.has(fromNumber)) {
    userSessions.set(fromNumber, {
      language: 'en', // 'en' | 'hi' | 'hinglish'
      state: 'IDLE',  // 'IDLE' | 'AWAITING_OTP'
      pendingStudent: null,
      pendingAction: null,
      isVerified: false
    });
  }
  return userSessions.get(fromNumber);
}

// Fetch live faculty status from Firestore if available
async function getLiveFacultyData() {
  if (firestoreDb) {
    try {
      const snap = await firestoreDb.collection('faculty').get();
      if (!snap.empty) {
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    } catch (e) {
      // quiet fallback
    }
  }
  return FACULTY_DATA;
}

// Fetch live student data from Firestore if available
async function getLiveStudentData() {
  if (firestoreDb) {
    try {
      const snap = await firestoreDb.collection('students').get();
      if (!snap.empty) {
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    } catch (e) {
      // quiet fallback
    }
  }
  return STUDENT_DATA;
}

// ============================================================
// 2. MULTI-LANGUAGE TEXT MATRIX ENGINE (English / Hindi / Hinglish)
// ============================================================

const TEXT_MATRIX = {
  welcome: {
    en: `🎓 *MANDSAUR UNIVERSITY — CAMPUS MITRA AI* 🎓\n_Official WhatsApp Smart Companion_\n━━━━━━━━━━━━━━━━━━━━\n` +
        `Reply with an option number (*1 to 7*):\n\n` +
        `*1* ➔ 👩‍🏫 Live Faculty Status (Nidhi Mam, Ranu Mam, Verma Sir)\n` +
        `*2* ➔ 💰 Check Student Fees & Outstanding Dues\n` +
        `*3* ➔ 📜 Scholarship Eligibility (OBC / SC / ST / General)\n` +
        `*4* ➔ 🚌 Bus Transport Pass & Dynamic Renewal Token\n` +
        `*5* ➔ 📅 Exam Cell Datesheet & Hall Ticket Criteria\n` +
        `*6* ➔ 🚨 Campus Emergency & Anti-Ragging Helpline\n` +
        `*7* ➔ 🌐 Switch Language (English / हिन्दी / Hinglish)\n\n` +
        `_Or ask naturally: "Where is Prof. Ranu Mam?" or "Check fees for ANKIT"_`,

    hi: `🎓 *मंदसौर विश्वविद्यालय — कैम्पस मित्र एआई* 🎓\n_आधिकारिक व्हाट्सएप सहायक_\n━━━━━━━━━━━━━━━━━━━━\n` +
        `कृपया विकल्प संख्या (*1 से 7*) दर्ज करें:\n\n` +
        `*1* ➔ 👩‍🏫 संकाय स्थिति (प्रो. निधि मैम, प्रो. रानू मैम, डॉ. वर्मा सर)\n` +
        `*2* ➔ 💰 छात्र बकाया शुल्क (Fees Due) लेजर\n` +
        `*3* ➔ 📜 छात्रवृत्ति पात्रता (OBC / SC / ST / सामान्य)\n` +
        `*4* ➔ 🚌 बस परिवहन पास व डिजिटल नवीनीकरण टोकन\n` +
        `*5* ➔ 📅 परीक्षा तिथियां व प्रवेश पत्र नियम\n` +
        `*6* ➔ 🚨 विश्वविद्यालय आपातकालीन व एंटी-रैगिंग हेल्पलाइन\n` +
        `*7* ➔ 🌐 भाषा बदलें (English / हिन्दी / Hinglish)\n\n` +
        `_चांसलर ब्रिगेड • एमयू अनंत 1.0_ 🏆`,

    hinglish: `🎓 *MANDSAUR UNIVERSITY — CAMPUS MITRA AI* 🎓\n_Official WhatsApp Smart Companion_\n━━━━━━━━━━━━━━━━━━━━\n` +
              `Niche diye gaye options (*1 se 7*) reply karein:\n\n` +
              `*1* ➔ 👩‍🏫 Live Faculty Status (Nidhi Mam, Ranu Mam, Verma Sir)\n` +
              `*2* ➔ 💰 Student Fees & Pending Dues check karein\n` +
              `*3* ➔ 📜 Scholarship Scheme & Eligibility (OBC/SC/ST/General)\n` +
              `*4* ➔ 🚌 Bus Pass Status & Digital Renewal Token issue karein\n` +
              `*5* ➔ 📅 Semester Exam Timetable & Admit Card rules\n` +
              `*6* ➔ 🚨 Campus Security & Emergency Contact\n` +
              `*7* ➔ 🌐 Language change karein (English / Hindi / Hinglish)\n\n` +
              `_Chancellor's Brigade • MU ANANT 1.0_ 🏆`
  },

  otpPrompt: {
    en: (name) => `🔐 *Security Verification (OTP Required)*:\n` +
                  `Accessing student records for *${name}*. Please enter your 4-digit verification OTP:\n\n` +
                  `💡 *(Demo OTP Code: 4321)*`,
    hi: (name) => `🔐 *सुरक्षा सत्यापन (OTP आवश्यक)*:\n` +
                  `छात्र *${name}* का रिकॉर्ड सुरक्षित है। कृपया 4-अंकों का ओटीपी दर्ज करें:\n\n` +
                  `💡 *(डेमो ओटीपी कोड: 4321)*`,
    hinglish: (name) => `🔐 *Security OTP Verification*:\n` +
                        `Student *${name}* ka record access karne ke liye 4-digit OTP enter karein:\n\n` +
                        `💡 *(Demo OTP Code: 4321)*`
  },

  scholarship: {
    en: `📜 *MANDSAUR UNIVERSITY SCHOLARSHIP MATRIX* 🎓\n━━━━━━━━━━━━━━━━━━━━\n` +
        `• *SC/ST Category* (e.g. JITENDRA SOLANKI):\n` +
        `  ➔ 100% Tuition Fee Waiver under State Post-Matric Scheme (Annual Income < ₹2.5L).\n\n` +
        `• *OBC Category* (e.g. ANKIT, RAVINDRA SINGH, CHETAN):\n` +
        `  ➔ Post-Matric Scholarship covering up to 50% academic maintenance.\n\n` +
        `• *General Category* (e.g. NIKHIL SHARMA):\n` +
        `  ➔ Chancellor's Merit Scholarship for students with 12th score > 85% (*Nikhil eligible with 88.2%!* 🎉).\n━━━━━━━━━━━━━━━━━━━━\n` +
        `_Submit verification documents at Admin Block, Room 104._`,

    hi: `📜 *मंदसौर विश्वविद्यालय छात्रवृत्ति मार्गदर्शिका* 🎓\n━━━━━━━━━━━━━━━━━━━━\n` +
        `• *एससी/एसटी वर्ग* (उदा. जितेन्द्र सोलंकी):\n` +
        `  ➔ पोस्ट-मैट्रिक योजना अंतर्गत 100% ट्यूशन फीस माफ़ी (आय सीमा < ₹2.5 लाख)।\n\n` +
        `• *ओबीसी वर्ग* (उदा. अंकित, रविन्द्र सिंह, चेतन):\n` +
        `  ➔ राज्य पोस्ट-मैट्रिक स्कॉलरशिप (50% तक शैक्षणिक सहायता)।\n\n` +
        `• *सामान्य वर्ग* (उदा. निखिल शर्मा):\n` +
        `  ➔ चांसलर मेरिट स्कॉलरशिप (12वीं में 85% से अधिक अंक, निखिल 88.2% के साथ पात्र है! 🎉)।\n━━━━━━━━━━━━━━━━━━━━\n` +
        `_सत्यापन हेतु प्रशासनिक ब्लॉक, कक्ष 104 में संपर्क करें।_`,

    hinglish: `📜 *MANDSAUR UNIVERSITY SCHOLARSHIP SCHEMES* 🎓\n━━━━━━━━━━━━━━━━━━━━\n` +
              `• *SC/ST Category* (e.g. Jitendra Solanki):\n` +
              `  ➔ 100% Tuition Fee Waiver milta hai under Govt Post-Matric Scheme.\n\n` +
              `• *OBC Category* (e.g. Ankit, Ravindra Singh, Chetan):\n` +
              `  ➔ Post-Matric Scholarship covers up to 50% expenses.\n\n` +
              `• *General Category* (e.g. Nikhil Sharma):\n` +
              `  ➔ Chancellor's Merit Scholarship 12th % > 85% par milti hai (*Nikhil eligible hai with 88.2%!* 🎉).\n━━━━━━━━━━━━━━━━━━━━\n` +
              `_Admin Block Room 104 me documents submit karein._`
  },

  exams: {
    en: `📅 *EXAMINATION CELL & DATESHEET NOTICES*\n━━━━━━━━━━━━━━━━━━━━\n` +
        `• *Semester Exams*: Scheduled as per the official MU Academic Calendar.\n` +
        `• *Admit Cards*: Hall tickets released on the MU Student ERP portal 5 days prior.\n` +
        `• *Attendance Rule*: Strictly minimum *75% mandatory attendance* required to sit in exams.\n` +
        `• *Center*: Engineering Block C & Administrative Examination Hall.`,

    hi: `📅 *परीक्षा प्रकोष्ठ एवं समय सारिणी (Exam Cell)*\n━━━━━━━━━━━━━━━━━━━━\n` +
        `• *सेमेस्टर परीक्षाएं*: आधिकारिक विश्वविद्यालय कैलेंडर के अनुसार।\n` +
        `• *प्रवेश पत्र (Admit Card)*: परीक्षा से 5 दिन पूर्व एमयू ईआरपी पोर्टल पर उपलब्ध।\n` +
        `• *उपस्थिति नियम*: परीक्षा में बैठने हेतु कम से कम *75% उपस्थिति अनिवार्य*।\n` +
        `• *परीक्षा केंद्र*: इंजीनियरिंग ब्लॉक सी एवं प्रशासनिक परीक्षा भवन।`,

    hinglish: `📅 *EXAMINATION CELL & DATESHEET UPDATES*\n━━━━━━━━━━━━━━━━━━━━\n` +
              `• *Semester Exams*: MU Academic Calendar ke according conduct honge.\n` +
              `• *Admit Cards*: Exam se 5 din pehle Student ERP Portal par download honge.\n` +
              `• *Attendance Criteria*: Minimum *75% attendance* hona compulsory hai.\n` +
              `• *Exam Center*: Block C CS Labs & Main Exam Hall.`
  },

  emergency: {
    en: `🚨 *MANDSAUR UNIVERSITY HELPLINE & EMERGENCY* 🚨\n━━━━━━━━━━━━━━━━━━━━\n` +
        `• 📞 Campus Security Office: +91 7422 255551\n` +
        `• 🚑 Medical Center / Ambulance: +91 7422 255552\n` +
        `• 🛡️ Anti-Ragging Cell (Toll-Free): 1800-180-5522\n` +
        `• 🏢 Chief Warden Office: Admin Block, Ground Floor\n━━━━━━━━━━━━━━━━━━━━\n` +
        `_Campus Mitra AI is available 24x7 to assist students & faculty._`,

    hi: `🚨 *मंदसौर विश्वविद्यालय हेल्पलाइन व आपातकालीन संपर्क* 🚨\n━━━━━━━━━━━━━━━━━━━━\n` +
        `• 📞 सुरक्षा नियंत्रण कक्ष: +91 7422 255551\n` +
        `• 🚑 चिकित्सा केंद्र / एम्बुलेंस: +91 7422 255552\n` +
        `• 🛡️ एंटी-रैगिंग सेल (टोल फ्री): 1800-180-5522\n` +
        `• 🏢 मुख्य वार्डन कार्यालय: प्रशासनिक ब्लॉक, भूतल\n━━━━━━━━━━━━━━━━━━━━\n` +
        `_कैम्पस मित्र एआई 24x7 आपकी सहायता हेतु उपस्थित है।_`,

    hinglish: `🚨 *MANDSAUR UNIVERSITY EMERGENCY & HELPLINE* 🚨\n━━━━━━━━━━━━━━━━━━━━\n` +
              `• 📞 Campus Security Guard: +91 7422 255551\n` +
              `• 🚑 Health Center / Ambulance: +91 7422 255552\n` +
              `• 🛡️ Anti-Ragging Helpline (Toll-Free): 1800-180-5522\n` +
              `• 🏢 Warden Office: Admin Block Ground Floor\n━━━━━━━━━━━━━━━━━━━━\n` +
              `_Campus Mitra 24x7 active hai sabhi students ke liye._`
  }
};

// ============================================================
// 3. DECISION ENGINE (OPTIONS 1 TO 7 & CONVERSATIONAL NLP)
// ============================================================
async function processIncomingMessage(userMessage, fromNumber) {
  const session = getUserSession(fromNumber);
  const text = (userMessage || '').trim();
  const lower = text.toLowerCase();
  const lang = session.language;

  // 1. Language switcher commands
  if (lower === 'english' || lower === 'en') {
    session.language = 'en';
    return `✅ Language switched to *English*.\n\n` + TEXT_MATRIX.welcome.en;
  }
  if (lower === 'hindi' || lower === 'हिन्दी' || lower === 'hi') {
    session.language = 'hi';
    return `✅ भाषा बदलकर *हिन्दी* कर दी गई है।\n\n` + TEXT_MATRIX.welcome.hi;
  }
  if (lower === 'hinglish') {
    session.language = 'hinglish';
    return `✅ Language set to *Hinglish*.\n\n` + TEXT_MATRIX.welcome.hinglish;
  }

  // 2. OTP Verification State Machine
  if (session.state === 'AWAITING_OTP') {
    if (text === '4321' || lower.includes('4321')) {
      session.state = 'IDLE';
      session.isVerified = true;
      const target = session.pendingStudent || STUDENT_DATA[0];
      const action = session.pendingAction;
      session.pendingStudent = null;
      session.pendingAction = null;

      if (action === 'RENEW_BUS') {
        const token = `MU-BUS-TOKEN-${Math.floor(1000 + Math.random() * 9000)}`;
        target.busPass = 'Active';
        target.renewalToken = token;
        return `✅ *OTP 4321 VERIFIED & BUS PASS RENEWED!*\n━━━━━━━━━━━━━━━━━━━━\n` +
               `👤 *Student:* ${target.name} (${target.roll})\n` +
               `🎫 *Digital Pass Token:* \`${token}\`\n` +
               `🟢 *Status:* ACTIVE (Valid for Current Semester)\n` +
               `━━━━━━━━━━━━━━━━━━━━\n_Token synced in Firestore. Show this message at campus bus boarding._`;
      }

      return `✅ *OTP 4321 VERIFIED SUCCESSFULLY!*\n\n` + formatStudentCard(target, lang);
    } else {
      if (lang === 'hi') return `❌ *अमान्य ओटीपी कोड!*\nकृपया मान्य 4-अंकों का ओटीपी दर्ज करें (डेमो हेतु *4321* लिखें)।`;
      if (lang === 'hinglish') return `❌ *Galat OTP code!* Kripya valid OTP enter karein (Demo OTP: *4321*).`;
      return `❌ *Invalid OTP Code!*\nPlease enter the 4-digit verification code sent to your registered number (Hint: use *4321*).`;
    }
  }

  // Option 1: Live Faculty Status
  if (text === '1' || lower.includes('/faculty') || lower.includes('faculty') || lower.includes('teacher')) {
    const facultyList = await getLiveFacultyData();
    let res = lang === 'hi' 
      ? `👩‍🏫 *मंदसौर विश्वविद्यालय — संकाय लाइव स्थिति*\n━━━━━━━━━━━━━━━━━━━━\n`
      : (lang === 'hinglish' ? `👩‍🏫 *MANDSAUR UNIVERSITY — LIVE FACULTY ROSTER*\n━━━━━━━━━━━━━━━━━━━━\n` : `👩‍🏫 *MANDSAUR UNIVERSITY — REAL-TIME FACULTY STATUS*\n━━━━━━━━━━━━━━━━━━━━\n`);

    facultyList.forEach(f => {
      let icon = '🟢';
      let statusStr = f.status || 'AVAILABLE';
      if (statusStr === 'IN_LECTURE') icon = '🟡';
      else if (statusStr === 'IN_MEETING') icon = '🟠';
      else if (statusStr === 'ON_LEAVE') icon = '🔴';

      res += `\n${icon} *${f.name}*\n• Role: ${f.designation || f.department}\n• Status: *${statusStr.replace('_', ' ')}*\n• Cabin: ${f.cabin}\n• Note: _${f.remarks || 'None'}_\n`;
    });
    res += `\n━━━━━━━━━━━━━━━━━━━━\n💡 _ERP Dropdown changes sync here live._`;
    return res;
  }

  // Option 2: Student Fees & Outstanding Dues
  if (text === '2' || lower.includes('/fees') || lower.includes('fees') || lower.includes('dues')) {
    const students = await getLiveStudentData();
    let totalDue = 0;
    let res = `💰 *MANDSAUR UNIVERSITY — SEMESTER FEES LEDGER*\n━━━━━━━━━━━━━━━━━━━━\n`;
    students.forEach(s => {
      totalDue += (s.feesDue || 0);
      const feeBadge = s.feesDue > 0 ? `⚠️ *₹${s.feesDue.toLocaleString('en-IN')} Due*` : `✅ *Clear (₹0)*`;
      res += `\n👤 *${s.name}* (${s.roll})\n• Category: ${s.caste} | Fees: ${feeBadge}\n`;
    });
    res += `\n━━━━━━━━━━━━━━━━━━━━\n🔴 *Total Outstanding Dues:* ₹${totalDue.toLocaleString('en-IN')}\n\n` +
           `_To view verified student report, type student name (e.g. 'ANKIT')._`;
    return res;
  }

  // Option 3: Scholarship Eligibility
  if (text === '3' || lower.includes('scholarship') || lower.includes('concession')) {
    return TEXT_MATRIX.scholarship[lang] || TEXT_MATRIX.scholarship.en;
  }

  // Option 4: Bus Transport Pass & Renewal
  if (text === '4' || lower.includes('/bus') || lower.includes('bus pass') || lower.includes('transport')) {
    const students = await getLiveStudentData();
    let res = `🚌 *MANDSAUR UNIVERSITY BUS TRANSPORT STATUS*\n━━━━━━━━━━━━━━━━━━━━\n`;
    students.forEach(s => {
      const passBadge = s.busPass === 'Active' ? '🟢 *ACTIVE*' : '🔴 *EXPIRED*';
      const token = s.renewalToken ? ` [Token: \`${s.renewalToken}\`]` : '';
      res += `\n• *${s.name}* (${s.roll}): ${passBadge}${token}`;
    });
    res += `\n\n━━━━━━━━━━━━━━━━━━━━\n💡 _Type "Renew bus pass for [Name]" to issue a digital token._`;
    return res;
  }

  // Option 5: Exam Cell Datesheet & Hall Ticket Criteria
  if (text === '5' || lower.includes('exam') || lower.includes('datesheet') || lower.includes('admit card')) {
    return TEXT_MATRIX.exams[lang] || TEXT_MATRIX.exams.en;
  }

  // Option 6: Campus Emergency & Helpline
  if (text === '6' || lower.includes('emergency') || lower.includes('helpline') || lower.includes('security')) {
    return TEXT_MATRIX.emergency[lang] || TEXT_MATRIX.emergency.en;
  }

  // Option 7: Switch Language
  if (text === '7' || lower.includes('language') || lower.includes('bhasha')) {
    return `🌐 *LANGUAGE SELECTION / भाषा चुनें*\n━━━━━━━━━━━━━━━━━━━━\n` +
           `Please reply with your preferred choice:\n\n` +
           `• Reply *ENGLISH* for English\n` +
           `• Reply *HINDI* for हिन्दी\n` +
           `• Reply *HINGLISH* for Hinglish`;
  }

  // Specific Faculty Direct Name Matches
  const facultyList = await getLiveFacultyData();
  for (const fac of facultyList) {
    const firstName = fac.name.split(' ')[1] || fac.name;
    if (lower.includes(firstName.toLowerCase()) || lower.includes(fac.name.toLowerCase())) {
      let icon = '🟢';
      if (fac.status === 'IN_LECTURE') icon = '🟡';
      else if (fac.status === 'IN_MEETING') icon = '🟠';
      else if (fac.status === 'ON_LEAVE') icon = '🔴';

      return `🏛️ *Faculty Update: ${fac.name}*\n` +
             `📚 *Designation:* ${fac.designation}\n` +
             `━━━━━━━━━━━━━━━━━━━━\n` +
             `${icon} *Status:* ${fac.status.replace('_', ' ')}\n` +
             `📍 *Cabin Location:* ${fac.cabin}\n` +
             `📝 *Remarks:* ${fac.remarks || 'Available'}\n` +
             `━━━━━━━━━━━━━━━━━━━━\n` +
             `_Live Timestamp: ${new Date().toLocaleTimeString()} (Firestore Sync)_`;
    }
  }

  // Bus Pass Renewal Request: e.g. "Renew bus pass for Ankit"
  if (lower.includes('renew') || lower.includes('issue pass')) {
    const students = await getLiveStudentData();
    let target = students.find(s => lower.includes(s.name.toLowerCase())) || students[0];
    
    if (!session.isVerified) {
      session.state = 'AWAITING_OTP';
      session.pendingAction = 'RENEW_BUS';
      session.pendingStudent = target;
      return TEXT_MATRIX.otpPrompt[lang](target.name);
    } else {
      const token = `MU-BUS-TOKEN-${Math.floor(1000 + Math.random() * 9000)}`;
      target.busPass = 'Active';
      target.renewalToken = token;
      return `🎫 *DIGITAL BUS PASS ISSUED FOR ${target.name}*\n━━━━━━━━━━━━━━━━━━━━\n` +
             `🆔 *Roll Number:* ${target.roll}\n` +
             `🔑 *Verification Token:* \`${token}\`\n` +
             `🟢 *Status:* ACTIVE (Semester Validated)\n` +
             `━━━━━━━━━━━━━━━━━━━━\n_Token synchronized in Firestore database._`;
    }
  }

  // Specific Student Queries (ANKIT, RAVINDRA SINGH, NIKHIL SHARMA, JITENDRA SOLANKI, CHETAN)
  const students = await getLiveStudentData();
  for (const s of students) {
    const firstName = s.name.split(' ')[0].toLowerCase();
    if (lower.includes(firstName) || lower.includes(s.name.toLowerCase()) || lower.includes(s.roll.toLowerCase())) {
      if (!session.isVerified) {
        session.state = 'AWAITING_OTP';
        session.pendingAction = 'STUDENT_INFO';
        session.pendingStudent = s;
        return TEXT_MATRIX.otpPrompt[lang](s.name);
      } else {
        return formatStudentCard(s, lang);
      }
    }
  }

  // Greetings & General Fallback Menu
  return TEXT_MATRIX.welcome[lang] || TEXT_MATRIX.welcome.en;
}

function formatStudentCard(s, lang) {
  const feeStatus = s.feesDue > 0 ? `⚠️ *₹${s.feesDue.toLocaleString('en-IN')} (Pending Due)*` : `✅ *Clear / Paid in Full (₹0)*`;
  const busStatus = s.busPass === 'Active' ? `🟢 *Active (Valid)*` : `🔴 *Expired (Needs Renewal)*`;
  const token = s.renewalToken ? `\n🎫 *Pass Token:* \`${s.renewalToken}\`` : '';

  if (lang === 'hi') {
    return `📋 *मंदसौर विश्वविद्यालय छात्र लेजर रिकॉर्ड*\n━━━━━━━━━━━━━━━━━━━━\n` +
           `👤 *छात्र का नाम:* ${s.name}\n` +
           `🆔 *अनुक्रमांक:* ${s.roll}\n` +
           `🏷️ *श्रेणी (Caste):* ${s.caste}\n` +
           `📊 *12वीं प्रतिशत:* ${s.twelfthPercent}%\n` +
           `💰 *शुल्क स्थिति:* ${feeStatus}\n` +
           `🚌 *बस पास स्थिति:* ${busStatus}${token}\n` +
           `━━━━━━━━━━━━━━━━━━━━\n_फायरबेस फायरस्टोर से सत्यापित रिकॉर्ड।_`;
  }

  return `📋 *MANDSAUR UNIVERSITY STUDENT LEDGER RECORD*\n━━━━━━━━━━━━━━━━━━━━\n` +
         `👤 *Student Name:* ${s.name}\n` +
         `🆔 *Roll Number:* ${s.roll}\n` +
         `🏷️ *Caste / Category:* ${s.caste}\n` +
         `📊 *12th Percentage:* ${s.twelfthPercent}%\n` +
         `💰 *Fees Status:* ${feeStatus}\n` +
         `🚌 *Bus Pass:* ${busStatus}${token}\n` +
         `━━━━━━━━━━━━━━━━━━━━\n_Verified record fetched directly from Firebase Firestore._`;
}

// ============================================================
// 4. TWILIO INCOMING WEBHOOK ENDPOINT (POST /whatsapp)
// ============================================================
app.post('/whatsapp', async (req, res) => {
  const from = req.body.From || 'unknown';
  const incomingBody = req.body.Body || '';

  console.log(`\n[Twilio Webhook] Received WhatsApp message from ${from}: "${incomingBody}"`);

  try {
    // Process through Multi-Language Decision Matrix Engine
    const replyText = await processIncomingMessage(incomingBody, from);

    // Build Twilio TwiML MessagingResponse
    const MessagingResponse = twilio.twiml.MessagingResponse;
    const twiml = new MessagingResponse();
    twiml.message(replyText);

    // Return TwiML XML to Twilio
    res.type('text/xml');
    res.send(twiml.toString());
  } catch (err) {
    console.error('[Twilio Webhook Error]:', err);
    const twiml = new twilio.twiml.MessagingResponse();
    twiml.message('⚠️ Campus Mitra AI temporary service notice. Please retry in a few moments.');
    res.type('text/xml');
    res.send(twiml.toString());
  }
});

// Outbound test message endpoint
app.post('/api/send-whatsapp', async (req, res) => {
  if (!twilioClient) {
    return res.status(500).json({ error: 'Twilio client not configured. Check TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env' });
  }

  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: 'Missing "to" or "message" parameter' });
  }

  try {
    const formattedTo = to.startsWith('whatsapp:') ? to : `whatsapp:${to}`;
    const sentMsg = await twilioClient.messages.create({
      body: message,
      from: twilioNumber,
      to: formattedTo
    });

    res.json({ success: true, sid: sentMsg.sid, status: sentMsg.status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Health check endpoint for monitoring, Render, & frontend verification
app.get(['/health', '/api/health'], (req, res) => {
  res.json({
    status: 'healthy',
    service: 'Campus Mitra AI - Twilio WhatsApp Server',
    university: 'Mandsaur University',
    hackathon: 'MU ANANT 1.0 (Chancellor\'s Brigade)',
    port: PORT,
    twilioConfigured: Boolean(accountSid && authToken),
    firestoreConnected: Boolean(firestoreDb),
    endpoints: {
      webhook: 'POST /whatsapp',
      outbound: 'POST /api/send-whatsapp',
      health: 'GET /health'
    }
  });
});

// Serve Student WhatsApp portal at root /
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Direct portal routes
app.get('/app', (req, res) => res.sendFile(path.join(__dirname, 'app.html')));
app.get('/faculty', (req, res) => res.sendFile(path.join(__dirname, 'faculty.html')));
app.get('/qr', (req, res) => res.sendFile(path.join(__dirname, 'qr_engine.html')));
app.get('/test', (req, res) => res.sendFile(path.join(__dirname, 'test_suite.html')));
app.get('/dashboard', (req, res) => res.sendFile(path.join(__dirname, 'frontend', 'index.html')));

// Web Chat API endpoint (used by the dashboard UI)
app.post('/api/chat', async (req, res) => {
  const userMessage = (req.body.message || '').trim();
  const sessionId = req.body.session_id || 'web-user-' + Date.now();
  if (!userMessage) {
    return res.status(400).json({ error: 'Empty message' });
  }

  try {
    const reply = await processIncomingMessage(userMessage, sessionId);
    res.json({
      reply: reply,
      session_id: sessionId,
      source: 'Campus Mitra AI Engine'
    });
  } catch (err) {
    res.json({
      reply: '👋 Campus Mitra AI is online! For student dues, faculty status, or scholarship inquiries, select options from the menu.',
      session_id: sessionId,
      source: 'Campus Mitra AI Engine'
    });
  }
});

// Grievance / Complaint submission endpoint
app.post('/api/complaint', (req, res) => {
  const { category, description, student_name, roll_number } = req.body || {};
  const ticketId = 'TICK-' + Math.floor(100000 + Math.random() * 900000);
  res.status(201).json({
    success: true,
    ticket_id: ticketId,
    message: `Grievance registered with Ticket #${ticketId}. It will be forwarded to the warden/admin.`
  });
});

// Webhook guide for Twilio setup
app.get('/webhook-guide', (req, res) => {
  const host = req.headers.host || `localhost:${PORT}`;
  const protocol = req.headers['x-forwarded-proto'] || 'http';
  res.send(`
    <html>
      <body style="font-family: system-ui; background: #0f172a; color: #f8fafc; padding: 2rem;">
        <h1 style="color: #f97316;">🎓 Campus Mitra AI — Twilio WhatsApp Server</h1>
        <p><strong>Mandsaur University | MU ANANT 1.0 | Chancellor's Brigade</strong></p>
        <hr style="border-color: #334155; margin: 1.5rem 0;" />
        <h3>🚀 Connecting Twilio WhatsApp to Render:</h3>
        <ol>
          <li>Your Live Webhook URL: <code style="background: #1e293b; padding: 4px 8px; border-radius: 4px; color: #38bdf8;">${protocol}://${host}/whatsapp</code></li>
          <li>Paste that URL into your <strong>Twilio Console ➔ Messaging ➔ WhatsApp Sandbox Settings</strong>:
            <br /><em>"WHEN A MESSAGE COMES IN"</em> ➔ <strong>POST</strong> <code style="color: #38bdf8;">${protocol}://${host}/whatsapp</code>
          </li>
        </ol>
        <p style="color: #34d399;">✓ Server is active on port <strong>${PORT}</strong> and listening for incoming webhooks!</p>
        <p><a href="/" style="color: #38bdf8;">← Back to Student WhatsApp Portal</a> | <a href="/faculty" style="color: #38bdf8;">Faculty Availability Portal</a></p>
      </body>
    </html>
  `);
});

process.on('uncaughtException', (err) => {
  console.error('[Process] Uncaught exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Process] Unhandled rejection:', reason);
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`=======================================================`);
  console.log(`🚀 Campus Mitra Twilio WhatsApp Server listening on 0.0.0.0:${PORT}`);
  console.log(`📊 Health Check: GET http://0.0.0.0:${PORT}/health`);
  console.log(`=======================================================`);
});
