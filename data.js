// =============================================================================
// CAMPUSMITRA AI — MANDSAUR UNIVERSITY DATABASE (data.js)
// MU ANANT 1.0 Hackathon | Chancellor's Brigade
// NOTE: Sample data only for academic evaluation & demonstration.
// =============================================================================

const MU_DATA = {
  university: "Mandsaur University (MU)",
  footerText: "Answers come only from MU verified records.",

  // Bot official WhatsApp configuration
  botPhone: "+17372508034",
  botDisplayPhone: "+1 (737) 250-8034",

  // Admin contact for escalations & security fallbacks
  adminContact: {
    office: "MU Admin Office, Administrative Block, Ground Floor (Room 102)",
    hours: "Monday – Saturday, 10:00 AM – 4:30 PM",
    phone: "+91 7422 255555",
    helpdesk: "+91 7422 255556",
    email: "admin@meu.edu.in"
  },

  // Demo phone options for scanning simulation (only masked numbers shown in UI)
  demoPhones: [
    { label: "+91 98XXXXX001", value: "+919876541001" },
    { label: "+91 98XXXXX002", value: "+919876542002" },
    { label: "+91 98XXXXX003", value: "+919876543003" },
    { label: "+91 70000XXXXX (not registered)", value: "+917000012345" }
  ],

  // ---------------------------------------------------------------------------
  // SAMPLE STUDENTS DATASET (Matched strictly by verified sender phone number)
  // ---------------------------------------------------------------------------
  students: [
    {
      phone: "+919876541001",
      name: "Ankit",
      enrollmentNo: "MU24CS001",
      department: "Computer Science & Engineering",
      category: "OBC",
      fees: {
        total: 65000,
        paid: 62000,
        due: 3000,
        dueDate: "25-10-2026",
        upiId: "mandsaur.univ@sbi",
        payLink: "https://fees.meu.edu.in/pay?enroll=MU24CS001"
      },
      documents: [
        { name: "10th Marksheet", status: "Submitted" },
        { name: "12th Marksheet", status: "Submitted" },
        { name: "Aadhaar Card", status: "Submitted" },
        { name: "Caste Certificate (OBC)", status: "Submitted" },
        { name: "Income Certificate", status: "Pending", deadline: "30-10-2026" }
      ],
      scholarship: {
        category: "OBC",
        schemeName: "MP State Post-Matric OBC Scholarship Scheme",
        status: "Application Drafted (Income Certificate Pending)",
        eligibility: "Eligible for up to 50% tuition subsidy (Family income < ₹3.0 Lakh/year).",
        nextStep: "Submit renewed Tehsildar-attested Income Certificate at Scholarship Window 4 by 30-Oct-2026."
      },
      busPass: {
        route: "Route 3 (Mandsaur City Circle - MU Campus)",
        status: "Expired",
        validTill: "30-09-2026",
        passNumber: "MU-BUS-2024-089",
        applySteps: [
          "1. Clear pending semester bus dues (₹1,500) at Accounts Counter.",
          "2. Collect clearance receipt and visit Transport Desk (Gate 2).",
          "3. Digital pass QR will be re-activated within 2 hours on your portal."
        ]
      }
    },
    {
      phone: "+919876542002",
      name: "Nikhil Sharma",
      enrollmentNo: "MU24CS002",
      department: "Computer Science & Engineering",
      category: "General",
      fees: {
        total: 65000,
        paid: 62000,
        due: 3000,
        dueDate: "25-10-2026",
        upiId: "mandsaur.univ@sbi",
        payLink: "https://fees.meu.edu.in/pay?enroll=MU24CS002"
      },
      documents: [
        { name: "10th Marksheet", status: "Submitted" },
        { name: "12th Marksheet", status: "Submitted" },
        { name: "Aadhaar Card", status: "Submitted" },
        { name: "MP Domicile Certificate", status: "Submitted" },
        { name: "Migration Certificate", status: "Pending", deadline: "15-11-2026" }
      ],
      scholarship: {
        category: "General",
        schemeName: "Mukhyamantri Medhavi Chhatra Yojana (MMVY)",
        status: "Eligible & Sanction Pre-Approved",
        eligibility: "Eligible for 100% Tuition Fee Reimbursement (12th Board score 88.2% >= 85% Cutoff).",
        nextStep: "Upload previous semester marksheet and bank passbook copy on MMVY portal (Desk 3 verification by 05-Nov-2026)."
      },
      busPass: {
        route: "Route 7 (Piplia Mandi - MU Campus)",
        status: "Expired",
        validTill: "15-09-2026",
        passNumber: "MU-BUS-2024-114",
        applySteps: [
          "1. Pay bus renewal fee via MU ERP or Accounts Window.",
          "2. Verify bus route with Transport In-charge at Gate 2.",
          "3. Digital pass activates instantly upon confirmation."
        ]
      }
    },
    {
      phone: "+919876543003",
      name: "Jitendra Solanki",
      enrollmentNo: "MU24CS003",
      department: "Computer Science & Engineering",
      category: "SC",
      fees: {
        total: 65000,
        paid: 59000,
        due: 6000,
        dueDate: "20-10-2026",
        upiId: "mandsaur.univ@sbi",
        payLink: "https://fees.meu.edu.in/pay?enroll=MU24CS003"
      },
      documents: [
        { name: "10th Marksheet", status: "Submitted" },
        { name: "12th Marksheet", status: "Submitted" },
        { name: "Caste Certificate (SC Verified)", status: "Submitted" },
        { name: "Aadhaar Card", status: "Submitted" },
        { name: "Samagra ID e-KYC", status: "Pending", deadline: "28-10-2026" }
      ],
      scholarship: {
        category: "SC",
        schemeName: "MP State Post-Matric SC Welfare Scheme",
        status: "Eligible (100% Tuition & Exam Fee Waiver)",
        eligibility: "Eligible for complete fee waiver + maintenance allowance under MP SC Welfare.",
        nextStep: "Complete biometric Aadhaar e-KYC at university computer centre (Lab 1) before 28-Oct-2026."
      },
      busPass: {
        route: "Route 1 (Daloda - MU Campus)",
        status: "Expired",
        validTill: "10-09-2026",
        passNumber: "MU-BUS-2024-042",
        applySteps: [
          "1. Apply under SC Welfare Transport Concession scheme.",
          "2. Submit concession approval form at Transport Desk (Gate 2).",
          "3. Collect subsidized semester transit card."
        ]
      }
    }
  ],

  // ---------------------------------------------------------------------------
  // SAMPLE FACULTY DIRECTORY (Default seed & fallback)
  // ---------------------------------------------------------------------------
  faculty: [
    {
      id: "fac_nidhi",
      name: "Prof. Nidhi",
      department: "HOD Computer Science",
      available: true,
      updatedAt: "10:30 AM"
    },
    {
      id: "fac_ranu",
      name: "Prof. Ranu",
      department: "CSE Department",
      available: false,
      updatedAt: "11:15 AM"
    },
    {
      id: "fac_verma",
      name: "Dr. Verma",
      department: "Dean / Administration",
      available: true,
      updatedAt: "09:45 AM"
    }
  ],

  // ---------------------------------------------------------------------------
  // UPCOMING ACADEMIC ALERTS & DEADLINES (Sorted by date)
  // ---------------------------------------------------------------------------
  deadlines: [
    {
      date: "18-10-2026",
      title: "Mid-Semester Examination Registration",
      desc: "Last day to fill exam form without late fine on ERP."
    },
    {
      date: "20-10-2026",
      title: "Hostel & Transport Fee Installment Due",
      desc: "Clear outstanding dues to avoid hostel mess / transport suspension."
    },
    {
      date: "25-10-2026",
      title: "Odd Semester Tuition Fee Final Due Date",
      desc: "Mandatory fee clearance before hall tickets are issued."
    },
    {
      date: "28-10-2026",
      title: "MP Scholarship Biometric e-KYC Deadline",
      desc: "SC/ST/OBC students must complete biometric Aadhaar e-KYC."
    },
    {
      date: "05-11-2026",
      title: "MMVY & Merit Scholarship Verification",
      desc: "Submit physical verification forms at Admin Block Desk 3."
    },
    {
      date: "15-11-2026",
      title: "Pending Academic Document Submission",
      desc: "Last date to deposit pending original Migration and Transfer certificates."
    }
  ],

  // ---------------------------------------------------------------------------
  // SCHOLARSHIP RULES MATRIX
  // ---------------------------------------------------------------------------
  scholarshipRules: {
    SC: {
      scheme: "MP State Post-Matric SC Welfare Scheme",
      criteria: "SC category students with family income < ₹2.5 Lakhs. Covers 100% tuition, exam fee and maintenance allowance."
    },
    OBC: {
      scheme: "MP State Post-Matric OBC Scholarship Scheme",
      criteria: "OBC category students with family income < ₹3.0 Lakhs. Up to 50% tuition subsidy."
    },
    General: {
      scheme: "Mukhyamantri Medhavi Chhatra Yojana (MMVY) / Merit Scholarship",
      criteria: "Students with >= 85% in 12th Board examinations. Covers 100% tuition fee reimbursement."
    }
  },

  // ---------------------------------------------------------------------------
  // BILINGUAL TRANSLATIONS (English & Hindi)
  // ---------------------------------------------------------------------------
  translations: {
    en: {
      notRegistered: "This number is not registered with Mandsaur University. Please contact the admin office.",
      greetingPrefix: "Hi! I'm CampusMitra, your campus assistant. I give verified answers only.",
      otpSecurityNotice: "For your security I have sent a 6-digit OTP to your registered mobile ending ",
      otpPrompt: "Please enter it.",
      enterOtpFirst: "Please enter the OTP first.",
      incorrectOtp: "Incorrect OTP.",
      attemptsLeft: "attempts left.",
      attemptLeft: "attempt left.",
      tooManyAttempts: "Too many attempts. Please scan the QR again.",
      otpExpired: "OTP has expired (validity 5 minutes). Please type 'resend' or scan the QR again.",
      resendMax: "Maximum OTP resends reached (2/2). Please enter the OTP sent earlier or scan the QR again.",
      resendSuccess: "A new 6-digit OTP has been sent to your registered mobile ending ",
      verifiedWelcome: "Verified! Welcome, ",
      sessionExpired: "Your session has expired (30 minutes). Please scan the QR again.",
      menuHeader: "What do you need help with?\nType the number of your choice:",
      menuItems: [
        "1️⃣ Fees (check dues, pay by QR or link)",
        "2️⃣ Documents (checklist and reminders)",
        "3️⃣ Scholarship (check eligibility and status)",
        "4️⃣ Bus Pass (apply and track the flow)",
        "5️⃣ Faculty Status (is the faculty available?)",
        "6️⃣ Alerts & Deadlines (see what is coming up)",
        "7️⃣ Change Language (हिंदी / English)"
      ],
      invalidChoice: "Please choose a number from the menu.",
      backHint: "💡 Type 0 for Main Menu | Type 'logout' to exit",
      feesTitle: "💰 *FEES & DUES SUMMARY*",
      feesTotal: "Total Fees",
      feesPaid: "Paid Amount",
      feesDue: "Outstanding Due",
      feesDueDate: "Due Date",
      feesSubOptions: "Options:\n1️⃣ Pay by QR Code\n2️⃣ Pay by Link\n0️⃣ Back to Main Menu",
      feesQrUpi: "UPI ID: ",
      documentsTitle: "📁 *MANDSAUR UNIVERSITY DOCUMENT CHECKLIST*",
      docSubmitted: "✅ Submitted",
      docPending: "⚠️ Pending (Deadline: ",
      scholarshipTitle: "📜 *SCHOLARSHIP STATUS & ELIGIBILITY*",
      busPassTitle: "🚌 *CAMPUS BUS TRANSPORT PASS*",
      busRoute: "Route",
      busStatus: "Status",
      busValidTill: "Valid Till",
      busHowToApply: "Steps to renew / apply:",
      facultyTitle: "👩‍🏫 *LIVE FACULTY AVAILABILITY*",
      facultyAvailable: "🟢 Available",
      facultyUnavailable: "🔴 Not available",
      facultyUpdated: "Updated: ",
      deadlinesTitle: "📅 *UPCOMING ALERTS & DEADLINES*",
      langSwitched: "Language switched to English.",
      loggedOut: "You have been logged out. Please scan the QR again to restart."
    },
    hi: {
      notRegistered: "यह नंबर मंदसौर विश्वविद्यालय में पंजीकृत नहीं है। कृपया प्रशासनिक कार्यालय से संपर्क करें।",
      greetingPrefix: "नमस्ते! मैं कैंपस मित्र हूँ, आपका कैंपस सहायक। मैं केवल सत्यापित जानकारी देता हूँ।",
      otpSecurityNotice: "आपकी सुरक्षा के लिए मैंने आपके पंजीकृत मोबाइल पर 6-अंकीय ओटीपी भेजा है, जिसका अंत है: ",
      otpPrompt: "कृपया इसे दर्ज करें।",
      enterOtpFirst: "कृपया पहले ओटीपी दर्ज करें।",
      incorrectOtp: "गलत ओटीपी।",
      attemptsLeft: "प्रयास शेष।",
      attemptLeft: "प्रयास शेष।",
      tooManyAttempts: "अधिकतम प्रयास पूरे हुए। कृपया पुनः क्यूआर कोड स्कैन करें।",
      otpExpired: "ओटीपी समाप्त हो चुका है। कृपया 'resend' लिखें या पुनः स्कैन करें।",
      resendMax: "अधिकतम पुनः भेजने की सीमा पूरी हो चुकी है (2/2)।",
      resendSuccess: "एक नया 6-अंकीय ओटीपी भेजा गया है, अंत: ",
      verifiedWelcome: "सत्यापित! स्वागत है, ",
      sessionExpired: "आपका सत्र समाप्त हो गया है (30 मिनट)। कृपया पुनः स्कैन करें।",
      menuHeader: "आपको किसमें सहायता चाहिए?\nअपनी पसंद का नंबर दर्ज करें:",
      menuItems: [
        "1️⃣ फीस (बकाया राशि जांचें, QR या लिंक से भुगतान)",
        "2️⃣ दस्तावेज (चेकलिस्ट व अनुस्मारक)",
        "3️⃣ छात्रवृत्ति (पात्रता व स्थिति जांचें)",
        "4️⃣ बस पास (आवेदन व नवीनीकरण स्थिति)",
        "5️⃣ संकाय स्थिति (क्या शिक्षक उपलब्ध हैं?)",
        "6️⃣ अलर्ट व समय-सीमाएं (आगामी तिथियां देखें)",
        "7️⃣ भाषा बदलें (English / हिन्दी)"
      ],
      invalidChoice: "कृपया मेनू से एक वैध संख्या चुनें।",
      backHint: "💡 मुख्य मेनू के लिए 0 लिखें | बाहर निकलने के लिए 'logout' लिखें",
      feesTitle: "💰 *फीस व बकाया विवरण*",
      feesTotal: "कुल फीस",
      feesPaid: "जमा की गई राशि",
      feesDue: "बकाया राशि",
      feesDueDate: "अंतिम तिथि",
      feesSubOptions: "विकल्प:\n1️⃣ क्यूआर कोड से भुगतान\n2️⃣ लिंक द्वारा ऑनलाइन भुगतान\n0️⃣ मुख्य मेनू पर वापस",
      feesQrUpi: "यूपीआई आईडी: ",
      documentsTitle: "📁 *विश्वविद्यालय दस्तावेज चेकलिस्ट*",
      docSubmitted: "✅ जमा (Submitted)",
      docPending: "⚠️ लंबित (अंतिम तिथि: ",
      scholarshipTitle: "📜 *छात्रवृत्ति पात्रता व स्थिति*",
      busPassTitle: "🚌 *कैंपस बस परिवहन पास*",
      busRoute: "रूट",
      busStatus: "स्थिति",
      busValidTill: "मान्यता",
      busHowToApply: "आवेदन / नवीनीकरण के चरण:",
      facultyTitle: "👩‍🏫 *लाइव शिक्षक उपलब्धता*",
      facultyAvailable: "🟢 उपलब्ध (Available)",
      facultyUnavailable: "🔴 उपलब्ध नहीं (Not available)",
      facultyUpdated: "अपडेट: ",
      deadlinesTitle: "📅 *आगामी अलर्ट व महत्वपूर्ण तिथियां*",
      langSwitched: "भाषा बदलकर हिन्दी कर दी गई है।",
      loggedOut: "आप सफलतापूर्वक लॉग आउट हो गए हैं। कृपया पुनः क्यूआर स्कैन करें।"
    }
  }
};

// Export for browser (window.MU_DATA) and CommonJS/Node environments
if (typeof module !== "undefined" && module.exports) {
  module.exports = MU_DATA;
}
