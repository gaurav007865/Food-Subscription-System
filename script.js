// Paste your Google Apps Script Web App URL here
const API_URL = "YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE";

// DOM Elements
const authModal = document.getElementById('auth-modal');
const btnOpenLogin = document.getElementById('btn-open-login');
const btnOpenRegister = document.getElementById('btn-open-register');
const btnCloseModal = document.getElementById('close-modal');
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

// Persistent User State from LocalStorage
let currentUser = JSON.parse(localStorage.getItem('tiffin_user_session')) || null;

// Auto Check Session On Page Load
document.addEventListener('DOMContentLoaded', () => {
  updateNavUI();
});

// Modal Toggles
if(btnOpenLogin) btnOpenLogin.addEventListener('click', () => openModal('login'));
if(btnOpenRegister) btnOpenRegister.addEventListener('click', () => openModal('register'));
if(btnCloseModal) btnCloseModal.addEventListener('click', closeModal);

function openModal(type) {
  authModal.classList.add('active');
  switchTab(type);
}

function closeModal() {
  authModal.classList.remove('active');
}

// Tab Switching
if(tabLogin) tabLogin.addEventListener('click', () => switchTab('login'));
if(tabRegister) tabRegister.addEventListener('click', () => switchTab('register'));

function switchTab(type) {
  if (type === 'login') {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginForm.classList.add('active');
    registerForm.classList.remove('active');
  } else {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerForm.classList.add('active');
    loginForm.classList.remove('active');
  }
}

// Toast Helper
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  if(!container) return;
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);

  setTimeout(() => { toast.remove(); }, 3500);
}

// Password Hash Helper (SHA-256)
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// Register Handler
if(registerForm) {
  registerForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = document.getElementById('reg-name').value;
    const email = document.getElementById('reg-email').value;
    const phone = document.getElementById('reg-phone').value;
    const password = document.getElementById('reg-password').value;

    const submitBtn = document.getElementById('register-btn');
    toggleBtnLoading(submitBtn, true);

    const hashedPassword = await hashPassword(password);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'register', name, email, phone, password: hashedPassword })
      });

      const result = await res.json();
      toggleBtnLoading(submitBtn, false);

      if (result.success) {
        showToast('Account created successfully! Please login.', 'success');
        switchTab('login');
        registerForm.reset();
      } else {
        showToast(result.message, 'error');
      }
    } catch (err) {
      toggleBtnLoading(submitBtn, false);
      showToast('Failed to connect to server!', 'error');
    }
  });
}

// Login Handler
if(loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    const submitBtn = document.getElementById('login-btn');
    toggleBtnLoading(submitBtn, true);

    const hashedPassword = await hashPassword(password);

    try {
      const res = await fetch(API_URL, {
        method: 'POST',
        body: JSON.stringify({ action: 'login', email, password: hashedPassword })
      });

      const result = await res.json();
      toggleBtnLoading(submitBtn, false);

      if (result.success) {
        showToast(`Welcome back, ${result.user.name}!`, 'success');
        currentUser = result.user;
        // Save in localStorage for persistent session
        localStorage.setItem('tiffin_user_session', JSON.stringify(currentUser));
        updateNavUI();
        closeModal();
      } else {
        showToast(result.message, 'error');
      }
    } catch (err) {
      toggleBtnLoading(submitBtn, false);
      showToast('Server connection error!', 'error');
    }
  });
}

function toggleBtnLoading(button, isLoading) {
  const textSpan = button.querySelector('.btn-text');
  const loaderSpan = button.querySelector('.loader');

  if (isLoading) {
    textSpan.classList.add('hidden');
    loaderSpan.classList.remove('hidden');
    button.disabled = true;
  } else {
    textSpan.classList.remove('hidden');
    loaderSpan.classList.add('hidden');
    button.disabled = false;
  }
}

// Update UI based on Persistent Login State
function updateNavUI() {
  const authSection = document.getElementById('nav-auth-section');
  if (authSection && currentUser) {
    authSection.innerHTML = `
      <span style="font-weight:700; display:flex; align-items:center; gap:8px;">
        <i class="fa-solid fa-circle-user" style="color:var(--primary); font-size:1.3rem;"></i> 
        ${currentUser.name}
      </span>
      <button class="btn btn-outline" onclick="logoutUser()">Logout</button>
    `;
  }
}

// Explicit User Logout
function logoutUser() {
  localStorage.removeItem('tiffin_user_session');
  currentUser = null;
  location.reload();
}