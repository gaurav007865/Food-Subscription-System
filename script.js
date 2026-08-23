 //This is Script connectivity
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

// Global State
let allTiffinsList = [];      // tiffins for "Explore" section (public, no login needed)
let globalTiffins = [];       // tiffins for logged-in dashboard subscribe flow
let selectedTiffinForSub = null;
let selectedPlan = { type: 'Daily', days: 1, multiplier: 1 };

// ==========================================================================
// PAGE LOAD
// ==========================================================================
document.addEventListener('DOMContentLoaded', () => {
  updateNavUI();
  fetchExploreTiffins();

  // Hero CTA button -> get user's location and show nearest tiffins first
  const heroExploreBtn = document.getElementById('hero-explore-btn');
  if (heroExploreBtn) {
    heroExploreBtn.addEventListener('click', findNearestTiffins);
  }
});

// ==========================================================================
// "FIND TIFFINS NEAR ME" - DUMMY GPS DEMO
// TODO: Once real coordinates are added to the Tiffins sheet (Latitude,
// Longitude columns), replace DUMMY_AREA_COORDS lookup below with the
// tiffin's own tif.Latitude / tif.Longitude values.
// ==========================================================================

// Approx coordinates per area name - stand-in until real per-provider coordinates exist
const DUMMY_AREA_COORDS = {
  'Gurgaon': { lat: 28.4595, lng: 77.0266 },
  'Delhi': { lat: 28.7041, lng: 77.1025 },
  'Noida': { lat: 28.5355, lng: 77.3910 },
  'Pune': { lat: 18.5204, lng: 73.8567 },
  'Mumbai': { lat: 19.0760, lng: 72.8777 },
  'Pimpri-Chinchwad': { lat: 18.6298, lng: 73.7997 }
};

// Haversine formula - real-world distance (km) between two lat/lng points
function haversineDistanceKm(lat1, lng1, lat2, lng2) {
  const toRad = deg => (deg * Math.PI) / 180;
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function findNearestTiffins() {
  const heroExploreBtn = document.getElementById('hero-explore-btn');
  const tiffinsSection = document.getElementById('tiffins');

  if (!navigator.geolocation) {
    showToast("Location not supported by your browser. Showing all tiffins.", "info");
    if (tiffinsSection) tiffinsSection.scrollIntoView({ behavior: 'smooth' });
    return;
  }

  const originalText = heroExploreBtn.innerText;
  heroExploreBtn.innerText = "Locating...";
  heroExploreBtn.disabled = true;

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      const sorted = [...allTiffinsList]
        .map(t => {
          const coords = DUMMY_AREA_COORDS[t.Location] || DUMMY_AREA_COORDS['Delhi'];
          const distance = haversineDistanceKm(userLat, userLng, coords.lat, coords.lng);
          return { ...t, distance };
        })
        .sort((a, b) => a.distance - b.distance);

      renderExploreTiffins(sorted);
      showToast("Showing tiffins nearest to you first (demo location data).", "success");

      heroExploreBtn.innerText = originalText;
      heroExploreBtn.disabled = false;
      if (tiffinsSection) tiffinsSection.scrollIntoView({ behavior: 'smooth' });
    },
    (error) => {
      heroExploreBtn.innerText = originalText;
      heroExploreBtn.disabled = false;
      showToast("Location access denied. Showing all tiffins instead.", "info");
      if (tiffinsSection) tiffinsSection.scrollIntoView({ behavior: 'smooth' });
    }
  );
}

// Modal Toggles (Auth)
if (btnOpenLogin) btnOpenLogin.addEventListener('click', () => openModal('login'));
if (btnOpenRegister) btnOpenRegister.addEventListener('click', () => openModal('register'));
if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);

function openModal(type) {
  authModal.classList.add('active');
  switchTab(type);
}

function closeModal() {
  authModal.classList.remove('active');
}

// Tab Switching (Auth)
if (tabLogin) tabLogin.addEventListener('click', () => switchTab('login'));
if (tabRegister) tabRegister.addEventListener('click', () => switchTab('register'));

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
  if (!container) return;
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

// ==========================================================================
// REGISTER / LOGIN
// ==========================================================================
if (registerForm) {
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

if (loginForm) {
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

function logoutUser() {
  localStorage.removeItem('tiffin_user_session');
  currentUser = null;
  location.reload();
}

// ==========================================================================
// NAV UI / DASHBOARD SWITCH
// ==========================================================================
function updateNavUI() {
  const authSection = document.getElementById('nav-auth-section');
  const heroSection = document.querySelector('.hero');
  const exploreSection = document.getElementById('tiffins');
  const dashSection = document.getElementById('user-dashboard');

  if (currentUser) {
    if (heroSection) heroSection.style.display = 'none';
    if (exploreSection) exploreSection.style.display = 'none'; // hide public menu once logged in, dashboard has its own
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

// Fetch User Subscription, Donations, Reward Points & Orders
async function loadUserDashboard() {
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'getUserDashboard', userId: currentUser.userId })
    });
    const data = await res.json();

    if (data.success) {
      globalTiffins = data.availableTiffins || [];

      // Reward Points
      const points = data.rewardPoints || 0;
      const pointsEl = document.getElementById('reward-points-value');
      if (pointsEl) pointsEl.innerText = points;

      // Active Subscription
      if (data.activeSubscription) {
        document.getElementById('active-subscription-view').classList.remove('hidden');
        document.getElementById('no-subscription-view').classList.add('hidden');

        document.getElementById('active-provider-name').innerText = data.activeSubscription.TiffinID;
        document.getElementById('active-plan-type').innerText = `${data.activeSubscription.PlanType} Plan`;
        document.getElementById('active-end-date').innerText = data.activeSubscription.EndDate || 'Active';
      } else {
        document.getElementById('active-subscription-view').classList.add('hidden');
        document.getElementById('no-subscription-view').classList.remove('hidden');
        renderTiffinCards(globalTiffins);
      }

      // Orders
      renderUserOrders(data.orders || []);

      // Donations (NEW)
      renderUserDonations(data.donations || []);
    }
  } catch (err) {
    console.error("Dashboard error:", err);
    showToast('Could not load your dashboard. Please try again.', 'error');
  }
}

function renderUserOrders(orders) {
  const container = document.getElementById('user-orders-list');
  if (!container) return;
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

// ==========================================================================
// DONATION MODULE (NEW)
// ==========================================================================

function openDonationModal() {
  if (!currentUser) {
    showToast("Please Sign In to donate food!", "info");
    openModal('login');
    return;
  }
  document.getElementById('donation-form').reset();
  document.getElementById('donation-modal').classList.add('active');
}

function closeDonationModal() {
  document.getElementById('donation-modal').classList.remove('active');
}

async function submitDonation(e) {
  e.preventDefault();
  if (!currentUser) {
    showToast("Please Sign In to donate food!", "info");
    return;
  }

  const foodDetails = document.getElementById('donate-food-details').value.trim();
  const quantity = document.getElementById('donate-quantity').value;
  const area = document.getElementById('donate-area').value;
  const expiryHours = document.getElementById('donate-expiry').value;
  const address = document.getElementById('donate-address').value.trim();

  if (!foodDetails || !quantity || !area || !expiryHours || !address) {
    showToast("Please fill in all donation details.", "error");
    return;
  }

  const btn = document.getElementById('btn-submit-donation');
  toggleBtnLoading(btn, true);

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'submitDonation',
        userId: currentUser.userId,
        donorName: currentUser.name,
        foodDetails: `${foodDetails} (Qty: ${quantity})`,
        area,
        expiryHours,
        address
      })
    });
    const result = await res.json();
    toggleBtnLoading(btn, false);

    if (result.success) {
      showToast("🎉 Donation request submitted! Status: Pending", "success");
      closeDonationModal();
      loadUserDashboard(); // refresh donations list + reward points
    } else {
      showToast(result.message || "Could not submit donation.", "error");
    }
  } catch (err) {
    toggleBtnLoading(btn, false);
    showToast("Failed to connect to server!", "error");
  }
}

function renderUserDonations(donations) {
  const container = document.getElementById('user-donations-list');
  if (!container) return;

  if (!donations || donations.length === 0) {
    container.innerHTML = `<p class="text-muted">You haven't donated any food yet. Click "Donate Food" above to get started!</p>`;
    return;
  }

  container.innerHTML = donations.map(d => {
    const status = (d.Status || 'Pending').trim();
    const badgeClass = status.toLowerCase() === 'accepted' ? 'badge-yes'
                      : status.toLowerCase() === 'rejected' ? 'badge-no'
                      : 'badge-pending';
    return `
      <div class="donation-item">
        <div class="donation-item-main">
          <strong>#${d.DonationID}</strong> — ${d.FoodDetails}
          <div class="donation-item-meta">
            <span><i class="fa-solid fa-location-dot"></i> ${d.Area || 'N/A'}</span>
            <span><i class="fa-solid fa-clock"></i> Expires in ${d.ExpiryHours || '-'}h</span>
            ${d.NGOAssigned ? `<span><i class="fa-solid fa-people-group"></i> ${d.NGOAssigned}</span>` : ''}
          </div>
        </div>
        <span class="status-badge ${badgeClass}">${status}</span>
      </div>
    `;
  }).join('');
}

// ==========================================================================
// EXPLORE TIFFINS (Public section, no login required)
// ==========================================================================
async function fetchExploreTiffins() {
  const container = document.getElementById('explore-tiffins-container');
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({ action: 'getAdminData' })
    });
    const data = await res.json();

    if (data.success && data.tiffins) {
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

function filterTiffins() {
  const inputEl = document.getElementById('search-tiffin-input') || document.getElementById('search-location');
  const query = (inputEl ? inputEl.value : '').toLowerCase().trim();

  if (currentUser) {
    const filtered = globalTiffins.filter(t =>
      t.ProviderName.toLowerCase().includes(query) || t.Location.toLowerCase().includes(query)
    );
    renderTiffinCards(filtered);
  } else {
    const filtered = allTiffinsList.filter(t =>
      t.ProviderName.toLowerCase().includes(query) || t.Location.toLowerCase().includes(query)
    );
    renderExploreTiffins(filtered);
  }
}

function filterByMeal(type, button) {
  document.querySelectorAll('.pill-btn').forEach(b => b.classList.remove('active'));
  button.classList.add('active');

  const source = currentUser ? globalTiffins : allTiffinsList;
  const renderFn = currentUser ? renderTiffinCards : renderExploreTiffins;

  if (type === 'All') {
    renderFn(source);
  } else {
    renderFn(source.filter(t => t.MealType === type));
  }
}

// Tiffin Cards Grid (logged-in dashboard version)
function renderTiffinCards(tiffins) {
  const container = document.getElementById('tiffins-cards-container');
  if (!container) return;
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

// ==========================================================================
// SUBSCRIPTION / CHECKOUT
// ==========================================================================
function openSubscriptionModal(tiffinId) {
  if (!currentUser) {
    showToast("Please Sign In to subscribe to a meal plan!", "info");
    openModal('login');
    return;
  }

  const source = globalTiffins.length ? globalTiffins : allTiffinsList;
  selectedTiffinForSub = source.find(t => t.TiffinID === tiffinId);
  if (!selectedTiffinForSub) return;

  document.getElementById('modal-tiffin-title').innerText = `Subscribe: ${selectedTiffinForSub.ProviderName}`;
  document.getElementById('modal-tiffin-location').innerText = `Location: ${selectedTiffinForSub.Location} | Meal Type: ${selectedTiffinForSub.MealType}`;

  const unitPrice = Number(selectedTiffinForSub.Price);
  document.getElementById('price-daily').innerText = `₹${unitPrice} / day`;
  document.getElementById('price-weekly').innerText = `₹${Math.round(unitPrice * 7 * 0.9)} / wk`;
  document.getElementById('price-monthly').innerText = `₹${Math.round(unitPrice * 30 * 0.8)} / mo`;

  selectedPlan = { type: 'Daily', days: 1, multiplier: 1 };
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
      loadUserDashboard();
    } else {
      showToast(result.message, "error");
    }
  } catch (err) {
    toggleBtnLoading(btn, false);
    showToast("Payment failed! Please try again.", "error");
  }
}