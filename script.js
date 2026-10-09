// DOM Elements
// const API_URL = "https://script.google.com/macros/s/AKfycbywybsOpZzm3zJ3H6C1UDZ1zgRWa7-Nsq8AMIwMxa6zXEZuLKw9ej861SQ1LbCaygd1pw/exec";
const authModal = document.getElementById('auth-modal');


const btnOpenLogin = document.getElementById('btn-open-login');


const btnOpenRegister = document.getElementById('btn-open-register');


const btnCloseModal = document.getElementById('close-modal');


const tabLogin = document.getElementById('tab-login');


const tabRegister = document.getElementById('tab-register');


const loginForm = document.getElementById('login-form');


const registerForm = document.getElementById('register-form');

const forgotPasswordForm =
  document.getElementById('forgot-password-form');

  const resetPasswordForm =
  document.getElementById('reset-password-form');

const resetPasswordBtn =
  document.getElementById('reset-password-btn');

const resetBackLoginBtn =
  document.getElementById('reset-back-login-btn');

const forgotPasswordBtn =
  document.getElementById('forgot-password-btn');

const sendResetBtn =
  document.getElementById('send-reset-btn');

const backToLoginBtn =
  document.getElementById('back-to-login-btn');
 


let currentUser = JSON.parse(localStorage.getItem('tiffin_user_session')) || null;


 


let allTiffinsList = [];


let globalTiffins = [];


let selectedTiffinForSub = null;


let selectedPlan = { type: 'Daily', days: 1, multiplier: 1 };


let selectedTiffinForQuickOrder = null;


let selectedPaymentMethod = 'UPI';


let pendingSubscribeIntent = false;


let pendingSubscriptionIntent = false;


let pendingQuickOrderTiffinId = null;


let areaStatusList = [];


 


// Phase 5 state


let reviewedOrderIds = [];


let selectedOrderForReview = null;


let selectedRating = 0;


 
function formatDateTime12(value) {
  if (!value) return '';

  const date = new Date(value);

  if (isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// ==========================================================================


// PAGE LOAD


// ==========================================================================


document.addEventListener(
  'DOMContentLoaded',
  () => {

    updateNavUI();

    document.addEventListener(
  'DOMContentLoaded',
  () => {

    updateNavUI();

    fetchExploreTiffins();

    // baaki existing code...
  }
);

    }

  
);
if (resetBackLoginBtn) {

  resetBackLoginBtn.addEventListener(
    'click',
    () => {

      resetToken = "";

      switchTab('login');

    }
  );

}


 


// ==========================================================================


// NEARBY MAP (Leaflet)


// ==========================================================================


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


 


function haversineDistanceKm(lat1, lng1, lat2, lng2) {


  const toRad = deg => (deg * Math.PI) / 180;


  const R = 6371;


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

  if (!heroExploreBtn) {
    console.error("Find Tiffins button not found.");
    return;
  }

  if (!Array.isArray(allTiffinsList) || allTiffinsList.length === 0) {
    showToast("No tiffin services available right now.", "info");
    return;
  }

  if (!navigator.geolocation) {
    showToast(
      "Your browser does not support location.",
      "error"
    );
    return;
  }

  const originalText = heroExploreBtn.innerText;

  heroExploreBtn.innerText = "📍 Finding Near You...";
  heroExploreBtn.disabled = true;

  navigator.geolocation.getCurrentPosition(

    function(position) {

      const userLat = position.coords.latitude;
      const userLng = position.coords.longitude;

      console.log("USER LOCATION");
      console.log("Latitude:", userLat);
      console.log("Longitude:", userLng);

      try {

        const nearestTiffins = allTiffinsList
          .map(function(tiffin) {

            /*
             * IMPORTANT:
             * Your Tiffins sheet should contain
             * Latitude and Longitude columns.
             */

            const tiffinLat = parseFloat(
              tiffin.Latitude ||
              tiffin.latitude ||
              tiffin.Lat ||
              tiffin.lat
            );

            const tiffinLng = parseFloat(
              tiffin.Longitude ||
              tiffin.longitude ||
              tiffin.Lng ||
              tiffin.lng
            );

            // Skip tiffins which don't have GPS coordinates
            if (
              isNaN(tiffinLat) ||
              isNaN(tiffinLng)
            ) {
              return null;
            }

            const distance = haversineDistanceKm(
              userLat,
              userLng,
              tiffinLat,
              tiffinLng
            );

            return {
              ...tiffin,

              distance: distance,

              _coords: {
                lat: tiffinLat,
                lng: tiffinLng
              }
            };

          })
          .filter(function(tiffin) {
            return tiffin !== null;
          })
          .sort(function(a, b) {
            return a.distance - b.distance;
          });


        console.log(
          "NEAREST TIFFIN SERVICES:",
          nearestTiffins
        );


        if (nearestTiffins.length === 0) {

          showToast(
            "No tiffin service with location found nearby.",
            "info"
          );

          renderExploreTiffins([]);

          return;
        }


        // Show nearest tiffins first
        renderExploreTiffins(nearestTiffins);


        // Reset button
        heroExploreBtn.innerText = originalText;
        heroExploreBtn.disabled = false;


        // Scroll to tiffin section
        if (tiffinsSection) {

          tiffinsSection.scrollIntoView({
            behavior: "smooth",
            block: "start"
          });

        }


        // Open map if function exists
        if (typeof openMapModal === "function") {

          openMapModal(
            userLat,
            userLng,
            nearestTiffins
          );

        }

      } catch (error) {

        console.error(
          "Nearest tiffin calculation error:",
          error
        );

        heroExploreBtn.innerText = originalText;
        heroExploreBtn.disabled = false;

        showToast(
          "Unable to find nearby tiffin services.",
          "error"
        );
      }
    },


    function(error) {

      console.error(
        "Location Error:",
        error
      );

      heroExploreBtn.innerText = originalText;
      heroExploreBtn.disabled = false;


      if (error.code === 1) {

        showToast(
          "Please allow location access to find nearby tiffins.",
          "error"
        );

      } else if (error.code === 2) {

        showToast(
          "Unable to detect your location.",
          "error"
        );

      } else if (error.code === 3) {

        showToast(
          "Location request timed out. Please try again.",
          "error"
        );

      } else {

        showToast(
          "Unable to get your location.",
          "error"
        );
      }

    },


    {
      enableHighAccuracy: true,
      timeout: 15000,
      maximumAge: 0
    }

  );
}

 


let nearbyMap = null;


let nearbyMarkersLayer = null;


 


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


  document.getElementById('map-modal').classList.remove('active');


}


 


// ==========================================================================


// AUTH MODAL TOGGLES


// ==========================================================================


if (btnOpenLogin) btnOpenLogin.addEventListener('click', () => openModal('login'));


if (btnCloseModal) btnCloseModal.addEventListener('click', closeModal);


 


const btnNavSubscribe = document.getElementById('btn-open-register');


if (btnNavSubscribe) btnNavSubscribe.addEventListener('click', handleNavSubscribeClick);


 


function handleNavSubscribeClick() {


  const source = (currentUser && globalTiffins.length) ? globalTiffins : allTiffinsList;


  if (!source || source.length === 0) {


    showToast("Tiffins are still loading, please try again in a moment.", "info");


    return;


  }


  openSubscriptionModal(source[0].TiffinID);


}


 


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


 


if (tabLogin) tabLogin.addEventListener('click', () => switchTab('login'));


if (tabRegister) tabRegister.addEventListener('click', () => switchTab('register'));


 
function switchTab(type) {

  // Hide everything first
  if (loginForm) {
    loginForm.classList.remove('active');
  }

  if (registerForm) {
    registerForm.classList.remove('active');
  }

  if (forgotPasswordForm) {
    forgotPasswordForm.classList.remove('active');
  }

  if (resetPasswordForm) {
    resetPasswordForm.classList.remove('active');
  }

  // Reset tabs
  if (tabLogin) {
    tabLogin.classList.remove('active');
  }

  if (tabRegister) {
    tabRegister.classList.remove('active');
  }


  // LOGIN
  if (type === 'login') {

    if (tabLogin) {
      tabLogin.classList.add('active');
    }

    if (loginForm) {
      loginForm.classList.add('active');
    }

  }


  // REGISTER
  else if (type === 'register') {

    if (tabRegister) {
      tabRegister.classList.add('active');
    }

    if (registerForm) {
      registerForm.classList.add('active');
    }

  }


  // FORGOT PASSWORD
  else if (type === 'forgot') {

    if (forgotPasswordForm) {
      forgotPasswordForm.classList.add('active');
    }

  }


  // RESET PASSWORD
  else if (type === 'reset') {

    if (resetPasswordForm) {
      resetPasswordForm.classList.add('active');
    }

  }

}
// ================================================================
// FORGOT PASSWORD
// ================================================================

if (forgotPasswordBtn) {

  forgotPasswordBtn.addEventListener('click', () => {

    const emailInput =
      document.getElementById('login-email');

    const forgotEmail =
      document.getElementById('forgot-email');

    if (emailInput && forgotEmail) {
      forgotEmail.value =
        emailInput.value.trim();
    }

    switchTab('forgot');

  });

}


if (backToLoginBtn) {

  backToLoginBtn.addEventListener('click', () => {

    switchTab('login');

  });

}

 

if (sendResetBtn) {

  sendResetBtn.addEventListener('click', async () => {

    const emailInput =
      document.getElementById('forgot-email');

    const email =
      emailInput.value.trim();

    if (!email) {

      showToast(
        'Please enter your email address.',
        'error'
      );

      return;
    }

    toggleBtnLoading(
      sendResetBtn,
      true
    );

    try {

      const res = await fetch(API_URL, {

        method: 'POST',

        body: JSON.stringify({

          action: 'forgotPassword',

          email: email

        })

      });

      const result =
        await res.json();

      toggleBtnLoading(
        sendResetBtn,
        false
      );

      if (result.success) {

        showToast(
          result.message ||
          'Password reset link sent to your email.',
          'success'
        );

        emailInput.value = '';

      } else {

        showToast(
          result.message ||
          'Unable to send reset link.',
          'error'
        );

      }

    } catch (err) {

      console.error(
        'Forgot password error:',
        err
      );

      toggleBtnLoading(
        sendResetBtn,
        false
      );

      showToast(
        'Server connection error!',
        'error'
      );

    }

  });

}
// ================================================================
// RESET PASSWORD
// ================================================================

let resetToken = "";


if (resetPasswordForm) {

  resetPasswordForm.addEventListener(
    'submit',
    async (e) => {

      e.preventDefault();

      const newPassword =
        document
          .getElementById('reset-password')
          .value;

      const confirmPassword =
        document
          .getElementById('reset-password-confirm')
          .value;

      if (!resetToken) {

        showToast(
          'Invalid or missing reset link.',
          'error'
        );

        return;
      }

      if (newPassword.length < 6) {

        showToast(
          'Password must be at least 6 characters.',
          'error'
        );

        return;
      }

      if (newPassword !== confirmPassword) {

        showToast(
          'Passwords do not match.',
          'error'
        );

        return;
      }

      toggleBtnLoading(
        resetPasswordBtn,
        true
      );

      try {

        /*
         * IMPORTANT:
         * Existing TiffinHub passwords use SHA-256.
         */

        const res = await fetch(API_URL, {
  method: 'POST',
  body: JSON.stringify({
    action: 'resetUserPassword',
    token: resetToken,
    password: newPassword
  })
});

        const result =
          await res.json();

        toggleBtnLoading(
          resetPasswordBtn,
          false
        );

        if (result.success) {

          showToast(
            'Password reset successfully!',
            'success'
          );

          document
            .getElementById(
              'reset-password-form'
            )
            .reset();

          resetToken = "";

          setTimeout(() => {

            switchTab('login');

          }, 1200);

        } else {

          showToast(
            result.message ||
            'Unable to reset password.',
            'error'
          );

        }

      } catch (err) {

        console.error(
          'Reset password error:',
          err
        );

        toggleBtnLoading(
          resetPasswordBtn,
          false
        );

        showToast(
          'Server connection error!',
          'error'
        );

      }

    }
  );

}
// ==========================================================================


// REGISTER TYPE STATE (user / ngo / provider)


// ==========================================================================


let currentRegisterType = 'user';


let ngoStep = 0;


let ngoMemberCount = 0;


let ngoBasicData = {};


let ngoMembersData = [];


 


function resetNgoFlow() {


  ngoStep = 0;


  ngoMemberCount = 0;


  ngoBasicData = {};


  ngoMembersData = [];


 


  const basicFields = document.getElementById('ngo-basic-fields');


  const memberStepContainer = document.getElementById('ngo-member-step-container');


  const registerBtn = document.getElementById('register-btn');


 


  if (basicFields) basicFields.classList.remove('hidden');


  if (memberStepContainer) {


    memberStepContainer.classList.add('hidden');


    memberStepContainer.innerHTML = '';


  }


  if (registerBtn) registerBtn.querySelector('.btn-text').innerText = 'Send Request';


}


 


function renderNgoMemberStep(stepNumber) {


  const container = document.getElementById('ngo-member-step-container');


  if (!container) return;


  container.classList.remove('hidden');


 


  container.innerHTML = `


    <h4 style="margin-bottom:0.6rem;">Member ${stepNumber} of ${ngoMemberCount} — Details</h4>


    <div class="input-group">


      <label><i class="fa-solid fa-user"></i> Member ${stepNumber} Name</label>


      <input type="text" id="ngo-member-name-${stepNumber}" placeholder="Full Name">


    </div>


    <div class="input-group">


      <label><i class="fa-solid fa-envelope"></i> Member ${stepNumber} Email</label>


      <input type="email" id="ngo-member-email-${stepNumber}" placeholder="member@mail.com">


    </div>


    <div class="input-group">


      <label><i class="fa-solid fa-phone"></i> Member ${stepNumber} Phone</label>


      <input type="tel" id="ngo-member-phone-${stepNumber}" placeholder="+91 9876543210">


    </div>


    <div class="input-group">


      <label><i class="fa-solid fa-location-dot"></i> Member ${stepNumber} Address</label>


      <input type="text" id="ngo-member-address-${stepNumber}" placeholder="Office / Street / Area / City">


    </div>




    <div class="input-group">


      <label><i class="fa-solid fa-id-badge"></i> Role of Member</label>


      <input type="text" id="ngo-member-role-${stepNumber}" placeholder="e.g. Volunteer, Coordinator">


    </div>


  `;


}


 


function switchRegisterType(type) {


  currentRegisterType = type;


  const userBtn = document.getElementById('reg-type-user-btn');


  const ngoBtn = document.getElementById('reg-type-ngo-btn');


  const provBtn = document.getElementById('reg-type-provider-btn');


  const userFields = document.getElementById('user-register-fields');


  const ngoFields = document.getElementById('ngo-register-fields');


  const provFields = document.getElementById('provider-register-fields');


 


  [userBtn, ngoBtn, provBtn].forEach(b => b && b.classList.remove('active'));


  [userFields, ngoFields, provFields].forEach(f => f && f.classList.add('hidden'));


 


  if (type === 'user') {


    userBtn.classList.add('active');


    userFields.classList.remove('hidden');


  } else if (type === 'ngo') {


    ngoBtn.classList.add('active');


    ngoFields.classList.remove('hidden');


  } else if (type === 'provider') {


    provBtn.classList.add('active');


    provFields.classList.remove('hidden');


  }


 


  resetNgoFlow();


 


  const registerBtn = document.getElementById('register-btn');


  if (registerBtn) {


    if (type === 'ngo') {


      registerBtn.querySelector('.btn-text').innerText = 'Next';


    } else if (type === 'provider') {


      registerBtn.querySelector('.btn-text').innerText = 'Create Provider Account';


    } else {


      registerBtn.querySelector('.btn-text').innerText = 'Send Request';


    }


  }


}


 


// ==========================================================================


// HELPERS


// ==========================================================================


function showToast(message, type = 'info') {


  const container = document.getElementById('toast-container');


  if (!container) return;


  const toast = document.createElement('div');


  toast.className = `toast ${type}`;


  toast.innerText = message;


  container.appendChild(toast);


  setTimeout(() => { toast.remove(); }, 3500);


}


 


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


// REGISTER FORM SUBMISSION


// ==========================================================================


if (registerForm) {


  registerForm.addEventListener('submit', async (e) => {


    e.preventDefault();


 


    const submitBtn = document.getElementById('register-btn');


 


    // ============ PROVIDER REGISTRATION (DIRECT SIGNUP + AUTO LOGIN) ============


    if (currentRegisterType === 'provider') {


      toggleBtnLoading(submitBtn, true);


      try {


        const businessName = document.getElementById('reg-prov-name').value.trim();


        const ownerName    = document.getElementById('reg-prov-owner').value.trim();


        const email        = document.getElementById('reg-prov-email').value.trim();


        const phone        = document.getElementById('reg-prov-phone').value.trim();


        const address      = document.getElementById('reg-prov-address').value.trim();



        const password     = document.getElementById('reg-prov-password').value;


 


        if (!businessName || !ownerName || !email || !phone || !address || !password) {


          showToast("Please fill in all required fields.", "error");


          toggleBtnLoading(submitBtn, false);


          return;


        }




        if (password.length < 6) {


          showToast("Password must be at least 6 characters.", "error");


          toggleBtnLoading(submitBtn, false);


          return;


        }


 


        const res = await fetch(API_URL, {


          method: 'POST',


          body: JSON.stringify({


            action: 'registerProviderDirect',


businessName, ownerName, email, phone, address, password

          })


        });


        const result = await res.json();


        toggleBtnLoading(submitBtn, false);


 


        if (result.success) {


          showToast(`✅ Provider account created! Your ID: ${result.providerId}`, 'success');


 


          // AUTO-LOGIN: store session so provider.html skips login


          sessionStorage.setItem('tiffin_provider_session', JSON.stringify({


            providerId: result.providerId,


            businessName: businessName,


            email: email,


            status: 'Approved'


          }));


 


          // Clear all provider fields


[
  'reg-prov-name',
  'reg-prov-owner',
  'reg-prov-email',
  'reg-prov-phone',
  'reg-prov-address',
  'reg-prov-password'
]

            .forEach(id => { const el = document.getElementById(id); if (el) el.value = ''; });


 


          setTimeout(() => {


            showToast(`🎉 Welcome ${businessName}! Taking you to your dashboard...`, 'success');


            setTimeout(() => { window.location.href = 'provider.html'; }, 900);


          }, 400);


        } else {


          showToast(result.message || 'Provider registration failed.', 'error');


        }


      } catch (err) {


        console.error('Provider registration error:', err);


        toggleBtnLoading(submitBtn, false);


        showToast('Failed to connect to server!', 'error');


      }


      return;


    }


 


    // ============ USER REGISTRATION ============


    if (currentRegisterType === 'user') {


      toggleBtnLoading(submitBtn, true);


 


      try {


        const name = document.getElementById('reg-name').value.trim();


        const email = document.getElementById('reg-email').value.trim();


        const phone = document.getElementById('reg-phone').value.trim();


        const address = document.getElementById('reg-address').value.trim();


        const password = document.getElementById('reg-password').value;


 


        if (!name || !email || !address || !password) {


          showToast("Please fill in all required fields.", "error");


          toggleBtnLoading(submitBtn, false);


          return;


        }


 


       


 


        const res = await fetch(API_URL, {
  method: 'POST',
  body: JSON.stringify({
    action: 'register',
    name,
    email,
    phone,
    address,
    password: password
  })
});


 


        const result = await res.json();


        toggleBtnLoading(submitBtn, false);


 


        if (result.success) {


          showToast('Account created successfully! Please login.', 'success');


          clearUserRegisterFields();


          switchTab('login');


        } else {


          showToast(result.message || 'Registration failed.', 'error');


        }


      } catch (err) {


        console.error('User registration error:', err);


        toggleBtnLoading(submitBtn, false);


        showToast('Failed to connect to server!', 'error');


      }


 


      return;


    }


 


    // ============ NGO REGISTRATION - MULTI STEP ============


    toggleBtnLoading(submitBtn, true);


 


    try {


      if (ngoStep === 0) {


        const ngoName = document.getElementById('reg-ngo-name').value.trim();


        const email = document.getElementById('reg-ngo-email').value.trim();


        const phone = document.getElementById('reg-ngo-phone').value.trim();


        const address = document.getElementById('reg-ngo-address').value.trim();


        const ownerName = document.getElementById('reg-ngo-owner-name').value.trim();


        const password = document.getElementById('reg-ngo-password').value;


        const memberCount = parseInt(document.getElementById('reg-ngo-members').value, 10);


        const loginStartHour = parseInt(document.getElementById('reg-ngo-login-start').value, 10);


        const loginEndHour = parseInt(document.getElementById('reg-ngo-login-end').value, 10);


 


        if (!ngoName || !email || !phone || !address || !ownerName || !password || !memberCount || memberCount < 1) {


          showToast('Please fill all NGO details correctly.', 'error');


          toggleBtnLoading(submitBtn, false);


          return;


        }


 



 


        if (password.length < 6) {


          showToast('Password must be at least 6 characters.', 'error');


          toggleBtnLoading(submitBtn, false);


          return;


        }


 


        if (isNaN(loginStartHour) || isNaN(loginEndHour) ||


            loginStartHour < 0 || loginStartHour > 23 ||


            loginEndHour < 0 || loginEndHour > 23) {


          showToast('Please enter valid login hours (0–23).', 'error');


          toggleBtnLoading(submitBtn, false);


          return;


        }


 


        if (loginStartHour === loginEndHour) {


          showToast('Login start and end hours cannot be the same.', 'error');


          toggleBtnLoading(submitBtn, false);


          return;


        }


 


        ngoBasicData = {
  ngoName, email, phone, address, ownerName, password,
  loginStartHour, loginEndHour
};


        ngoMemberCount = memberCount;


        ngoMembersData = [];


 


        document.getElementById('ngo-basic-fields').classList.add('hidden');


        ngoStep = 1;


        renderNgoMemberStep(ngoStep);


        submitBtn.querySelector('.btn-text').innerText = 'Next';


 


        toggleBtnLoading(submitBtn, false);


        return;


      }


 


      if (ngoStep >= 1 && ngoStep <= ngoMemberCount) {


        const nameEl = document.getElementById(`ngo-member-name-${ngoStep}`);


        const emailEl = document.getElementById(`ngo-member-email-${ngoStep}`);


        const phoneEl = document.getElementById(`ngo-member-phone-${ngoStep}`);


        const addressEl = document.getElementById(`ngo-member-address-${ngoStep}`);


        const roleEl = document.getElementById(`ngo-member-role-${ngoStep}`);


 


        const memberName = nameEl ? nameEl.value.trim() : '';


        const memberEmail = emailEl ? emailEl.value.trim() : '';


        const memberPhone = phoneEl ? phoneEl.value.trim() : '';


        const memberAddress = addressEl ? addressEl.value.trim() : '';


        const memberRole = roleEl ? roleEl.value.trim() : '';


 


        if (!memberName || !memberEmail || !memberPhone || !memberAddress || !memberRole) {
  showToast(`Please fill all details for Member ${ngoStep}.`, 'error');
  toggleBtnLoading(submitBtn, false);
  return;
}


 


 


        ngoMembersData.push({
  name: memberName,
  email: memberEmail,
  phone: memberPhone,
  address: memberAddress,
  role: memberRole
});


 


        if (ngoStep < ngoMemberCount) {


          ngoStep++;


          renderNgoMemberStep(ngoStep);


          submitBtn.querySelector('.btn-text').innerText = ngoStep === ngoMemberCount ? 'Send Request' : 'Next';


          toggleBtnLoading(submitBtn, false);


          return;


        }


 


        // Final submit for NGO — sends basic data + members + login hours


       const res = await fetch(API_URL, {
  method: 'POST',
  body: JSON.stringify({
    action: 'registerNGO',
    ...ngoBasicData,
    memberCount: ngoMemberCount,
    members: ngoMembersData
  })
});

 


        const result = await res.json();


        toggleBtnLoading(submitBtn, false);


 


        if (result.success) {


          showToast('NGO Registered! Login via NGO Portal.', 'success');


          registerForm.reset();


          switchRegisterType('user');


          resetNgoFlow();


          switchTab('login');


        } else {


          showToast(result.message || 'NGO registration failed.', 'error');


        }


 


        return;


      }


 


      toggleBtnLoading(submitBtn, false);


      showToast('Invalid NGO registration step.', 'error');


    } catch (err) {


      console.error('NGO registration error:', err);


      toggleBtnLoading(submitBtn, false);


      showToast('Failed to connect to server!', 'error');


    }


  });


}


 


function clearUserRegisterFields() {


  document.getElementById('reg-name').value = '';


  document.getElementById('reg-email').value = '';


  document.getElementById('reg-phone').value = '';


  document.getElementById('reg-address').value = '';


  document.getElementById('reg-password').value = '';


}


 


// ==========================================================================

// LOGIN

// ==========================================================================


let currentLoginType = 'user';


function switchLoginType(type) {

  currentLoginType = type;


  const userBtn = document.getElementById('login-type-user-btn');

  const ngoBtn = document.getElementById('login-type-ngo-btn');

  const providerBtn = document.getElementById('login-type-provider-btn');

  const adminBtn = document.getElementById('login-type-admin-btn');


  [userBtn, ngoBtn, providerBtn, adminBtn].forEach(btn => {

    if (btn) btn.classList.remove('active');

  });


  if (type === 'user' && userBtn) {

    userBtn.classList.add('active');

  }


  if (type === 'ngo' && ngoBtn) {

    ngoBtn.classList.add('active');

  }


  if (type === 'provider' && providerBtn) {

    providerBtn.classList.add('active');

  }


  if (type === 'admin' && adminBtn) {

    adminBtn.classList.add('active');

  }

}



if (loginForm) {

  loginForm.addEventListener('submit', async (e) => {

    e.preventDefault();


    const email = document.getElementById('login-email').value.trim();

    const password = document.getElementById('login-password').value;


    const submitBtn = document.getElementById('login-btn');


    if (!email || !password) {

      showToast('Please enter email and password.', 'error');

      return;

    }


    toggleBtnLoading(submitBtn, true);


    // ----------------------------------------------------

    // ADMIN LOGIN

    // ----------------------------------------------------

    if (currentLoginType === 'admin') {

      const ADMIN_EMAIL = 'admin@tiffinhub.com';

      const ADMIN_PASSWORD = 'admin@123';


      if (email.toLowerCase() === ADMIN_EMAIL && password === ADMIN_PASSWORD) {

        sessionStorage.setItem('tiffin_admin_session', 'true');

        toggleBtnLoading(submitBtn, false);

        showToast('Welcome, Admin!', 'success');

        setTimeout(() => {

          window.location.href = 'admin.html';

        }, 500);

      } else {

        toggleBtnLoading(submitBtn, false);

        showToast('Invalid admin email or password.', 'error');

      }

      return;

    }


    try {

      // ----------------------------------------------------

      // NGO LOGIN

      // ----------------------------------------------------

      if (currentLoginType === 'ngo') {

        const res = await fetch(API_URL, {

          method: 'POST',

          body: JSON.stringify({

            action: 'ngoLogin',

            email: email,

            password: password

          })

        });


        const result = await res.json();


        if (result.success) {

          sessionStorage.setItem('tiffin_ngo_session', JSON.stringify(result.ngo));

          toggleBtnLoading(submitBtn, false);

          showToast('NGO login successful!', 'success');

          setTimeout(() => {

            window.location.href = 'ngo.html';

          }, 500);

        } else {

          toggleBtnLoading(submitBtn, false);

          showToast(result.message || 'Invalid NGO email or password.', 'error');

        }

        return;

      }


      // ----------------------------------------------------

      // MESS OWNER / PROVIDER LOGIN

      // ----------------------------------------------------

      if (currentLoginType === 'provider') {

        const res = await fetch(API_URL, {

          method: 'POST',

          body: JSON.stringify({

            action: 'providerLogin',

            email: email,

            password: password

          })

        });


        const result = await res.json();


        if (result.success) {

          sessionStorage.setItem('tiffin_provider_session', JSON.stringify(result.provider));

          toggleBtnLoading(submitBtn, false);

          showToast('Mess Owner login successful!', 'success');

          setTimeout(() => {

            window.location.href = 'provider.html';

          }, 500);

        } else {

          toggleBtnLoading(submitBtn, false);

          showToast(result.message || 'Invalid Mess Owner email or password.', 'error');

        }

        return;

      }


      // ----------------------------------------------------

      // NORMAL USER LOGIN

      // ----------------------------------------------------

      const res = await fetch(API_URL, {
  method: 'POST',
  body: JSON.stringify({
    action: 'login',
    email: email,
    password: password
  })
});


      const result = await res.json();


      toggleBtnLoading(submitBtn, false);


      if (result.success) {


        showToast(`Welcome back, ${result.user.name}!`, 'success');


        currentUser = result.user;


        localStorage.setItem(

          'tiffin_user_session',

          JSON.stringify(currentUser)

        );


        updateNavUI();


        closeModal();


        if (pendingSubscribeIntent) {

          pendingSubscribeIntent = false;


          setTimeout(() => {

            openSubscribePickerModal();

          }, 300);

        }


        if (pendingSubscriptionIntent) {

          pendingSubscriptionIntent = false;


          setTimeout(() => {

            processSubscriptionPayment();

          }, 300);

        }


        if (pendingQuickOrderTiffinId) {

          const tiffinIdToOrder = pendingQuickOrderTiffinId;


          pendingQuickOrderTiffinId = null;


          setTimeout(() => {

            openQuickOrderModal(tiffinIdToOrder);

          }, 300);

        }


      } else {

        showToast(

          result.message || 'Invalid email or password.',

          'error'

        );

      }


    } catch (err) {


      console.error('Login error:', err);


      toggleBtnLoading(submitBtn, false);


      showToast(

        'Server connection error!',

        'error'

      );

    }

  });

}


 function logoutUser() {

  localStorage.removeItem('tiffin_user_session');

  sessionStorage.removeItem('tiffin_user_session');


  currentUser = null;


  window.location.reload();

}


// ==========================================================================


// NAV UI / DASHBOARD


// ==========================================================================


function updateNavUI() {


  const authSection = document.getElementById('nav-auth-section');


  const heroSection = document.querySelector('.hero');


  const exploreSection = document.getElementById('tiffins');


  const dashSection = document.getElementById('user-dashboard');


 


  if (currentUser) {


    if (heroSection) heroSection.style.display = 'none';


    if (exploreSection) exploreSection.style.display = 'none';


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


 


async function loadUserDashboard() {


  try {


    const res = await fetch(API_URL, {


      method: 'POST',


      body: JSON.stringify({ action: 'getUserDashboard', userId: currentUser.userId })


    });


    const data = await res.json();


 


    if (data.success) {


      globalTiffins = (data.availableTiffins && data.availableTiffins.length)


        ? data.availableTiffins


        : allTiffinsList;


 


      const points = data.rewardPoints || 0;


      const pointsEl = document.getElementById('reward-points-value');


      if (pointsEl) pointsEl.innerText = points;


 


      reviewedOrderIds = data.reviewedOrderIds || [];


 


      if (data.activeSubscription) {


        document.getElementById('active-subscription-view').classList.remove('hidden');


        document.getElementById('active-provider-name').innerText = data.activeSubscription.TiffinID;


        document.getElementById('active-plan-type').innerText = `${data.activeSubscription.PlanType} Plan`;


        document.getElementById('active-end-date').innerText = data.activeSubscription.EndDate || 'Active';


        document.getElementById('no-sub-banner').classList.add('hidden');


      } else {


        document.getElementById('active-subscription-view').classList.add('hidden');


        document.getElementById('no-sub-banner').classList.remove('hidden');


      }


 


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


  container.innerHTML = orders.map(o => {


    const isDelivered = (o.OrderStatus || '').toString().trim() === 'Delivered';


    const alreadyReviewed = reviewedOrderIds.includes((o.OrderID || '').toString().trim());


    const showRateBtn = isDelivered && !alreadyReviewed && o.TiffinID;


 


    return `


      <div style="display:flex; justify-content:space-between; padding:0.8rem 0; border-bottom:1px solid #E2E8F0; flex-wrap:wrap; gap:8px;">


        <div>


          <strong>Order #${o.OrderID}</strong>


          <div style="font-size:0.8rem; color:gray;">${new Date(o.Timestamp || Date.now()).toLocaleDateString()}</div>


        </div>


        <div style="display:flex; align-items:center; gap:8px;">


          <span style="font-weight:700; color:var(--primary);">₹${o.Amount}</span>


          <span style="font-size:0.8rem; padding:2px 8px; background:#E2E8F0; border-radius:10px;">${o.OrderStatus}</span>


          ${showRateBtn ? `<button class="btn btn-primary" style="padding:4px 10px; font-size:0.78rem;" onclick="openReviewModal('${o.OrderID}', '${o.TiffinID}')"><i class="fa-solid fa-star"></i> Rate</button>` : ''}


          ${alreadyReviewed ? `<span style="font-size:0.75rem; color:var(--success); font-weight:700;"><i class="fa-solid fa-circle-check"></i> Reviewed</span>` : ''}


        </div>


      </div>


    `;


  }).join('');


}


 


// ==========================================================================


// DONATION MODULE


// ==========================================================================


function openDonationModal() {


  if (!currentUser) {


    showToast("Please Sign In to donate!", "info");


    openModal('login');


    return;


  }


  document.getElementById('donation-form').reset();


  const statusEl = document.getElementById('area-need-status');


  if (statusEl) statusEl.innerHTML = '';


  document.getElementById('donation-modal').classList.add('active');


}


 


function closeDonationModal() {


  document.getElementById('donation-modal').classList.remove('active');


}


 


function updateAreaNeedStatus() {
  const areaSelect = document.getElementById('donate-area');
  const statusEl = document.getElementById('area-need-status');
  const typeSelect = document.getElementById('donate-type');

  if (!areaSelect || !statusEl || !typeSelect) return;

  const selectedArea = areaSelect.value;
  const donationType = typeSelect.value;

  // Area select nahi hai
  if (!selectedArea) {
    statusEl.innerHTML = '';
    return;
  }

  // Donation type select nahi hai
  if (!donationType) {
    statusEl.innerHTML = '';
    return;
  }

  // Food ke liye hi AreaStatus check karo
  if (donationType.toLowerCase() === 'food') {

    const match = areaStatusList.find(a =>
      (a.Area || '').toString().trim().toLowerCase() ===
      selectedArea.trim().toLowerCase()
    );

    const isNeeded = match
      ? (match.Status || '').toString().trim().toLowerCase() === 'needed'
      : true;

    if (isNeeded) {
      statusEl.innerHTML = `
        <span class="area-badge area-badge-needed">
          <i class="fa-solid fa-circle-check"></i>
          Needed — Food is needed in this area
        </span>`;
    } else {
      statusEl.innerHTML = `
        <span class="area-badge area-badge-not-needed">
          <i class="fa-solid fa-circle-xmark"></i>
          Not Needed — Food is not needed in this area
        </span>`;
    }

    return;
  }

  // Clothes
  if (donationType.toLowerCase() === 'clothes') {
    statusEl.innerHTML = `
      <span class="area-badge area-badge-needed">
        <i class="fa-solid fa-shirt"></i>
        Clothes donation selected
      </span>`;
    return;
  }

  // Stationery
  if (donationType.toLowerCase() === 'stationery') {
    statusEl.innerHTML = `
      <span class="area-badge area-badge-needed">
        <i class="fa-solid fa-book"></i>
        Stationery donation selected
      </span>`;
    return;
  }

  statusEl.innerHTML = '';
}

 


async function submitDonation(e) {


  e.preventDefault();


  if (!currentUser) {


    showToast("Please Sign In to donate!", "info");


    return;


  }


 


  const donationType = document.getElementById('donate-type').value;


  const details = document.getElementById('donate-food-details').value.trim();


  const quantity = document.getElementById('donate-quantity').value;


  const area = document.getElementById('donate-area').value;


  const address = document.getElementById('donate-address').value.trim();


 


  if (!donationType || !details || !quantity || !area || !address) {


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


        foodDetails: `[${donationType}] ${details} (Qty: ${quantity})`,


        area,


        address,


        // Kept only for compatibility with the existing backend.


        // The user no longer enters an expiry value in the form.


        expiryHours: 0


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


    console.error('Donation error:', err);


    toggleBtnLoading(btn, false);


    showToast("Failed to connect to server!", "error");


  }


}


 


function renderUserDonations(donations) {


  const container = document.getElementById('user-donations-list');


  if (!container) return;


 


  if (!donations || donations.length === 0) {


    container.innerHTML = `<p class="text-muted">You haven't made any donations yet. Click "Donate" above to get started!</p>`;


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


// MENU MODAL


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


// EXPLORE TIFFINS


// ==========================================================================


async function fetchExploreTiffins() {
  const container = document.getElementById('explore-tiffins-container');

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'getExploreTiffins'
      })
    });

    const responseText = await res.text();

    console.log("RAW BACKEND RESPONSE:", responseText);

    let data;

    try {
      data = JSON.parse(responseText);
    } catch (jsonError) {
      console.error("INVALID JSON FROM BACKEND:", responseText);
      throw new Error("Backend returned invalid JSON.");
    }

    if (data.success && data.tiffins) {
      allTiffinsList = data.tiffins.filter(
        t => t.Available === 'Yes' || t.Available === 'yes'
      );

      areaStatusList = data.areaStatus || [];

      renderExploreTiffins(allTiffinsList);
    } else {
      container.innerHTML = `
        <p class="text-muted"
           style="grid-column:1/-1;text-align:center;">
          No mess services available right now.
        </p>
      `;
    }

  } catch (err) {
    console.error("Error fetching tiffins:", err);

    container.innerHTML = `
      <p style="grid-column:1/-1;text-align:center;color:var(--danger);">
        Failed to load tiffins. Please check your network connection.
      </p>
    `;
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


// SUBSCRIBE PICKER


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


// QUICK ORDER


// ==========================================================================


function openQuickOrderModal(tiffinId) {


  if (!currentUser) {


    pendingQuickOrderTiffinId = tiffinId;


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


  document.querySelectorAll('.payment-option').forEach(btn => {


    btn.classList.remove('active');


    btn.style.border = '1.5px solid var(--border-color)';


    btn.style.background = 'white';


  });


  element.classList.add('active');


  element.style.border = '1.5px solid var(--primary)';


  element.style.background = '#FFF3EC';


}


 


async function processQuickOrder() {
  if (!currentUser || !selectedTiffinForQuickOrder) return;

  const btn = document.getElementById('btn-confirm-quick-order');
  toggleBtnLoading(btn, true);

  const amount = Number(selectedTiffinForQuickOrder.Price);

  try {

    // ==========================================
    // 1. GET CUSTOMER LOCATION
    // ==========================================

    const position = await new Promise((resolve, reject) => {

      if (!navigator.geolocation) {
        reject(new Error("Geolocation is not supported by this browser."));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        resolve,
        reject,
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0
        }
      );

    });

    const customerLatitude =
      position.coords.latitude;

    const customerLongitude =
      position.coords.longitude;

    console.log(
      "Customer Location:",
      customerLatitude,
      customerLongitude
    );


    // ==========================================
    // 2. CREATE RAZORPAY ORDER
    // ==========================================

    const res = await fetch(API_URL, {
      method: 'POST',
      body: JSON.stringify({
        action: 'createRazorpayOrder',
        userId: currentUser.userId,
        tiffinId: selectedTiffinForQuickOrder.TiffinID,
        amount: amount
      })
    });

    const result = await res.json();

    console.log(
      "Razorpay Backend Response:",
      result
    );


    if (!result.success) {

      console.error(
        "Razorpay Error:",
        result
      );

      showToast(
        result.message || "Payment connection failed.",
        "error"
      );

      toggleBtnLoading(btn, false);
      return;
    }


    // ==========================================
    // 3. OPEN RAZORPAY CHECKOUT
    // ==========================================

    const options = {

      key: result.keyId,

      amount: result.amount,

      currency: result.currency,

      name: "TiffinHub",

      description:
        selectedTiffinForQuickOrder.ProviderName,

      order_id: result.orderId,


      prefill: {
        name: currentUser.name || "",
        email: currentUser.email || ""
      },


      theme: {
        color: "#FF6B35"
      },


      // ========================================
      // 4. PAYMENT SUCCESS
      // ========================================

      handler: async function (paymentResponse) {

        console.log(
          "Razorpay Payment Response:",
          paymentResponse
        );

        showToast(
          "Payment successful! Verifying...",
          "info"
        );


        try {

          const verifyRes = await fetch(API_URL, {

            method: "POST",

            body: JSON.stringify({

              action:
                "verifyRazorpayPayment",

              userId:
                currentUser.userId,

              tiffinId:
                selectedTiffinForQuickOrder.TiffinID,


              // Razorpay details
              razorpay_order_id:
                paymentResponse.razorpay_order_id,

              razorpay_payment_id:
                paymentResponse.razorpay_payment_id,

              razorpay_signature:
                paymentResponse.razorpay_signature,


              // CUSTOMER LOCATION
              customerLatitude:
                customerLatitude,

              customerLongitude:
                customerLongitude

            })

          });


          const result =
            await verifyRes.json();


          console.log(
            "Payment Verification Response:",
            result
          );


          toggleBtnLoading(btn, false);


          if (!result.success) {

            showToast(
              result.message ||
              "Payment verification failed.",
              "error"
            );

            return;
          }


          showToast(
            "🎉 Payment verified & order placed!",
            "success"
          );


          // Close modal
          if (
            typeof closeQuickOrderModal ===
            "function"
          ) {
            closeQuickOrderModal();
          }


          // Refresh dashboard
          if (
            typeof loadUserDashboard ===
            "function"
          ) {
            loadUserDashboard();
          }


        } catch (err) {

          console.error(
            "Payment verification error:",
            err
          );

          toggleBtnLoading(btn, false);

          showToast(
            "Payment verification failed.",
            "error"
          );

        }

      },


      // ========================================
      // 5. PAYMENT CANCEL
      // ========================================

      modal: {

        ondismiss: function () {

          toggleBtnLoading(btn, false);

          showToast(
            "Payment cancelled.",
            "error"
          );

        }

      }

    };


    // Create Razorpay
    const rzp =
      new Razorpay(options);


    // Payment failed
    rzp.on(
      'payment.failed',
      function (response) {

        console.error(
          "Payment failed:",
          response.error
        );

        toggleBtnLoading(btn, false);

        showToast(
          response.error.description ||
          "Payment failed.",
          "error"
        );

      }
    );


    // Open checkout
    rzp.open();


  } catch (err) {

    console.error(
      "Location / Payment error:",
      err
    );

    toggleBtnLoading(btn, false);


    if (
      err.code === 1
    ) {

      showToast(
        "Please allow location permission to place the order.",
        "error"
      );

    } else if (
      err.code === 2
    ) {

      showToast(
        "Unable to get your location. Please try again.",
        "error"
      );

    } else if (
      err.code === 3
    ) {

      showToast(
        "Location request timed out. Please try again.",
        "error"
      );

    } else {

      showToast(
        err.message ||
        "Unable to get your location.",
        "error"
      );

    }

  }
}


 


// ==========================================================================


// SUBSCRIPTION / CHECKOUT


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


    pendingSubscriptionIntent = true;


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


 


// ==========================================================================


// REVIEW MODULE


// ==========================================================================


function openReviewModal(orderId, tiffinId) {


  selectedOrderForReview = { orderId, tiffinId };


  selectedRating = 0;


 


  document.querySelectorAll('#star-rating i').forEach(el => {


    el.style.color = '#D1D5DB';


  });


  document.getElementById('review-comment').value = '';


  document.getElementById('review-modal-subtitle').innerText = `Order #${orderId}`;


  document.getElementById('review-modal').classList.add('active');


 


  document.querySelectorAll('#star-rating i').forEach(starEl => {


    starEl.onclick = () => {


      selectedRating = Number(starEl.dataset.rating);


      document.querySelectorAll('#star-rating i').forEach(s => {


        const r = Number(s.dataset.rating);


        s.style.color = r <= selectedRating ? '#F59E0B' : '#D1D5DB';


      });


    };


  });


}


 


function closeReviewModal() {


  document.getElementById('review-modal').classList.remove('active');


  selectedOrderForReview = null;


  selectedRating = 0;


}


 


async function submitReview() {


  if (!selectedOrderForReview || !currentUser) return;


  if (selectedRating < 1) {


    showToast("Please select a star rating.", "error");


    return;


  }


 


  const btn = document.getElementById('review-submit-btn');


  toggleBtnLoading(btn, true);


 


  try {


    const res = await fetch(API_URL, {


      method: 'POST',


      body: JSON.stringify({


        action: 'submitReview',


        orderId: selectedOrderForReview.orderId,


        userId: currentUser.userId,


        tiffinId: selectedOrderForReview.tiffinId,


        rating: selectedRating,


        comment: document.getElementById('review-comment').value.trim()


      })


    });


    const result = await res.json();


    toggleBtnLoading(btn, false);


 


    if (result.success) {


      showToast("🎉 Thanks for your review!", "success");


      closeReviewModal();


      loadUserDashboard();


    } else {


      showToast(result.message || "Could not submit review.", "error");


    }


  } catch (err) {


    toggleBtnLoading(btn, false);


    showToast("Server connection error!", "error");


  }


}
document.addEventListener('DOMContentLoaded', function () {
  fetchExploreTiffins();
});