/**
 * =============================================================================
 * CAMPUSMITRA AI — CORE CHATBOT ENGINE (bot.js)
 * Pure, portable state-machine logic for Mandsaur University.
 * 
 * DESIGN PRINCIPLES:
 * 1. Zero DOM code: No `window`, `document`, or browser APIs.
 * 2. Pure function: `handle(session, userText, senderPhone, database)` -> Array of reply messages.
 * 3. WhatsApp Faithful: Sender phone is provided by the platform (like Twilio / Meta).
 *    Matches registered phone -> OTP -> Verified -> Menu.
 * 4. Strictly Option-Based: Only verified MU records; free chat rejected.
 * =============================================================================
 */

(function (global) {
  'use strict';

  /**
   * Helper: Normalize phone numbers (stripping non-digits and ensuring standard format)
   */
  function normalizePhone(p) {
    if (!p) return '';
    let digits = String(p).replace(/[^\d+]/g, '');
    if (!digits.startsWith('+')) {
      digits = '+' + digits;
    }
    return digits;
  }

  /**
   * Factory function to create an empty user session
   */
  function createSession(initialPhone) {
    return {
      senderPhone: initialPhone ? normalizePhone(initialPhone) : null,
      lang: 'en',               // 'en' or 'hi'
      state: 'INIT',            // 'INIT' | 'AWAIT_OTP' | 'AUTH' | 'BLOCKED' | 'NOT_REGISTERED'
      currentMenu: 'MAIN',      // 'MAIN' | 'FEES_SUBMENU'
      otp: null,
      otpExpiresAt: 0,
      otpAttempts: 0,           // Max 3
      resendCount: 0,           // Max 2
      student: null,            // Currently authenticated student record
      pendingStudent: null,     // Transient student during OTP flow
      sessionExpiresAt: 0,      // 30 min duration
      liveFaculty: null         // Optional live faculty presence cache
    };
  }

  /**
   * Message Object Factory
   */
  function msg(text, options = {}) {
    return {
      text: text,
      type: options.type || 'bot',          // 'bot' | 'system' | 'sms' | 'qr'
      buttons: options.buttons || null,     // Array of { label, value }
      qrData: options.qrData || null,
      toString: function () {
        return this.text;
      }
    };
  }

  /**
   * Get localized translation string
   */
  function t(db, lang, key) {
    const l = lang === 'hi' ? 'hi' : 'en';
    if (db.translations && db.translations[l] && db.translations[l][key]) {
      return db.translations[l][key];
    }
    return (db.translations && db.translations.en && db.translations.en[key]) || key;
  }

  /**
   * Render the Main Menu message with clickable options
   */
  function renderMainMenu(session, db) {
    const lang = session.lang;
    const header = t(db, lang, 'menuHeader');
    const items = db.translations[lang].menuItems.join('\n');
    const hint = t(db, lang, 'backHint');
    const footer = db.footerText;

    const fullText = `${header}\n\n${items}\n\n${hint}\n\n_${footer}_`;

    const buttons = [
      { label: '1️⃣ Fees', value: '1' },
      { label: '2️⃣ Documents', value: '2' },
      { label: '3️⃣ Scholarship', value: '3' },
      { label: '4️⃣ Bus Pass', value: '4' },
      { label: '5️⃣ Faculty Status', value: '5' },
      { label: '6️⃣ Alerts & Deadlines', value: '6' },
      { label: '7️⃣ Language', value: '7' }
    ];

    return msg(fullText, { buttons: buttons });
  }

  /**
   * Main Dispatcher Pure Function
   * @param {Object} session - The mutable user session object
   * @param {string} userText - Raw text entered by the user
   * @param {string} senderPhone - The sender's phone number provided by WhatsApp
   * @param {Object} database - The MU_DATA object (defaults to global MU_DATA)
   * @returns {Array} List of reply message objects
   */
  function handle(session, userText, senderPhone, database) {
    const db = database || (typeof MU_DATA !== 'undefined' ? MU_DATA : null);
    if (!db) {
      return [msg("CRITICAL: Database not loaded. Please contact MU admin office.", { type: 'system' })];
    }

    // Ensure session is initialized
    if (!session || typeof session !== 'object') {
      session = createSession(senderPhone);
    }
    if (!session.state) session.state = 'INIT';
    if (!session.lang) session.lang = 'en';

    // Update phone if provided
    if (senderPhone) {
      const cleanSender = normalizePhone(senderPhone);
      if (session.senderPhone !== cleanSender) {
        session.senderPhone = cleanSender;
        // Reset state if phone changes
        if (session.state === 'AUTH' && session.student && normalizePhone(session.student.phone) !== cleanSender) {
          session.state = 'INIT';
          session.student = null;
        }
      }
    }

    const input = (userText || '').trim();
    const lower = input.toLowerCase();
    const lang = session.lang || 'en';
    const replies = [];

    // -------------------------------------------------------------------------
    // 0. SECURITY & BLOCKED / NOT REGISTERED HANDLERS
    // -------------------------------------------------------------------------

    if (session.state === 'BLOCKED') {
      return [msg(t(db, lang, 'tooManyAttempts'), { type: 'system' })];
    }

    if (session.state === 'NOT_REGISTERED') {
      return [msg(t(db, lang, 'notRegistered'), { type: 'system' })];
    }

    // Check 30-minute session expiration
    if (session.state === 'AUTH' && session.sessionExpiresAt && Date.now() > session.sessionExpiresAt) {
      session.state = 'INIT';
      session.student = null;
      session.sessionExpiresAt = 0;
      session.currentMenu = 'MAIN';
      return [msg(t(db, lang, 'sessionExpired'), { type: 'system' })];
    }

    // Handle logout command
    if (session.state === 'AUTH' && lower === 'logout') {
      session.state = 'INIT';
      session.student = null;
      session.pendingStudent = null;
      session.otp = null;
      session.otpAttempts = 0;
      session.resendCount = 0;
      session.sessionExpiresAt = 0;
      session.currentMenu = 'MAIN';
      return [msg(t(db, lang, 'loggedOut'), { type: 'system' })];
    }

    // -------------------------------------------------------------------------
    // 1. INITIAL TRIGGER FLOW (Scan QR -> WhatsApp opens with "Hi")
    // -------------------------------------------------------------------------
    if (session.state === 'INIT') {
      const phoneToMatch = session.senderPhone ? normalizePhone(session.senderPhone) : '';

      // Match against database
      const matched = db.students.find(function (s) {
        return normalizePhone(s.phone) === phoneToMatch;
      });

      // b) Phone NOT registered
      if (!matched) {
        session.state = 'NOT_REGISTERED';
        replies.push(msg(t(db, lang, 'notRegistered'), { type: 'system' }));
        return replies;
      }

      // c) Phone IS registered: Send OTP prompt
      session.pendingStudent = matched;
      session.otp = String(Math.floor(100000 + Math.random() * 900000));
      session.otpExpiresAt = Date.now() + 5 * 60 * 1000; // 5 minutes validity
      session.otpAttempts = 0;
      session.resendCount = 0;
      session.state = 'AWAIT_OTP';

      const last4 = matched.phone.slice(-4);

      // Bot greeting message
      const greetingMsg =
        `${t(db, lang, 'greetingPrefix')} ` +
        `${t(db, lang, 'otpSecurityNotice')}*${last4}*. ` +
        `${t(db, lang, 'otpPrompt')}`;

      replies.push(msg(greetingMsg));

      // Grey system bubble simulating carrier SMS
      replies.push(msg(
        `Demo SMS: Your CampusMitra OTP is ${session.otp}`,
        { type: 'sms' }
      ));

      return replies;
    }

    // -------------------------------------------------------------------------
    // 2. OTP VERIFICATION FLOW
    // -------------------------------------------------------------------------
    if (session.state === 'AWAIT_OTP') {

      // Resend OTP request
      if (lower === 'resend' || lower === 'resend otp') {
        if (session.resendCount >= 2) {
          replies.push(msg(t(db, lang, 'resendMax')));
          return replies;
        }

        session.resendCount++;
        session.otp = String(Math.floor(100000 + Math.random() * 900000));
        session.otpExpiresAt = Date.now() + 5 * 60 * 1000;
        session.otpAttempts = 0;

        const last4 = session.pendingStudent.phone.slice(-4);
        replies.push(msg(`${t(db, lang, 'resendSuccess')}*${last4}*. ${t(db, lang, 'otpPrompt')}`));
        replies.push(msg(`Demo SMS: Your CampusMitra OTP is ${session.otp}`, { type: 'sms' }));
        return replies;
      }

      // f) If student types menu numbers before OTP is verified:
      if (['0', '1', '2', '3', '4', '5', '6', '7', 'menu'].includes(lower)) {
        replies.push(msg(t(db, lang, 'enterOtpFirst')));
        return replies;
      }

      // Clean digits from input
      const cleanInput = input.replace(/\D/g, '');

      // Check OTP match
      if (cleanInput === session.otp) {
        // Check 5-minute expiry
        if (Date.now() > session.otpExpiresAt) {
          replies.push(msg(t(db, lang, 'otpExpired'), { type: 'system' }));
          return replies;
        }

        // e) OTP Correct -> Verified!
        session.student = session.pendingStudent;
        session.pendingStudent = null;
        session.otp = null;
        session.otpAttempts = 0;
        session.state = 'AUTH';
        session.sessionExpiresAt = Date.now() + 30 * 60 * 1000; // 30 min duration
        session.currentMenu = 'MAIN';

        replies.push(msg(`${t(db, lang, 'verifiedWelcome')}*${session.student.name}*.`));
        replies.push(renderMainMenu(session, db));
        return replies;
      }

      // d) Wrong OTP attempt
      session.otpAttempts = (session.otpAttempts || 0) + 1;

      if (session.otpAttempts >= 3) {
        session.state = 'BLOCKED';
        replies.push(msg(t(db, lang, 'tooManyAttempts'), { type: 'system' }));
        return replies;
      }

      const attemptsLeft = 3 - session.otpAttempts;
      const leftLabel = attemptsLeft > 1 ? t(db, lang, 'attemptsLeft') : t(db, lang, 'attemptLeft');
      replies.push(msg(`${t(db, lang, 'incorrectOtp')} ${attemptsLeft} ${leftLabel}`));
      return replies;
    }

    // -------------------------------------------------------------------------
    // 3. AUTHENTICATED STUDENT INTERACTION (Strictly Option-Based)
    // -------------------------------------------------------------------------
    if (session.state === 'AUTH') {
      const student = session.student;
      const hint = t(db, lang, 'backHint');

      // Global navigation: "0" or "menu" returns to main menu
      if (input === '0' || lower === 'menu') {
        session.currentMenu = 'MAIN';
        replies.push(renderMainMenu(session, db));
        return replies;
      }

      // SUBMENU HANDLING: FEES PAY OPTIONS
      if (session.currentMenu === 'FEES_SUBMENU') {
        if (input === '1') {
          // Pay by QR
          const qrText =
            `📱 *MU ONLINE UPI QR PAYMENT*\n━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 *Student:* ${student.name} (${student.enrollmentNo})\n` +
            `💰 *Amount Due:* ₹${student.fees.due.toLocaleString('en-IN')}\n` +
            `🏦 *${t(db, lang, 'feesQrUpi')}* \`${student.fees.upiId}\`\n` +
            `📅 *Due Date:* ${student.fees.dueDate}\n━━━━━━━━━━━━━━━━━━━━\n` +
            `_Scan with Google Pay, PhonePe, or Paytm._\n\n${hint}`;

          replies.push(msg(qrText, {
            type: 'qr',
            qrData: {
              upiId: student.fees.upiId,
              amount: student.fees.due,
              name: student.name,
              enrollment: student.enrollmentNo
            },
            buttons: [
              { label: '0️⃣ Main Menu', value: '0' }
            ]
          }));
          return replies;
        } else if (input === '2') {
          // Pay by Link
          const linkText =
            `🌐 *OFFICIAL PAYMENT PORTAL*\n━━━━━━━━━━━━━━━━━━━━\n` +
            `🔗 *Payment Link:* ${student.fees.payLink}\n\n` +
            `🔒 *Portal Security:* 256-Bit SSL SBI e-Pay Gateway\n` +
            `Instant receipt generated on successful transaction.\n━━━━━━━━━━━━━━━━━━━━\n\n${hint}`;

          replies.push(msg(linkText, {
            buttons: [
              { label: '0️⃣ Main Menu', value: '0' }
            ]
          }));
          return replies;
        } else {
          // Invalid submenu choice
          replies.push(msg(
            `${t(db, lang, 'invalidChoice')}\n\n${t(db, lang, 'feesSubOptions')}`,
            {
              buttons: [
                { label: '1️⃣ Pay by QR', value: '1' },
                { label: '2️⃣ Pay by Link', value: '2' },
                { label: '0️⃣ Main Menu', value: '0' }
              ]
            }
          ));
          return replies;
        }
      }

      // MAIN MENU OPTION ROUTING (Options 1 to 7)
      switch (input) {

        // OPTION 1: FEES
        case '1': {
          session.currentMenu = 'FEES_SUBMENU';
          const fees = student.fees;
          const feesText =
            `${t(db, lang, 'feesTitle')}\n━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 *Student:* ${student.name} (${student.enrollmentNo})\n` +
            `💵 *${t(db, lang, 'feesTotal')}:* ₹${fees.total.toLocaleString('en-IN')}\n` +
            `✅ *${t(db, lang, 'feesPaid')}:* ₹${fees.paid.toLocaleString('en-IN')}\n` +
            `⚠️ *${t(db, lang, 'feesDue')}:* ₹${fees.due.toLocaleString('en-IN')}\n` +
            `📅 *${t(db, lang, 'feesDueDate')}:* ${fees.dueDate}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n` +
            `${t(db, lang, 'feesSubOptions')}\n\n_${db.footerText}_`;

          replies.push(msg(feesText, {
            buttons: [
              { label: '1️⃣ Pay by QR', value: '1' },
              { label: '2️⃣ Pay by Link', value: '2' },
              { label: '0️⃣ Main Menu', value: '0' }
            ]
          }));
          return replies;
        }

        // OPTION 2: DOCUMENTS
        case '2': {
          let docsText = `${t(db, lang, 'documentsTitle')}\n━━━━━━━━━━━━━━━━━━━━\n`;
          student.documents.forEach(function (doc, idx) {
            if (doc.status === 'Submitted') {
              docsText += `${idx + 1}. *${doc.name}:* ${t(db, lang, 'docSubmitted')}\n`;
            } else {
              docsText += `${idx + 1}. *${doc.name}:* ${t(db, lang, 'docPending')}${doc.deadline})\n`;
            }
          });
          docsText += `━━━━━━━━━━━━━━━━━━━━\n💡 _Deposit pending documents at Admin Window 2._\n\n${hint}\n\n_${db.footerText}_`;

          replies.push(msg(docsText, {
            buttons: [{ label: '0️⃣ Main Menu', value: '0' }]
          }));
          return replies;
        }

        // OPTION 3: SCHOLARSHIP (Evaluated for logged-in student)
        case '3': {
          const sch = student.scholarship;
          const rule = db.scholarshipRules[student.category] || {};
          const schText =
            `${t(db, lang, 'scholarshipTitle')}\n━━━━━━━━━━━━━━━━━━━━\n` +
            `👤 *Student Category:* ${student.category}\n` +
            `🏫 *Department:* ${student.department}\n` +
            `📜 *Applicable Scheme:* ${sch.schemeName}\n` +
            `⚖️ *Eligibility Criteria:* ${rule.criteria || sch.eligibility}\n` +
            `📊 *Current Status:* ${sch.status}\n` +
            `👉 *Next Step:* ${sch.nextStep}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n${hint}\n\n_${db.footerText}_`;

          replies.push(msg(schText, {
            buttons: [{ label: '0️⃣ Main Menu', value: '0' }]
          }));
          return replies;
        }

        // OPTION 4: BUS PASS
        case '4': {
          const bp = student.busPass;
          const steps = bp.applySteps.join('\n');
          const bpText =
            `${t(db, lang, 'busPassTitle')}\n━━━━━━━━━━━━━━━━━━━━\n` +
            `🚍 *${t(db, lang, 'busRoute')}:* ${bp.route}\n` +
            `🏷️ *Pass ID:* ${bp.passNumber}\n` +
            `🔴 *${t(db, lang, 'busStatus')}:* ${bp.status}\n` +
            `📅 *${t(db, lang, 'busValidTill')}:* ${bp.validTill}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n` +
            `📋 *${t(db, lang, 'busHowToApply')}*\n${steps}\n` +
            `━━━━━━━━━━━━━━━━━━━━\n\n${hint}\n\n_${db.footerText}_`;

          replies.push(msg(bpText, {
            buttons: [{ label: '0️⃣ Main Menu', value: '0' }]
          }));
          return replies;
        }

        // OPTION 5: FACULTY STATUS (Live sync)
        case '5': {
          const facList = (session.liveFaculty && session.liveFaculty.length > 0)
            ? session.liveFaculty
            : db.faculty;

          let facText = `${t(db, lang, 'facultyTitle')}\n━━━━━━━━━━━━━━━━━━━━\n`;
          facList.forEach(function (fac) {
            const statusDot = fac.available
              ? t(db, lang, 'facultyAvailable')
              : t(db, lang, 'facultyUnavailable');
            const updated = fac.updatedAt || 'Recently';

            facText +=
              `${statusDot}\n` +
              `👩‍🏫 *${fac.name}*\n` +
              `📚 ${fac.department}\n` +
              `⏱️ ${t(db, lang, 'facultyUpdated')}${updated}\n` +
              `────────────────────\n`;
          });
          facText += `_Live synchronized from Firebase / Faculty Portal._\n\n${hint}\n\n_${db.footerText}_`;

          replies.push(msg(facText, {
            buttons: [{ label: '0️⃣ Main Menu', value: '0' }]
          }));
          return replies;
        }

        // OPTION 6: ALERTS & DEADLINES (Sorted by date)
        case '6': {
          let alertsText = `${t(db, lang, 'deadlinesTitle')}\n━━━━━━━━━━━━━━━━━━━━\n`;
          db.deadlines.forEach(function (item, idx) {
            alertsText +=
              `${idx + 1}. 🗓️ *${item.date}* — *${item.title}*\n` +
              `   ℹ️ ${item.desc}\n\n`;
          });
          alertsText += `━━━━━━━━━━━━━━━━━━━━\n\n${hint}\n\n_${db.footerText}_`;

          replies.push(msg(alertsText, {
            buttons: [{ label: '0️⃣ Main Menu', value: '0' }]
          }));
          return replies;
        }

        // OPTION 7: CHANGE LANGUAGE
        case '7': {
          session.lang = session.lang === 'en' ? 'hi' : 'en';
          replies.push(msg(t(db, session.lang, 'langSwitched'), { type: 'system' }));
          replies.push(renderMainMenu(session, db));
          return replies;
        }

        // UNRECOGNIZED INPUT -> Reject free chat, strictly show menu error
        default: {
          replies.push(msg(t(db, lang, 'invalidChoice')));
          replies.push(renderMainMenu(session, db));
          return replies;
        }
      }
    }

    return [];
  }

  // Export module cleanly
  const BotModule = {
    handle: handle,
    createSession: createSession,
    normalizePhone: normalizePhone
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = BotModule;
  }
  if (typeof window !== 'undefined') {
    window.CampusBot = BotModule;
  }

})(typeof window !== 'undefined' ? window : this);
