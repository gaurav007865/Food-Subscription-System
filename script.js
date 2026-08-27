
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
let selectedTiffinForQuickOrder = null; // for the new "+" quick order flow
let selectedPaymentMethod = 'UPI'; // default selected
let pendingSubscribeIntent = false;     // (kept for compatibility, no longer used to gate the picker)
let pendingSubscriptionIntent = false;  // true when user tried to pay for a plan but wasn't logged in yet
let pendingQuickOrderTiffinId = null;   // remembers which tiffin's "+" was clicked before login
let areaStatusList = [];      // NEW: [{Area, Status}] - which areas currently need food donations

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

// Approx coordinates per Nagpur locality - stand-in until real per-provider coordinates exist
const DUMMY_AREA_COORDS = {
  'Bansi Nagar': { lat: 21.1352, lng: 79.0616 },
  'Lokmanya Nagar': { lat: 21.1197, lng: 79.0517 },
  'Dharampeth': { lat: 21.1394, lng: 79.0578 },
  'Sadar': { lat: 21.1622, lng: 79.0771 },
  'Civil Lines': { lat: 21.1580, lng: 79.0870 },
  'Sitabuldi': { lat: 21.1490, lng: 79.0810 },
  'Ramdaspeth': { lat: 21.1370, lng: 79.0790 },
  'Trimurti Nagar': { lat: 21.1280, lng: 79.0390 },
  'Pratap Nagar': { lat: 21.1330, lng: 79.0710 },
  'Manish Nagar': { lat: 21.1050, lng: 79.0300 },
  'Wardhaman Nagar': { lat: 21.1660, lng: 79.1210 },
  'Hingna Road': { lat: 21.1050, lng: 78.9950 }
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
          const coords = DUMMY_AREA_COORDS[t.Location] || DUMMY_AREA_COORDS['Sitabuldi'];
          const distance = haversineDistanceKm(userLat, userLng, coords.lat, coords.lng);
          return { ...t, distance, _coords: coords };
        })
        .sort((a, b) => a.distance - b.distance);

      // Also update the normal grid behind the modal, so it's ready when they close the map
      renderExploreTiffins(sorted);

      heroExploreBtn.innerText = originalText;
      heroExploreBtn.disabled = false;

      openMapModal(userLat, userLng, sorted);
    },
    (error) => {
      heroExploreBtn.innerText = originalText;
      heroExploreBtn.disabled = false;
      showToast("Location access denied. Showing all tiffins instead.", "info");
      if (tiffinsSection) tiffinsSection.scrollIntoView({ behavior: 'smooth' });
    }
  );
}

// ==========================================================================
// NEARBY MAP MODAL (Leaflet + OpenStreetMap — free, no API key needed)
// ==========================================================================
let nearbyMap = null;         // holds the Leaflet map instance so we don't re-init it
let nearbyMarkersLayer = null; // holds all markers so we can clear & redraw them

function openMapModal(userLat, userLng, sortedTiffins) {
  const modal = document.getElementById('map-modal');
  modal.classList.add('active');

  setTimeout(() => {
    if (!nearbyMap) {
      nearbyMap = L.map('nearby-map');
    }
    nearbyMap.setView([userLat, userLng], 12);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19
    }).addTo(nearbyMap);

    if (nearbyMarkersLayer) nearbyMap.removeLayer(nearbyMarkersLayer);
    nearbyMarkersLayer = L.layerGroup().addTo(nearbyMap);

    L.circleMarker([userLat, userLng], {
      radius: 9, color: '#1D4ED8', fillColor: '#3B82F6', fillOpacity: 0.9, weight: 2
    }).addTo(nearbyMarkersLayer).bindPopup('<strong>📍 You are here</strong>');

    const bounds = [[userLat, userLng]];
    const top = sortedTiffins.slice(0, 12);

    top.forEach(tif => {
      const coords = tif._coords;
      const marker = L.circleMarker([coords.lat, coords.lng], {
        radius: 9, color: '#E85A26', fillColor: '#FF6B35', fillOpacity: 0.9, weight: 2
      }).addTo(nearbyMarkersLayer);

      marker.bindPopup(`
        <div style="min-width:160px; font-family:'Plus Jakarta Sans', sans-serif;">
          <strong>${tif.ProviderName}</strong><br>
          <span style="font-size:0.85rem; color:#6C757D;">${tif.MealType} • ${tif.distance.toFixed(1)} km away</span><br>
          <span style="font-weight:800; color:#FF6B35;">₹${tif.Price} / meal</span><br>
          <button onclick="closeMapModal(); openSubscriptionModal('${tif.TiffinID}')"
            style="margin-top:6px; padding:5px 10px; background:#FF6B35; color:white; border:none; border-radius:6px; font-weight:700; cursor:pointer; font-size:0.8rem;">
            Subscribe
          </button>
        </div>
      `);

      bounds.push([coords.lat, coords.lng]);
    });

    nearbyMap.fitBounds(bounds, { padding: [40, 40] });
    setTimeout(() => nearbyMap.invalidateSize(), 200);

    renderNearbyMapList(top, userLat, userLng);
  }, 100);
}

function renderNearbyMapList(tiffins, userLat, userLng) {
  const list = document.getElementById('nearby-map-list');
  if (!list) return;

  if (!tiffins || tiffins.length === 0) {
    list.innerHTML = `<p class="text-muted">No nearby tiffins found.</p>`;
    return;
  }

  list.innerHTML = tiffins.map(tif => `
    <div class="nearby-map-item" onclick="focusMapMarker(${tif._coords.lat}, ${tif._coords.lng})">
      <div>
        <strong>${tif.ProviderName}</strong>
        <div style="font-size:0.8rem; color:var(--text-muted);">${tif.Location} • ${tif.distance.toFixed(1)} km away</div>
      </div>
      <span class="price-text" style="font-size:1rem;">₹${tif.Price}</span>
    </div>
  `).join('');
}

function focusMapMarker(lat, lng) {
  if (nearbyMap) nearbyMap.setView([lat, lng], 15);
}

function closeMapModal() {
  const modal = document.getElementById('map-modal');
  modal.classList.remove('active');
}

// Modal Toggles (Auth)
if (btnOpenLogin) btnOpenLogin.addEventListener('click', () => openModal('login'));
if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);

// NEW: navbar "Subscribe" button (was "Get Started") - starts the subscribe journey
const btnNavSubscribe = document.getElementById('btn-open-register');
if (btnNavSubscribe) btnNavSubscribe.addEventListener('click', handleNavSubscribeClick);

function handleNavSubscribeClick() {
  const source = (globalTiffins && globalTiffins.length) ? globalTiffins : allTiffinsList;
  if (!source || source.length === 0) return;
  openSubscriptionModal(source[0].TiffinID);
}

// NEW: navbar "Donate Food" link - opens the donation popup directly (works regardless of subscription)
function handleNavDonateClick(e) {
  e.preventDefault();
  openDonationModal();
}

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

// NEW: toggles between User and NGO registration fields
let currentRegisterType = 'user';

function switchRegisterType(type) {
  currentRegisterType = type;
  const userBtn = document.getElementById('reg-type-user-btn');
  const ngoBtn = document.getElementById('reg-type-ngo-btn');
  const userFields = document.getElementById('user-register-fields');
  const ngoFields = document.getElementById('ngo-register-fields');

  if (type === 'user') {
    userBtn.classList.add('active');
    ngoBtn.classList.remove('active');
    userFields.classList.remove('hidden');
    ngoFields.classList.add('hidden');
  } else {
    ngoBtn.classList.add('active');
    userBtn.classList.remove('active');
    ngoFields.classList.remove('hidden');
    userFields.classList.add('hidden');
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
    const submitBtn = document.getElementById('register-btn');
    toggleBtnLoading(submitBtn, true);

    try {
      if (currentRegisterType === 'user') {
        // -------- INDIVIDUAL USER REGISTRATION --------
        const name = document.getElementById('reg-name').value;
        const email = document.getElementById('reg-email').value;
        const phone = document.getElementById('reg-phone').value;
        const address = document.getElementById('reg-address').value;
        const password = document.getElementById('reg-password').value;
        const hashedPassword = await hashPassword(password);

        const res = await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'register', name, email, phone, address, password: hashedPassword })
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

      } else {
        // -------- NGO REGISTRATION (no password - admin sets it after verification) --------
        const ngoName = document.getElementById('reg-ngo-name').value;
        const email = document.getElementById('reg-ngo-email').value;
        const phone = document.getElementById('reg-ngo-phone').value;
        const address = document.getElementById('reg-ngo-address').value;

        const res = await fetch(API_URL, {
          method: 'POST',
          body: JSON.stringify({ action: 'registerNGO', ngoName, email, phone, address })
        });
        const result = await res.json();
        toggleBtnLoading(submitBtn, false);

        if (result.success) {
          showToast('NGO registration submitted! Our team will verify and share login access.', 'success');
          switchTab('login');
          registerForm.reset();
          switchRegisterType('user'); // reset toggle back to default for next time
        } else {
          showToast(result.message, 'error');
        }
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

        // If they clicked navbar "Subscribe" before logging in, continue that journey now
        if (pendingSubscribeIntent) {
          pendingSubscribeIntent = false;
          setTimeout(() => openSubscribePickerModal(), 300);
        }

        // If they tried to pay for a plan before logging in, finish that payment now
        if (pendingSubscriptionIntent) {
          pendingSubscriptionIntent = false;
          setTimeout(() => processSubscriptionPayment(), 300);
        }

        // If they clicked a card's "+" before logging in, continue straight to that payment popup
        if (pendingQuickOrderTiffinId) {
          const tiffinIdToOrder = pendingQuickOrderTiffinId;
          pendingQuickOrderTiffinId = null;
          setTimeout(() => openQuickOrderModal(tiffinIdToOrder), 300);
        }
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
      // Fallback: if the dashboard's own tiffin list comes back empty (e.g. a
      // casing mismatch on the "Available" column in the Sheet), fall back to
      // the already-fetched public list so the section never looks blank.
      globalTiffins = (data.availableTiffins && data.availableTiffins.length)
        ? data.availableTiffins
        : allTiffinsList;

      const points = data.rewardPoints || 0;
      const pointsEl = document.getElementById('reward-points-value');
      if (pointsEl) pointsEl.innerText = points;

      if (data.activeSubscription) {
        document.getElementById('active-subscription-view').classList.remove('hidden');
        document.getElementById('active-provider-name').innerText = data.activeSubscription.TiffinID;
        document.getElementById('active-plan-type').innerText = `${data.activeSubscription.PlanType} Plan`;
        document.getElementById('active-end-date').innerText = data.activeSubscription.EndDate || 'Active';
        document.getElementById('no-sub-banner').classList.add('hidden'); // hide only the "no plan yet" message
      } else {
        document.getElementById('active-subscription-view').classList.add('hidden');
        document.getElementById('no-sub-banner').classList.remove('hidden');
      }

      // Tiffin browsing + "+" ordering is always available, subscribed or not
      document.getElementById('no-subscription-view').classList.remove('hidden');
      renderTiffinCards(globalTiffins);

      renderUserOrders(data.orders || []);
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
// DONATION MODULE
// ==========================================================================

function openDonationModal() {
  if (!currentUser) {
    showToast("Please Sign In to donate food!", "info");
    openModal('login');
    return;
  }
  document.getElementById('donation-form').reset();
  const statusEl = document.getElementById('area-need-status');
  if (statusEl) statusEl.innerHTML = ''; // NEW: clear old area badge each time modal opens
  document.getElementById('donation-modal').classList.add('active');
}

function closeDonationModal() {
  document.getElementById('donation-modal').classList.remove('active');
}

// NEW: shows a "Needed" / "Not Needed" badge under the area dropdown based on AreaStatus sheet data
function updateAreaNeedStatus() {
  const areaSelect = document.getElementById('donate-area');
  const statusEl = document.getElementById('area-need-status');
  if (!areaSelect || !statusEl) return;

  const selectedArea = areaSelect.value;
  if (!selectedArea) {
    statusEl.innerHTML = '';
    return;
  }

  const match = areaStatusList.find(a =>
    (a.Area || '').toString().trim().toLowerCase() === selectedArea.trim().toLowerCase()
  );

  // Default to "Needed" if admin hasn't set a status for this area yet
  const isNeeded = match ? (match.Status || '').toString().trim().toLowerCase() === 'needed' : true;

  if (isNeeded) {
    statusEl.innerHTML = `
      <span class="area-badge area-badge-needed">
        <i class="fa-solid fa-circle-check"></i> Needed — Food is needed in this area
      </span>`;
  } else {
    statusEl.innerHTML = `
      <span class="area-badge area-badge-not-needed">
        <i class="fa-solid fa-circle-xmark"></i> Not Needed — Food is not needed in this area
      </span>`;
  }
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
      loadUserDashboard();
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
// TODAY'S MENU MODAL
// ==========================================================================
function openMenuModal(tiffinId) {
  const source = (currentUser && globalTiffins.length) ? globalTiffins : allTiffinsList;
  const tif = source.find(t => t.TiffinID === tiffinId);
  if (!tif) return;

  document.getElementById('menu-modal-title').innerHTML =
    `<i class="fa-solid fa-utensils" style="color:var(--primary);"></i> ${tif.ProviderName} — Today's Menu`;
  document.getElementById('menu-modal-location').innerText = `${tif.Location} • ${tif.MealType}`;

  const menuList = document.getElementById('menu-modal-list');
  const menuText = (tif.TodayMenu || '').trim();

  if (!menuText) {
    menuList.innerHTML = `<p class="text-muted">Menu not updated yet for today. Please check back later.</p>`;
  } else {
    const items = menuText.split(',').map(i => i.trim()).filter(Boolean);
    menuList.innerHTML = items.map(item => `
      <div class="menu-item-row">
        <i class="fa-solid fa-bowl-food"></i>
        <span>${item}</span>
      </div>
    `).join('');
  }

  document.getElementById('menu-modal').classList.add('active');
}

function closeMenuModal() {
  document.getElementById('menu-modal').classList.remove('active');
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
      areaStatusList = data.areaStatus || []; // NEW: capture area need/not-needed data
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
          <span class="view-menu-link" onclick="openMenuModal('${tif.TiffinID}')">
            <i class="fa-solid fa-list-ul"></i> View Today's Menu
          </span>
        </div>
        <div class="card-footer-action">
          <div>
            <span class="price-text">₹${tif.Price}</span>
            <span style="font-size:0.8rem; color:var(--text-muted);">/ meal</span>
          </div>
          <button class="btn btn-primary btn-add-rect" onclick="openQuickOrderModal('${tif.TiffinID}')">
            Add <i class="fa-solid fa-plus"></i>
          </button>
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
        <span class="view-menu-link" onclick="openMenuModal('${tif.TiffinID}')">
          <i class="fa-solid fa-list-ul"></i> View Today's Menu
        </span>
        <div class="tiffin-meta">
          <span><i class="fa-solid fa-utensils"></i> ${tif.MealType}</span>
          <span><i class="fa-solid fa-star" style="color:#F59E0B"></i> ${tif.Rating || '4.8'}</span>
          <span><i class="fa-solid fa-location-dot"></i> ${tif.Location}</span>
        </div>
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <div><span style="font-size:1.3rem; font-weight:800; color:var(--primary);">₹${tif.Price}</span> / meal</div>
          <button class="btn btn-primary btn-add-rect" onclick="openQuickOrderModal('${tif.TiffinID}')">
            Add <i class="fa-solid fa-plus"></i>
          </button>
        </div>
      </div>
    </div>
  `).join('');
}

// ==========================================================================
// SUBSCRIBE PICKER (opened from navbar "Subscribe" button)
// ==========================================================================
function openSubscribePickerModal() {
  const source = (globalTiffins && globalTiffins.length) ? globalTiffins : allTiffinsList;
  const list = document.getElementById('subscribe-picker-list');

  if (!source || source.length === 0) {
    list.innerHTML = `<p class="text-muted">No tiffins available right now.</p>`;
  } else {
    list.innerHTML = source.map(t => `
      <div class="nearby-map-item" onclick="closeSubscribePickerModal(); openSubscriptionModal('${t.TiffinID}')">
        <div>
          <strong>${t.ProviderName}</strong>
          <div style="font-size:0.8rem; color:var(--text-muted);">${t.Location} • ${t.MealType}</div>
        </div>
        <span class="price-text" style="font-size:1rem;">₹${t.Price}</span>
      </div>
    `).join('');
  }

  document.getElementById('subscribe-picker-modal').classList.add('active');
}

function closeSubscribePickerModal() {
  document.getElementById('subscribe-picker-modal').classList.remove('active');
}

// ==========================================================================
// QUICK ORDER (the "+" button on each card)
// FIXED: now remembers which tiffin was clicked if login is required first,
// and automatically re-opens this same popup right after login succeeds.
// ==========================================================================
function openQuickOrderModal(tiffinId) {
  if (!currentUser) {
    pendingQuickOrderTiffinId = tiffinId; // remember intent so we auto-continue right after login
    showToast("Please Sign In to order!", "info");
    openModal('login');
    return;
  }

  const source = (globalTiffins && globalTiffins.length) ? globalTiffins : allTiffinsList;
  selectedTiffinForQuickOrder = source.find(t => t.TiffinID === tiffinId);
  if (!selectedTiffinForQuickOrder) return;

  document.getElementById('quick-order-title').innerText = `Order: ${selectedTiffinForQuickOrder.ProviderName}`;
  document.getElementById('quick-order-location').innerText = `${selectedTiffinForQuickOrder.Location} • ${selectedTiffinForQuickOrder.MealType}`;
  document.getElementById('quick-order-price').innerText = `₹${selectedTiffinForQuickOrder.Price}`;
  document.getElementById('quick-order-total').innerText = `₹${selectedTiffinForQuickOrder.Price}`;

  document.getElementById('quick-order-modal').classList.add('active');
}

function closeQuickOrderModal() {
  document.getElementById('quick-order-modal').classList.remove('active');
}

function selectPaymentMethod(method, element) {
  selectedPaymentMethod = method;
  document.querySelectorAll('.payment-option').forEach(el => el.classList.remove('active'));
  element.classList.add('active');
}

async function processQuickOrder() {
  if (!currentUser || !selectedTiffinForQuickOrder) return;

  const btn = document.getElementById('btn-confirm-quick-order');
  toggleBtnLoading(btn, true);

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'placeOrder',
        userId: currentUser.userId,
        tiffinId: selectedTiffinForQuickOrder.TiffinID,
        amount: selectedTiffinForQuickOrder.Price,
        paymentMethod: selectedPaymentMethod
      })
    });
    const result = await res.json();
    toggleBtnLoading(btn, false);

    if (result.success) {
      showToast("🎉 Order placed successfully!", "success");
      closeQuickOrderModal();
      if (currentUser) loadUserDashboard();
    } else {
      showToast(result.message, "error");
    }
  } catch (err) {
    toggleBtnLoading(btn, false);
    showToast("Order failed! Please try again.", "error");
  }
}

// ==========================================================================
// SUBSCRIPTION / CHECKOUT (unchanged)
// ==========================================================================
function openSubscriptionModal(tiffinId) {
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
  if (!selectedTiffinForSub) return;

  if (!currentUser) {
    pendingSubscriptionIntent = true; // remember so we auto-continue payment right after login
    showToast("For Payment first login/register.", "info");
    openModal('login');
    return;
  }

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