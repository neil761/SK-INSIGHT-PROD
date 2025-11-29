document.addEventListener('DOMContentLoaded', function () {
  // Initialize navbar hamburger/menu from the centralized `navbar.js` handler
  // If `navbar.js` exposes `initNavbarHamburger`, call it. Otherwise fall back
  // to a small local handler so the menu still works.
  if (typeof window !== 'undefined' && typeof window.initNavbarHamburger === 'function') {
    try { 
      window.initNavbarHamburger(); 
    } catch (e) {
       /* ignore */ 
      }
  } 

  // Runtime API base (use `window.API_BASE` in production pages to override)
  const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
    ? window.API_BASE
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : 'https://sk-insight.online';

  // Check user verification status
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  let isVerified = false;

  if (token) {
    fetch(`${API_BASE}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => response.json())
      .then(user => {
        isVerified = user.isVerified || false;

        if (!isVerified) {
          // Show verification strip
          const verificationStrip = document.getElementById('verification-strip');
          if (verificationStrip) {
            verificationStrip.style.display = 'flex';
          }
          document.body.classList.add('has-verification-strip');

          // Disable navigation buttons for forms and announcements
          const navSelectors = [
            '#kkProfileNavBtnDesktop',
            '#kkProfileNavBtnMobile',
            '#lgbtqProfileNavBtnDesktop',
            '#lgbtqProfileNavBtnMobile',
            '#educAssistanceNavBtnDesktop',
            '#educAssistanceNavBtnMobile',
            '.announcement-btn'
          ];
          navSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(btn => {
              btn.classList.add('disabled');
              btn.setAttribute('tabindex', '-1');
              btn.setAttribute('aria-disabled', 'true');
              btn.addEventListener('click', function (e) {
                e.preventDefault();
                Swal.fire({
                  icon: 'warning',
                  title: 'Account Verification Required',
                  text: 'Please verify your account to access this feature.',
                  confirmButtonText: 'OK'
                });
              });
            });
          });
        }
      })
      .catch(() => {
        console.error('Failed to fetch user verification status.');
      });
  } else {
    // If no token, show login strip
    const loginStrip = document.getElementById('login-strip');
    if (loginStrip) {
      loginStrip.style.display = 'flex';
    }
    document.body.classList.add('has-login-strip');

    // Disable all navbar buttons for non-logged-in users
    const navSelectors = [
      '.navbar-center a',
      '.navbar-right a',
      '.navbar-mobile-menu a',
      '.announcement-btn',
      '#userProfileBtn',
      '.prof',
      '.nav-btn'
    ];
    navSelectors.forEach(selector => {
      document.querySelectorAll(selector).forEach(btn => {
        btn.classList.add('disabled');
        btn.setAttribute('tabindex', '-1');
        btn.setAttribute('aria-disabled', 'true');
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          Swal.fire({
            icon: 'warning',
            title: 'You need to log in first',
            text: 'Please log in to access this feature.',
            confirmButtonText: 'OK'
          });
        });
      });
    });
  }


  // KK Profile
  // Ensure fallback handlers exist if navbar.js hasn't registered them yet
  if (typeof window.handleKKProfileNavClick !== 'function') {
    window.handleKKProfileNavClick = function (e) {
      try { if (e && typeof e.preventDefault === 'function') e.preventDefault(); } catch (err) {}
      // Default behavior: navigate to KK personal form
      window.location.href = './kkform-personal.html';
    };
  }

  // LGBTQ+ Profile
  if (typeof window.handleLGBTQProfileNavClick !== 'function') {
    window.handleLGBTQProfileNavClick = function (e) {
      try { if (e && typeof e.preventDefault === 'function') e.preventDefault(); } catch (err) {}
      window.location.href = './lgbtqform.html';
    };
  }
  // `navbar.js` will bind the nav buttons and prefer `window.handle...` if present.

  // Educational Assistance - attach via helper if available
  function attachEducHandler(btn) {
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      if (window.checkAndPromptEducReapply) {
        try {
          window.checkAndPromptEducReapply({ event: e, redirectUrl: 'Educational-assistance-user.html' });
        } catch (err) {
          if (typeof window.handleEducAssistanceNavClick === 'function') {
            window.handleEducAssistanceNavClick(e);
          } else {
            try { if (e && typeof e.preventDefault === 'function') e.preventDefault(); } catch (err2) {}
            window.location.href = './Educational-assistance-user.html';
          }
        }
      } else {
        if (typeof window.handleEducAssistanceNavClick === 'function') {
          window.handleEducAssistanceNavClick(e);
        } else {
          try { if (e && typeof e.preventDefault === 'function') e.preventDefault(); } catch (err2) {}
          window.location.href = './Educational-assistance-user.html';
        }
      }
    });
  }

  attachEducHandler(document.getElementById('educAssistanceNavBtnDesktop'));
  attachEducHandler(document.getElementById('educAssistanceNavBtnMobile'));

  // Embed educRejected helper so pages without separate script still have access
  (function () {
    async function getJsonSafe(res) { try { return await res.json(); } catch (e) { return null; } }

    async function checkAndPromptEducReapply(opts = {}) {
      const {
        event,
        redirectUrl = 'Educational-assistance-user.html',
        draftKeys = ['educDraft','educationalDraft','educAssistanceDraft'],
        formName = 'Educational Assistance',
        apiBase = API_BASE
      } = opts || {};

      if (event && typeof event.preventDefault === 'function') event.preventDefault();

      const token = opts.token || sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) {
        return { redirected: false, isRejected: false, hasProfile: false, isFormOpen: false };
      }

      try {
        const cycleUrl = `${apiBase}/api/formcycle/status?formName=${encodeURIComponent(formName)}`;
        const profileUrl = `${apiBase}/api/educational-assistance/me`;
        const [cycleRes, profileRes] = await Promise.all([
          fetch(cycleUrl, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(profileUrl, { headers: { Authorization: `Bearer ${token}` } })
        ]);

        const cycleData = await getJsonSafe(cycleRes);
        const profileData = await getJsonSafe(profileRes) || {};
        const latestCycle = Array.isArray(cycleData) ? cycleData[cycleData.length - 1] : cycleData;
        const isFormOpen = latestCycle?.isOpen ?? false;
        const hasProfile = Boolean(profileData && (profileData._id || profileData.id));

        const statusVal = (profileData && (profileData.status || profileData.decision || profileData.adminDecision || profileData.result)) || '';
        const isRejected = Boolean(
          (profileData && (profileData.rejected === true || profileData.isRejected === true)) ||
          (typeof statusVal === 'string' && /reject|denied|denied_by_admin|rejected/i.test(statusVal))
        );
        const isApproved = Boolean(
          (profileData && (profileData.status === 'approved' || profileData.approved === true)) ||
          (typeof statusVal === 'string' && /approve|approved/i.test(statusVal))
        );

        if (isFormOpen && (!hasProfile || isRejected)) {
          if (isRejected) {
            await Swal.fire({ icon: 'warning', title: 'Previous Application Rejected', text: 'Your previous application was rejected. You will be redirected to the form to submit a new application.' });
            try { draftKeys.forEach(k => sessionStorage.removeItem(k)); } catch (e) {}
            window.location.href = redirectUrl;
            return { redirected: true, isRejected, hasProfile, isFormOpen };
          } else {
            const text = `You don't have a profile yet. Please fill out the form to create one.`;
            const result = await Swal.fire({ icon: 'info', title: 'No profile found', text, showCancelButton: true, confirmButtonText: 'Go to form', cancelButtonText: 'No' });
            if (result && result.isConfirmed) {
              try { draftKeys.forEach(k => sessionStorage.removeItem(k)); } catch (e) {}
              window.location.href = redirectUrl;
              return { redirected: true, isRejected, hasProfile, isFormOpen };
            }
          }
        }

        if (!isFormOpen && hasProfile && isApproved) {
          const res2 = await Swal.fire({ icon: 'info', title: `The ${formName} is currently closed`, text: `Your application has been approved. Do you want to view your response?`, showCancelButton: true, confirmButtonText: 'Yes, view my response', cancelButtonText: 'No' });
          if (res2 && res2.isConfirmed) {
            window.location.href = `./confirmation/html/educConfirmation.html`;
            return { redirected: true, isRejected, hasProfile, isFormOpen };
          }
        }

        return { redirected: false, isRejected, hasProfile, isFormOpen };
      } catch (err) {
        console.error('checkAndPromptEducReapply error', err);
        return { redirected: false, isRejected: false, hasProfile: false, isFormOpen: false };
      }
    }

    window.checkAndPromptEducReapply = checkAndPromptEducReapply;
  })();
});
