// Paste your Google Apps Script Web App URL here
const API_URL = "https://script.google.com/macros/s/AKfycbwsv4d09RiyRloHh-j9rxGt1gNlnQyqvVUXmCyzhZix63zsvhrdTje4ToMaFoySGz-U/exec";

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
// Update Nav UI & Show Dashboard
function updateNavUI() {
  const authSection = document.getElementById('nav-auth-section');
  const heroSection = document.querySelector('.hero'); // Hero section hide karne ke liye
  const dashSection = document.getElementById('user-dashboard');

  if (currentUser) {
    // Show Dashboard, Hide Hero
    if(heroSection) heroSection.style.display = 'none';
    if(dashSection) dashSection.classList.add('active');
    
    document.getElementById('user-name-display').innerText = currentUser.name;
    loadUserData(); // Fetch orders

    authSection.innerHTML = `
      <span style="font-weight:700;">${currentUser.name}</span>
      <button class="btn btn-outline" onclick="logoutUser()">Logout</button>
    `;
  }
}

// Fetch Data for Dashboard
async function loadUserData() {
  const res = await fetch(API_URL, {
    method: 'POST',
    body: JSON.stringify({ action: 'getUserDashboard', userId: currentUser.userId })
  });
  const data = await res.json();
  
  if (data.success) {
    // Render Subscription
    const subInfo = document.getElementById('active-sub-info');
    if (data.subscriptions.length > 0) {
      subInfo.innerHTML = `<p><strong>Plan:</strong> ${data.subscriptions[0].PlanType}</p>
                           <p><strong>Status:</strong> <span class="badge badge-yes">${data.subscriptions[0].Status}</span></p>`;
    } else {
      subInfo.innerHTML = `<p>No active subscription found. <a href="#tiffins">Subscribe Now</a></p>`;
    }

    // Render Orders
    const orderList = document.getElementById('order-history-list');
    orderList.innerHTML = data.orders.map(o => `<li>Order #${o.OrderID} - ${o.OrderStatus}</li>`).join('');
  }
}

// Explicit User Logout
function logoutUser() {
  localStorage.removeItem('tiffin_user_session');
  currentUser = null;
  location.reload();
}
// Local State for Subscription Modal
let globalTiffins = [];
let selectedTiffinForSub = null;
let selectedPlan = { type: 'Daily', days: 1, multiplier: 1 };

// Update User Nav & Auto Load Dashboard
function updateNavUI() {
  const authSection = document.getElementById('nav-auth-section');
  const heroSection = document.querySelector('.hero');
  const dashSection = document.getElementById('user-dashboard');

  if (currentUser) {
    if (heroSection) heroSection.style.display = 'none';
    if (dashSection) dashSection.classList.remove('hidden');

    document.getElementById('user-display-name').innerText = currentUser.name;
    authSection.innerHTML = `
      <span style="font-weight:700; display:flex; align-items:center; gap:6px;">
        <i class="fa-solid fa-circle-user" style="color:var(--primary); font-size:1.2rem;"></i> ${currentUser.name}
      </span>
      <button class="btn btn-outline" onclick="logoutUser()">Logout</button>
    `;

    loadUserDashboard();
  }
}

// Fetch User Subscription & Available Mess Data
async function loadUserDashboard() {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'getUserDashboard', userId: currentUser.userId })
    });
    const data = await res.json();

    if (data.success) {
      globalTiffins = data.availableTiffins || [];

      // Check Active Subscription
      if (data.activeSubscription) {
        document.getElementById('active-subscription-view').classList.remove('hidden');
        document.getElementById('no-subscription-view').classList.add('hidden');

        document.getElementById('active-provider-name').innerText = data.activeSubscription.TiffinID;
        document.getElementById('active-plan-type').innerText = `${data.activeSubscription.PlanType} Plan`;
        document.getElementById('active-end-date').innerText = data.activeSubscription.EndDate || 'Active';
      } else {
        // Show All Mess Search Engine
        document.getElementById('active-subscription-view').classList.add('hidden');
        document.getElementById('no-subscription-view').classList.remove('hidden');

        renderTiffinCards(globalTiffins);
      }

      // Render History Orders
      renderUserOrders(data.orders);
    }
  } catch (err) {
    console.error("Dashboard error:", err);
  }
}

// Render All Mess Cards
function renderTiffinCards(tiffins) {
  const container = document.getElementById('tiffins-cards-container');
  if (!tiffins || tiffins.length === 0) {
    container.innerHTML = `<p class="text-muted">No mess providers available right now.</p>`;
    return;
  }

  container.innerHTML = tiffins.map(tif => `
    <div class="tiffin-card">
      <img src="${tif.ImageURL || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d'}" class="tiffin-img" alt="${tif.ProviderName}">
      <div class="tiffin-body">
        <h3>${tif.ProviderName}</h3>
        <div class="tiffin-meta">
          <span><i class="fa-solid fa-utensils"></i> ${tif.MealType}</span>
          <span><i class="fa-solid fa-star" style="color:#F59E0B"></i> ${tif.Rating || '4.8'}</span>
          <span><i class="fa-solid fa-location-dot"></i> ${tif.Location}</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div><span style="font-size:1.3rem; font-weight:800; color:var(--primary);">₹${tif.Price}</span> / meal</div>
          <button class="btn btn-primary" onclick="openSubscriptionModal('${tif.TiffinID}')">Subscribe</button>
        </div>
      </div>
    </div>
  `).join('');
}

// Filter Tiffins
function filterTiffins() {
  const query = document.getElementById('search-location').value.toLowerCase();
  const filtered = globalTiffins.filter(t => 
    t.ProviderName.toLowerCase().includes(query) || t.Location.toLowerCase().includes(query)
  );
  renderTiffinCards(filtered);
}

function filterByMeal(type, btn) {
  document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  if (type === 'All') {
    renderTiffinCards(globalTiffins);
  } else {
    renderTiffinCards(globalTiffins.filter(t => t.MealType === type));
  }
}

// Subscription Modal Functions
function openSubscriptionModal(tiffinId) {
  selectedTiffinForSub = globalTiffins.find(t => t.TiffinID === tiffinId);
  if (!selectedTiffinForSub) return;

  document.getElementById('modal-tiffin-title').innerText = `Subscribe: ${selectedTiffinForSub.ProviderName}`;
  document.getElementById('modal-tiffin-location').innerText = `Location: ${selectedTiffinForSub.Location} | Meal: ${selectedTiffinForSub.MealType}`;

  // Update Prices
  const unitPrice = Number(selectedTiffinForSub.Price);
  document.getElementById('price-daily').innerText = `₹${unitPrice}`;
  document.getElementById('price-weekly').innerText = `₹${Math.round(unitPrice * 7 * 0.9)}`;
  document.getElementById('price-monthly').innerText = `₹${Math.round(unitPrice * 30 * 0.8)}`;

  calculateTotal();
  document.getElementById('checkout-modal').classList.add('active');
}

function selectPlan(planType, days, element) {
  document.querySelectorAll('.plan-box').forEach(b => b.classList.remove('active'));
  element.classList.add('active');

  let multiplier = 1;
  if (planType === 'Weekly') multiplier = 7 * 0.9;
  if (planType === 'Monthly') multiplier = 30 * 0.8;

  selectedPlan = { type: planType, days, multiplier };
  calculateTotal();
}

function calculateTotal() {
  if (!selectedTiffinForSub) return;
  const unitPrice = Number(selectedTiffinForSub.Price);
  const total = Math.round(unitPrice * selectedPlan.multiplier);

  document.getElementById('summary-unit-price').innerText = `₹${unitPrice}`;
  document.getElementById('summary-duration').innerText = `${selectedPlan.type} (${selectedPlan.days} Days)`;
  document.getElementById('summary-total-price').innerText = `₹${total.toLocaleString()}`;
}

function closeCheckoutModal() {
  document.getElementById('checkout-modal').classList.remove('active');
}

// Process Subscription & Payment
async function processSubscriptionPayment() {
  if (!currentUser || !selectedTiffinForSub) return;

  const confirmBtn = document.getElementById('btn-confirm-pay');
  toggleBtnLoading(confirmBtn, true);

  const unitPrice = Number(selectedTiffinForSub.Price);
  const total = Math.round(unitPrice * selectedPlan.multiplier);

  const startDate = new Date().toISOString().split('T')[0];
  const endDateObj = new Date();
  endDateObj.setDate(endDateObj.getDate() + selectedPlan.days);
  const endDate = endDateObj.toISOString().split('T')[0];

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'createSubscription',
        userId: currentUser.userId,
        tiffinId: selectedTiffinForSub.TiffinID,
        planType: selectedPlan.type,
        startDate: startDate,
        endDate: endDate,
        totalAmount: total
      })
    });

    const result = await res.json();
    toggleBtnLoading(confirmBtn, false);

    if (result.success) {
      showToast("🎉 Subscription Activated Successfully!", "success");
      closeCheckoutModal();
      loadUserDashboard(); // Reload view to show active subscription
    } else {
      showToast(result.message, "error");
    }
  } catch (err) {
    toggleBtnLoading(confirmBtn, false);
    showToast("Payment processing error!", "error");
  }
}

function renderUserOrders(orders) {
  const container = document.getElementById('user-orders-list');
  if (!orders || orders.length === 0) {
    container.innerHTML = `<p class="text-muted">No past orders yet.</p>`;
    return;
  }

  container.innerHTML = orders.map(o => `
    <div style="display:flex; justify-content:space-between; padding:0.8rem 0; border-bottom:1px solid #E2E8F0;">
      <div>
        <strong>Order #${o.OrderID}</strong>
        <div style="font-size:0.8rem; color:gray;">${new Date(o.Timestamp || Date.now()).toLocaleDateString()}</div>
      </div>
      <div>
        <span style="font-weight:700; color:var(--primary);">₹${o.Amount}</span>
        <span style="margin-left:8px; font-size:0.8rem; padding:2px 8px; background:#E2E8F0; border-radius:10px;">${o.OrderStatus}</span>
      </div>
    </div>
  `).join('');
}
// Global State for Tiffins
let allTiffinsList = [];
let selectedTiffinForSub = null;
let selectedPlan = { type: 'Daily', days: 1, multiplier: 1 };

// Page load par saare Tiffins fetch karna
document.addEventListener('DOMContentLoaded', () => {
  fetchExploreTiffins();
});

// Fetch Tiffins from Google Sheet Backend
async function fetchExploreTiffins() {
  const container = document.getElementById('explore-tiffins-container');
  
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'getAdminData' }) // Fetches all active tiffins from DB
    });
    const data = await res.json();

    if (data.success && data.tiffins) {
      // Filter only available tiffins
      allTiffinsList = data.tiffins.filter(t => t.Available === 'Yes' || t.Available === 'yes');
      renderExploreTiffins(allTiffinsList);
    } else {
      container.innerHTML = `<p class="text-muted" style="grid-column: 1/-1; text-align: center;">No mess services available right now.</p>`;
    }
  } catch (err) {
    console.error("Error fetching tiffins:", err);
    container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--danger);">Failed to load tiffins. Please check your network connection.</p>`;
  }
}

// Render Tiffin Cards in Grid
function renderExploreTiffins(tiffins) {
  const container = document.getElementById('explore-tiffins-container');
  
  if (!tiffins || tiffins.length === 0) {
    container.innerHTML = `<p class="text-muted" style="grid-column: 1/-1; text-align: center; padding: 2rem;">No matching tiffin providers found.</p>`;
    return;
  }

  container.innerHTML = tiffins.map(tif => `
    <div class="tiffin-card">
      <div class="tiffin-card-img-wrapper">
        <img src="${tif.ImageURL || 'https://images.unsplash.com/photo-1546833999-b9f581a1996d'}" alt="${tif.ProviderName}">
        <span class="meal-badge">${tif.MealType}</span>
        <span class="rating-badge"><i class="fa-solid fa-star" style="color:#F59E0B"></i> ${tif.Rating || '4.8'}</span>
      </div>
      <div class="tiffin-card-body">
        <div>
          <h3>${tif.ProviderName}</h3>
          <p class="location-info"><i class="fa-solid fa-location-dot" style="color:var(--primary);"></i> ${tif.Location}</p>
        </div>
        <div class="card-footer-action">
          <div>
            <span class="price-text">₹${tif.Price}</span>
            <span style="font-size:0.8rem; color:var(--text-muted);">/ meal</span>
          </div>
          <button class="btn btn-primary" onclick="openSubscriptionModal('${tif.TiffinID}')">Subscribe</button>
        </div>
      </div>
    </div>
  `).join('');
}

// Live Search Filter
function filterTiffins() {
  const query = document.getElementById('search-tiffin-input').value.toLowerCase().trim();
  const filtered = allTiffinsList.filter(t => 
    t.ProviderName.toLowerCase().includes(query) || 
    t.Location.toLowerCase().includes(query)
  );
  renderExploreTiffins(filtered);
}

// Category Meal Filter
function filterByMeal(type, button) {
  document.querySelectorAll('.filter-pills .pill-btn').forEach(b => b.classList.remove('active'));
  button.classList.add('active');

  if (type === 'All') {
    renderExploreTiffins(allTiffinsList);
  } else {
    const filtered = allTiffinsList.filter(t => t.MealType === type);
    renderExploreTiffins(filtered);
  }
}

// Subscription Modal Controller
function openSubscriptionModal(tiffinId) {
  // Check if user is logged in first
  if (!currentUser) {
    showToast("Please Sign In to subscribe to a meal plan!", "info");
    openModal('login');
    return;
  }

  selectedTiffinForSub = allTiffinsList.find(t => t.TiffinID === tiffinId);
  if (!selectedTiffinForSub) return;

  document.getElementById('modal-tiffin-title').innerText = `Subscribe: ${selectedTiffinForSub.ProviderName}`;
  document.getElementById('modal-tiffin-location').innerText = `Location: ${selectedTiffinForSub.Location} | Meal Type: ${selectedTiffinForSub.MealType}`;

  // Calculate Prices for Plans
  const unitPrice = Number(selectedTiffinForSub.Price);
  document.getElementById('price-daily').innerText = `₹${unitPrice} / day`;
  document.getElementById('price-weekly').innerText = `₹${Math.round(unitPrice * 7 * 0.9)} / wk`;
  document.getElementById('price-monthly').innerText = `₹${Math.round(unitPrice * 30 * 0.8)} / mo`;

  // Default to Daily
  selectedPlan = { type: 'Daily', days: 1, multiplier: 1 };
  calculateTotal();

  document.getElementById('checkout-modal').classList.add('active');
}

function selectPlan(planType, days, element) {
  document.querySelectorAll('.plan-box').forEach(b => b.classList.remove('active'));
  element.classList.add('active');

  let multiplier = 1;
  if (planType === 'Weekly') multiplier = 7 * 0.9;  // 10% Discount
  if (planType === 'Monthly') multiplier = 30 * 0.8; // 20% Discount

  selectedPlan = { type: planType, days, multiplier };
  calculateTotal();
}

function calculateTotal() {
  if (!selectedTiffinForSub) return;
  const unitPrice = Number(selectedTiffinForSub.Price);
  const total = Math.round(unitPrice * selectedPlan.multiplier);

  document.getElementById('summary-unit-price').innerText = `₹${unitPrice}`;
  document.getElementById('summary-duration').innerText = `${selectedPlan.type} (${selectedPlan.days} Days)`;
  document.getElementById('summary-total-price').innerText = `₹${total.toLocaleString()}`;
}

function closeCheckoutModal() {
  document.getElementById('checkout-modal').classList.remove('active');
}

// Process Subscription Payment Action
async function processSubscriptionPayment() {
  if (!currentUser || !selectedTiffinForSub) return;

  const btn = document.getElementById('btn-confirm-pay');
  toggleBtnLoading(btn, true);

  const unitPrice = Number(selectedTiffinForSub.Price);
  const total = Math.round(unitPrice * selectedPlan.multiplier);

  const startDate = new Date().toISOString().split('T')[0];
  const endDateObj = new Date();
  endDateObj.setDate(endDateObj.getDate() + selectedPlan.days);
  const endDate = endDateObj.toISOString().split('T')[0];

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'createSubscription',
        userId: currentUser.userId,
        tiffinId: selectedTiffinForSub.TiffinID,
        planType: selectedPlan.type,
        startDate: startDate,
        endDate: endDate,
        totalAmount: total
      })
    });

    const result = await res.json();
    toggleBtnLoading(btn, false);

    if (result.success) {
      showToast("🎉 Subscription Activated Successfully!", "success");
      closeCheckoutModal();
      
      // Reload user dashboard if logged in
      if (typeof loadUserDashboard === "function") {
        loadUserDashboard();
      }
    } else {
      showToast(result.message, "error");
    }
  } catch (err) {
    toggleBtnLoading(btn, false);
    showToast("Payment failed! Please try again.", "error");
  }
}