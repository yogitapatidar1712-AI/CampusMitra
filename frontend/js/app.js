/**
 * Campus Mitra AI - Frontend Application
 * Built for Mandsaur University | MU ANANT 1.0 Hackathon
 */

const CONFIG = {
  BACKEND_URL: window.location.origin + '/api/chat',
  BACKEND_HEALTH: window.location.origin + '/api/health',
  UNIVERSITY_NAME: 'Mandsaur University',
  HACKATHON: 'MU ANANT 1.0',
  TEAM: "Chancellor's Brigade"
};

// Application State
const state = {
  currentChatId: null,
  chats: {},
  isGenerating: false,
  isRecording: false,
  backendConnected: false,
  recognition: null
};

// DOM Elements
const elements = {
  sidebar: document.getElementById('sidebar'),
  toggleSidebarBtn: document.getElementById('toggle-sidebar-btn'),
  closeSidebarMobile: document.getElementById('close-sidebar-mobile'),
  newChatBtn: document.getElementById('new-chat-btn'),
  clearChatBtn: document.getElementById('clear-chat-btn'),
  chatHistoryList: document.getElementById('chat-history-list'),
  welcomeHero: document.getElementById('welcome-hero'),
  chatContainer: document.getElementById('chat-container'),
  messagesList: document.getElementById('messages-list'),
  chatForm: document.getElementById('chat-form'),
  userInput: document.getElementById('user-input'),
  sendBtn: document.getElementById('send-btn'),
  voiceBtn: document.getElementById('voice-btn'),
  backendStatus: document.getElementById('backend-status')
};

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  lucide.createIcons();
  loadChatsFromStorage();
  initVoiceRecognition();
  setupEventListeners();
  checkBackendHealth();
  
  // Auto-focus input
  elements.userInput.focus();
});

// Setup Event Listeners
function setupEventListeners() {
  // Sidebar Toggles
  elements.toggleSidebarBtn?.addEventListener('click', () => {
    elements.sidebar.classList.toggle('open');
  });

  elements.closeSidebarMobile?.addEventListener('click', () => {
    elements.sidebar.classList.remove('open');
  });

  // New Chat Button
  elements.newChatBtn?.addEventListener('click', () => {
    startNewChat();
    if (window.innerWidth < 768) elements.sidebar.classList.remove('open');
  });

  // Clear Chat
  elements.clearChatBtn?.addEventListener('click', () => {
    if (!state.currentChatId) return;
    if (confirm('Clear messages in this conversation?')) {
      state.chats[state.currentChatId].messages = [];
      saveChatsToStorage();
      renderCurrentChat();
    }
  });

  // Form Submit
  elements.chatForm?.addEventListener('submit', (e) => {
    e.preventDefault();
    handleSendMessage();
  });

  // Textarea dynamic expansion & Enter key
  elements.userInput?.addEventListener('input', () => {
    elements.userInput.style.height = 'auto';
    elements.userInput.style.height = Math.min(elements.userInput.scrollHeight, 150) + 'px';
  });

  elements.userInput?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  });

  // Suggestion Chips
  document.querySelectorAll('.suggestion-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const promptText = chip.querySelector('p')?.innerText;
      if (promptText) {
        elements.userInput.value = promptText;
        handleSendMessage();
      }
    });
  });

  // Quick Campus Links
  document.querySelectorAll('.quick-link-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const topic = btn.getAttribute('data-topic');
      let promptText = '';
      if (topic === 'exam') promptText = 'Tell me about the upcoming semester examination datesheet, admit cards, and evaluation rules.';
      else if (topic === 'hostel') promptText = 'What are the hostel rules, mess timings, and how can I submit a maintenance complaint?';
      else if (topic === 'library') promptText = 'What are the Central Library working hours and book issuance/renewal guidelines?';
      else if (topic === 'hackathon') promptText = "Tell me everything about MU ANANT 1.0 Hackathon and Chancellor's Brigade!";
      
      if (promptText) {
        elements.userInput.value = promptText;
        handleSendMessage();
        if (window.innerWidth < 768) elements.sidebar.classList.remove('open');
      }
    });
  });

  // Voice Input Toggle
  elements.voiceBtn?.addEventListener('click', toggleVoiceInput);
}

// Check Backend Health
async function checkBackendHealth() {
  try {
    const res = await fetch(CONFIG.BACKEND_HEALTH, { method: 'GET', signal: AbortSignal.timeout(1500) });
    if (res.ok) {
      state.backendConnected = true;
      updateBackendStatusBadge(true);
      return;
    }
  } catch (err) {
    state.backendConnected = false;
    updateBackendStatusBadge(false);
  }
}

function updateBackendStatusBadge(isConnected) {
  if (!elements.backendStatus) return;
  const dot = elements.backendStatus.querySelector('.status-dot');
  const text = elements.backendStatus.querySelector('.status-text');
  
  if (isConnected) {
    dot.className = 'status-dot w-2 h-2 rounded-full bg-emerald-400 animate-pulse';
    text.innerText = 'AI Backend Connected';
    elements.backendStatus.className = 'hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-emerald-950/60 text-emerald-300 border border-emerald-500/30';
  } else {
    dot.className = 'status-dot w-2 h-2 rounded-full bg-amber-400';
    text.innerText = 'Campus Mitra (Client Mode)';
    elements.backendStatus.className = 'hidden md:flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60';
  }
}

// Web Speech API for Voice Input
function initVoiceRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    elements.voiceBtn.style.display = 'none';
    return;
  }

  state.recognition = new SpeechRecognition();
  state.recognition.continuous = false;
  state.recognition.interimResults = false;
  state.recognition.lang = 'en-IN'; // Indian English / Hindi accent friendly

  state.recognition.onstart = () => {
    state.isRecording = true;
    elements.voiceBtn.classList.add('recording-active');
  };

  state.recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    elements.userInput.value = transcript;
    elements.userInput.focus();
  };

  state.recognition.onerror = () => {
    stopRecording();
  };

  state.recognition.onend = () => {
    stopRecording();
  };
}

function toggleVoiceInput() {
  if (!state.recognition) return;
  if (state.isRecording) {
    state.recognition.stop();
  } else {
    try {
      state.recognition.start();
    } catch (e) {
      console.warn('Recognition start error', e);
    }
  }
}

function stopRecording() {
  state.isRecording = false;
  elements.voiceBtn.classList.remove('recording-active');
}

// Send Message Handler
async function handleSendMessage() {
  const query = elements.userInput.value.trim();
  if (!query || state.isGenerating) return;

  // Initialize chat if not exists
  if (!state.currentChatId) {
    startNewChat(query.slice(0, 28) + (query.length > 28 ? '...' : ''));
  }

  // Clear Input
  elements.userInput.value = '';
  elements.userInput.style.height = 'auto';

  // Add User Message
  appendMessage('user', query);
  state.chats[state.currentChatId].messages.push({ role: 'user', content: query, timestamp: new Date().toISOString() });
  saveChatsToStorage();

  // Show Typing Indicator
  showTypingIndicator();
  state.isGenerating = true;
  elements.sendBtn.disabled = true;

  try {
    let responseText = '';

    if (state.backendConnected) {
      // Connect to Real Backend
      const res = await fetch(CONFIG.BACKEND_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          history: state.chats[state.currentChatId].messages.slice(-6)
        })
      });
      const data = await res.json();
      responseText = data.reply || data.response || "I didn't receive a response from the AI server.";
    } else {
      // Fallback to Intelligent Campus Knowledge Engine
      await new Promise(r => setTimeout(r, 650));
      responseText = generateCampusResponse(query);
    }

    removeTypingIndicator();
    appendMessage('assistant', responseText);
    state.chats[state.currentChatId].messages.push({ role: 'assistant', content: responseText, timestamp: new Date().toISOString() });
    saveChatsToStorage();

  } catch (err) {
    console.error('Error generating response:', err);
    removeTypingIndicator();
    appendMessage('assistant', '⚠️ An error occurred while communicating with Campus Mitra AI service. Falling back to local offline mode.');
  } finally {
    state.isGenerating = false;
    elements.sendBtn.disabled = false;
    elements.userInput.focus();
  }
}

// Intelligent Fallback Knowledge Engine (Mandsaur University Context)
function generateCampusResponse(prompt) {
  const p = prompt.toLowerCase();

  if (p.includes('anant') || p.includes('hackathon') || p.includes('brigade') || p.includes('chancellor')) {
    return `🏆 **MU ANANT 1.0 Hackathon & Chancellor's Brigade**\n\n- **Event**: MU ANANT 1.0\n- **Theme**: *"Kuch Karke Dikhana Hai"*\n- **Organized By**: Chancellor's Brigade, Mandsaur University.\n- **Mission**: Empowering students to build high-impact tech solutions solving real-world and campus challenges.\n- **Our Project**: **Campus Mitra AI** — An end-to-end digital friend and assistant powering academics, complaints, and campus navigation!`;
  }

  if (p.includes('exam') || p.includes('datesheet') || p.includes('result') || p.includes('grade')) {
    return `📅 **Examination Cell & Schedule Updates**\n\n- **Mid-Term Exams**: Conducted as per the university academic calendar (typically mid-semester).\n- **Admit Cards**: Downloadable from the official **MU ERP Student Portal** 5 days before exams.\n- **Evaluation**: 70% End-Term + 30% Continuous Internal Assessment (attendance, assignments & mid-terms).\n- **Notice**: Please ensure at least **75% minimum attendance** to be eligible for hall tickets.`;
  }

  if (p.includes('hostel') || p.includes('mess') || p.includes('complaint') || p.includes('wifi') || p.includes('room')) {
    return `🏨 **Hostel & Facility Services**\n\n- **Mess Timings**:\n  - Breakfast: 07:30 AM - 09:00 AM\n  - Lunch: 12:30 PM - 02:30 PM\n  - Dinner: 07:30 PM - 09:30 PM\n- **Complaints & Grievances**:\n  - To raise maintenance tickets for Wi-Fi, carpentry, or electrical issues, visit the Hostel Warden Office or submit a ticket via Campus Mitra.\n- **Hostel In-Time**: Curfew for hostel residents is strictly 08:30 PM.`;
  }

  if (p.includes('library') || p.includes('book') || p.includes('notes') || p.includes('pyq')) {
    return `📚 **Central Library & Academic Resources**\n\n- **Timings**: Monday to Saturday, 08:30 AM - 08:00 PM.\n- **Book Issuance**: Students can borrow up to **4 books for 14 days** using their Student ID card.\n- **Digital Library**: Access IEEE, DELNET, and university question paper repository at the Digital Hub on the 2nd Floor.\n- **Campus Mitra Academic Vault**: Upload and browse subject notes directly through our upcoming peer-to-peer portal!`;
  }

  if (p.includes('location') || p.includes('where is') || p.includes('reach') || p.includes('auditorium') || p.includes('block')) {
    return `🏢 **Campus Navigation Guide**\n\n- **Main Administrative Block**: Entrance wing, Ground floor (Registrar & Chancellor Office).\n- **Central Auditorium**: Adjacent to Block B, near the Sports Complex.\n- **Computer Science & IT Labs**: Block C, 1st & 2nd Floors.\n- **Central Mess & Canteen**: Opposite to Boys Hostel Block 1 & Girls Hostel Block.`;
  }

  if (p.includes('fee') || p.includes('admission') || p.includes('scholarship')) {
    return `💳 **Admissions & Accounts Department**\n\n- **Fee Payments**: Can be completed via the MU ERP online payment gateway or at the Accounts Office, Admin Block.\n- **Scholarships**: Merit-based scholarships and government post-matric scholarship verification are processed at the Student Welfare Section.`;
  }

  if (p.includes('hello') || p.includes('hi') || p.includes('hey') || p.includes('mitra')) {
    return `👋 **Namaste! I am Campus Mitra AI**\n\nYour digital buddy for **Mandsaur University**! I can help you with:\n1. 📅 Exam timetables, syllabi & academic calendars\n2. 🏢 Campus directions, labs & faculty directories\n3. 🛠️ Hostel maintenance & grievance tracking\n4. 🚀 Updates on MU ANANT 1.0 & campus clubs\n\nHow can I help you today?`;
  }

  return `🤖 **Campus Mitra AI Response**\n\nThank you for your question regarding **"${escapeHtml(prompt)}"**.\n\nAt **Mandsaur University**, this service is handled by the respective departmental office. Once our backend database and AI knowledge vector store are fully connected in Step 2 & 3, I will retrieve real-time live data for you.\n\nIs there anything specific regarding exams, hostel, library, or **MU ANANT 1.0** hackathon you would like to ask?`;
}

// Append Message Bubble to Chat
function appendMessage(role, text) {
  elements.welcomeHero.style.display = 'none';

  const isUser = role === 'user';
  const messageEl = document.createElement('div');
  messageEl.className = `flex gap-3 message-enter ${isUser ? 'justify-end' : 'justify-start'}`;

  const avatar = isUser
    ? `<div class="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 select-none font-semibold text-xs">YOU</div>`
    : `<div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-600/20 select-none">
        <i data-lucide="bot" class="w-4 h-4"></i>
       </div>`;

  const copyBtn = !isUser
    ? `<button class="copy-btn opacity-0 group-hover:opacity-100 transition p-1 text-slate-400 hover:text-white rounded" title="Copy text">
         <i data-lucide="copy" class="w-3.5 h-3.5"></i>
       </button>`
    : '';

  const bubbleContent = isUser
    ? `<div class="max-w-[85%] md:max-w-[75%] rounded-2xl px-4 py-2.5 bg-orange-600 text-white text-sm shadow-md rounded-tr-none leading-relaxed whitespace-pre-wrap">${escapeHtml(text)}</div>`
    : `<div class="group relative max-w-[90%] md:max-w-[80%] rounded-2xl px-4 py-3 bg-slate-900 border border-slate-800 text-slate-200 text-sm shadow-sm rounded-tl-none leading-relaxed prose-chat">
         ${renderMarkdown(text)}
         <div class="mt-2 pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
           <span>Campus Mitra AI</span>
           <div class="flex items-center gap-1">${copyBtn}</div>
         </div>
       </div>`;

  messageEl.innerHTML = isUser ? `${bubbleContent}${avatar}` : `${avatar}${bubbleContent}`;
  elements.messagesList.appendChild(messageEl);

  // Initialize Lucide icons on newly inserted element
  lucide.createIcons({ root: messageEl });

  // Hook Copy Button
  const copyNode = messageEl.querySelector('.copy-btn');
  if (copyNode) {
    copyNode.addEventListener('click', () => {
      navigator.clipboard.writeText(text);
      copyNode.innerHTML = `<i data-lucide="check" class="w-3.5 h-3.5 text-emerald-400"></i>`;
      lucide.createIcons({ root: copyNode });
      setTimeout(() => {
        copyNode.innerHTML = `<i data-lucide="copy" class="w-3.5 h-3.5"></i>`;
        lucide.createIcons({ root: copyNode });
      }, 1500);
    });
  }

  scrollToBottom();
}

// Typing Indicator
function showTypingIndicator() {
  const typingEl = document.createElement('div');
  typingEl.id = 'typing-indicator';
  typingEl.className = 'flex gap-3 justify-start message-enter';
  typingEl.innerHTML = `
    <div class="w-8 h-8 rounded-lg bg-gradient-to-tr from-orange-600 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-md shadow-orange-600/20">
      <i data-lucide="bot" class="w-4 h-4"></i>
    </div>
    <div class="rounded-2xl px-4 py-3 bg-slate-900 border border-slate-800 text-slate-400 text-sm rounded-tl-none flex items-center gap-1.5">
      <span class="typing-dot w-2 h-2 rounded-full bg-orange-400"></span>
      <span class="typing-dot w-2 h-2 rounded-full bg-orange-400"></span>
      <span class="typing-dot w-2 h-2 rounded-full bg-orange-400"></span>
      <span class="text-xs text-slate-400 ml-1">Campus Mitra is thinking...</span>
    </div>
  `;
  elements.messagesList.appendChild(typingEl);
  lucide.createIcons({ root: typingEl });
  scrollToBottom();
}

function removeTypingIndicator() {
  const typingEl = document.getElementById('typing-indicator');
  if (typingEl) typingEl.remove();
}

// Markdown parser helper
function renderMarkdown(md) {
  let html = escapeHtml(md);

  // Bold
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Code block
  html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Bullet Lists
  html = html.replace(/^\s*-\s+(.*)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>)/gs, '<ul>$1</ul>');

  // Numbered Lists
  html = html.replace(/^\s*\d+\.\s+(.*)$/gm, '<li>$1</li>');

  // Paragraphs
  const lines = html.split('\n\n');
  return lines.map(line => {
    if (line.startsWith('<ul>') || line.startsWith('<pre>') || line.startsWith('<li>')) return line;
    return `<p>${line.replace(/\n/g, '<br>')}</p>`;
  }).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function scrollToBottom() {
  elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
}

// Chat Session Storage
function startNewChat(customTitle = 'New Conversation') {
  const id = 'chat_' + Date.now();
  state.currentChatId = id;
  state.chats[id] = {
    id,
    title: customTitle,
    createdAt: new Date().toISOString(),
    messages: []
  };
  saveChatsToStorage();
  renderChatHistoryList();
  renderCurrentChat();
}

function selectChat(id) {
  state.currentChatId = id;
  renderChatHistoryList();
  renderCurrentChat();
}

function deleteChat(id, e) {
  e.stopPropagation();
  delete state.chats[id];
  if (state.currentChatId === id) {
    const remainingIds = Object.keys(state.chats);
    state.currentChatId = remainingIds.length > 0 ? remainingIds[remainingIds.length - 1] : null;
  }
  saveChatsToStorage();
  renderChatHistoryList();
  renderCurrentChat();
}

function renderChatHistoryList() {
  if (!elements.chatHistoryList) return;
  elements.chatHistoryList.innerHTML = '';

  const chatIds = Object.keys(state.chats).reverse();
  if (chatIds.length === 0) {
    elements.chatHistoryList.innerHTML = `<div class="text-xs text-slate-500 italic px-2 py-1">No chats yet</div>`;
    return;
  }

  chatIds.forEach(id => {
    const chat = state.chats[id];
    const isActive = id === state.currentChatId;
    const btn = document.createElement('div');
    btn.className = `group flex items-center justify-between p-2 rounded-xl text-xs cursor-pointer transition ${
      isActive ? 'bg-slate-800 text-orange-400 font-semibold' : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200'
    }`;
    btn.innerHTML = `
      <div class="flex items-center gap-2 truncate flex-1">
        <i data-lucide="message-square" class="w-3.5 h-3.5 shrink-0 ${isActive ? 'text-orange-400' : 'text-slate-500'}"></i>
        <span class="truncate">${escapeHtml(chat.title)}</span>
      </div>
      <button class="delete-chat-btn opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 rounded transition" title="Delete chat">
        <i data-lucide="trash" class="w-3 h-3"></i>
      </button>
    `;

    btn.addEventListener('click', () => selectChat(id));
    btn.querySelector('.delete-chat-btn').addEventListener('click', (e) => deleteChat(id, e));
    elements.chatHistoryList.appendChild(btn);
  });

  lucide.createIcons({ root: elements.chatHistoryList });
}

function renderCurrentChat() {
  elements.messagesList.innerHTML = '';
  if (!state.currentChatId || !state.chats[state.currentChatId] || state.chats[state.currentChatId].messages.length === 0) {
    elements.welcomeHero.style.display = 'block';
    return;
  }

  elements.welcomeHero.style.display = 'none';
  const messages = state.chats[state.currentChatId].messages;
  messages.forEach(msg => {
    appendMessage(msg.role, msg.content);
  });
}

function saveChatsToStorage() {
  try {
    localStorage.setItem('campus_mitra_chats', JSON.stringify(state.chats));
  } catch (e) {
    console.warn('Storage save failed', e);
  }
}

function loadChatsFromStorage() {
  try {
    const stored = localStorage.getItem('campus_mitra_chats');
    if (stored) {
      state.chats = JSON.parse(stored);
      const keys = Object.keys(state.chats);
      if (keys.length > 0) {
        state.currentChatId = keys[keys.length - 1];
      }
    }
  } catch (e) {
    state.chats = {};
  }
  renderChatHistoryList();
  renderCurrentChat();
}
