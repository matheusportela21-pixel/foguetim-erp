// Foguetim ERP — Popup Script

const API_BASE = 'https://app.foguetim.com.br/api';

// DOM Elements
const loginView = document.getElementById('loginView');
const connectedView = document.getElementById('connectedView');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const loginBtn = document.getElementById('loginBtn');
const errorMessage = document.getElementById('errorMessage');
const statusText = document.getElementById('statusText');
const draftCount = document.getElementById('draftCount');
const todayCount = document.getElementById('todayCount');
const viewDraftsBtn = document.getElementById('viewDraftsBtn');
const logoutBtn = document.getElementById('logoutBtn');

// ─── View Management ──────────────────────────────────────────────

function showLogin() {
  loginView.classList.add('active');
  connectedView.classList.remove('active');
}

function showConnected(user) {
  loginView.classList.remove('active');
  connectedView.classList.add('active');
  statusText.textContent = `Conectado como ${user.name || user.email}`;
}

function showError(message) {
  errorMessage.textContent = message;
  errorMessage.classList.add('visible');
}

function hideError() {
  errorMessage.classList.remove('visible');
}

// ─── Auth ─────────────────────────────────────────────────────────

async function login() {
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!email || !password) {
    showError('Preencha todos os campos.');
    return;
  }

  hideError();
  loginBtn.disabled = true;
  loginBtn.textContent = 'Entrando...';

  try {
    const response = await fetch(`${API_BASE}/auth/extension-login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });

    const data = await response.json();

    if (response.ok && data.token) {
      await chrome.storage.local.set({
        foguetim_token: data.token,
        foguetim_user: data.user || { email },
      });

      chrome.runtime.sendMessage({ action: 'clearBadge' });
      showConnected(data.user || { email });
      fetchStats(data.token);
    } else {
      showError(data.message || 'E-mail ou senha incorretos.');
    }
  } catch (err) {
    showError('Erro de conexao. Tente novamente.');
    console.error('[Foguetim Popup]', err);
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = 'Entrar';
  }
}

async function logout() {
  await chrome.storage.local.remove([
    'foguetim_token',
    'foguetim_user',
  ]);
  showLogin();
  draftCount.textContent = '-';
  todayCount.textContent = '-';
}

// ─── Stats ────────────────────────────────────────────────────────

async function fetchStats(token) {
  try {
    const response = await fetch(`${API_BASE}/listings/drafts/stats`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const data = await response.json();
      draftCount.textContent = data.total_drafts ?? '-';
      todayCount.textContent = data.copied_today ?? '-';
    }
  } catch (err) {
    console.error('[Foguetim Popup] Stats error:', err);
  }
}

// ─── Init ─────────────────────────────────────────────────────────

async function init() {
  const result = await chrome.storage.local.get([
    'foguetim_token',
    'foguetim_user',
  ]);

  if (result.foguetim_token && result.foguetim_user) {
    showConnected(result.foguetim_user);
    fetchStats(result.foguetim_token);
  } else {
    showLogin();
  }
}

// ─── Event Listeners ──────────────────────────────────────────────

loginBtn.addEventListener('click', login);

passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') login();
});

emailInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') passwordInput.focus();
});

viewDraftsBtn.addEventListener('click', () => {
  chrome.tabs.create({ url: 'https://app.foguetim.com.br/rascunhos' });
});

logoutBtn.addEventListener('click', logout);

// Initialize
init();
