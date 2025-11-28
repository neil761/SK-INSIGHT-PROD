const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
  ? window.API_BASE
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://sk-insight.online';

document.addEventListener('DOMContentLoaded', async function() {
  // Fetch and display user data
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/api/kkprofiling/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();

    document.getElementById('lastname').value = data.lastname || '';
    document.getElementById('firstname').value = data.firstname || '';
    document.getElementById('middlename').value = data.middlename || '';
    document.getElementById('suffix').value = data.suffix || '';
    document.getElementById('gender').value = data.gender || '';
    const birthdayInput = document.getElementById('birthday');
      if (data.birthday) {
        const dateOnly = new Date(data.birthday).toISOString().split('T')[0];
        birthdayInput.value = dateOnly;
      } else {
        birthdayInput.value = '';
      }

    // Calculate age from birthday
    function calculateAge(birthday) {
      if (!birthday) return '';
      const birthDate = new Date(birthday);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const m = today.getMonth() - birthDate.getMonth();
      if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }
      return age;
    }
    document.getElementById('age').value = calculateAge(data.birthday);
  } catch (err) {
    console.error('Failed to fetch KKProfile data:', err);
  }

  // Hamburger menu code
  const hamburger = document.getElementById('navbarHamburger');
  const mobileMenu = document.getElementById('navbarMobileMenu');
  // Navbar behavior is centralized in `navbar.js`.
  // Local hamburger/menu listeners removed to avoid duplicate bindings.

  // Navigation bindings are handled centrally in `navbar.js`. Handler
  // functions remain available for the central binder to attach.
});

// KK Profile Navigation
 
  function attachEducHandler(btn) {
    if (!btn) return;
    btn.addEventListener('click', function (e) {
      if (window.checkAndPromptEducReapply) {
        try { window.checkAndPromptEducReapply({ event: e, redirectUrl: '../../Educational-assistance-user.html' }); }
        catch (err) { handleEducAssistanceNavClick(e); }
      } else {
        handleEducAssistanceNavClick(e);
      }
    });
  }

  attachEducHandler(document.getElementById('educAssistanceNavBtnDesktop'));
  attachEducHandler(document.getElementById('educAssistanceNavBtnMobile'));

  // Embed educRejected helper so this page can prompt to reapply if needed
  (function () {
    async function getJsonSafe(res) { try { return await res.json(); } catch (e) { return null; } }

    async function checkAndPromptEducReapply(opts = {}) {
      const {
        event,
        redirectUrl = '../../Educational-assistance-user.html',
        draftKeys = ['educDraft','educationalDraft','educAssistanceDraft'],
        formName = 'Educational Assistance',
          apiBase = API_BASE
      } = opts || {};

      if (event && typeof event.preventDefault === 'function') event.preventDefault();

      const token = opts.token || sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) return { redirected: false, isRejected: false, hasProfile: false, isFormOpen: false };

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
          if (res2 && res2.isConfirmed) { window.location.href = `educConfirmation.html`; return { redirected: true, isRejected, hasProfile, isFormOpen }; }
        }

        return { redirected: false, isRejected, hasProfile, isFormOpen };
      } catch (err) {
        console.error('checkAndPromptEducReapply error', err);
        return { redirected: false, isRejected: false, hasProfile: false, isFormOpen: false };
      }
    }

    window.checkAndPromptEducReapply = checkAndPromptEducReapply;
  })();

  // Centralize navbar wiring: remove page-local nav listeners (if any) and let navbar.js bind handlers.
  document.addEventListener('DOMContentLoaded', function () {
    try {
      const ids = ['navbarHamburger','navbarMobileMenu','kkProfileNavBtnDesktop','kkProfileNavBtnMobile','lgbtqProfileNavBtnDesktop','lgbtqProfileNavBtnMobile','educAssistanceNavBtnDesktop','educAssistanceNavBtnMobile'];
      ids.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.parentNode) {
          const clone = el.cloneNode(true);
          el.parentNode.replaceChild(clone, el);
        }
      });

      if (window && typeof window.bindNavButton === 'function') {
        try {
          window.bindNavButton('kkProfileNavBtnDesktop','kkProfileNavBtnMobile','handleKKProfileNavClick');
          window.bindNavButton('lgbtqProfileNavBtnDesktop','lgbtqProfileNavBtnMobile','handleLGBTQProfileNavClick');
          window.bindNavButton('educAssistanceNavBtnDesktop','educAssistanceNavBtnMobile','handleEducAssistanceNavClick');
        } catch (e) { console.warn('navbar binding failed', e); }
      }
    } catch (e) {
      console.warn('Failed to centralize navbar wiring', e);
    }
  });