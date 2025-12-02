// Runtime API base (use `window.API_BASE` in production pages to override)
const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
  ? window.API_BASE
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://sk-insight.online';

// ============================================
// AGREEMENT MODAL FUNCTIONALITY
// ============================================
function initAgreementModal() {
  const modal = document.getElementById('agreementModal');
  const agreeCheckbox = document.getElementById('agreeCheckbox');
  const acceptBtn = document.getElementById('acceptBtn');
  const declineBtn = document.getElementById('declineBtn');
  const AGREEMENT_KEY = 'sk-insight-agreement-accepted';

  if (!modal) return; // Modal not on this page

  // Hide by default until we verify login + server state
  modal.classList.add('hidden');

  // Only show modal for authenticated users who haven't accepted
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) {
    // Not logged in — do not show modal (login flow will handle it)
    return;
  }

  // Fetch current user to check agreementAccepted flag
  fetch(`${API_BASE}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(res => res.json())
    .then(user => {
      // If server indicates user already accepted, also persist locally and keep modal hidden
      if (user && user.agreementAccepted) {
        localStorage.setItem(AGREEMENT_KEY, 'true');
        modal.classList.add('hidden');
        return;
      }

      // Not accepted yet -> show modal
      localStorage.removeItem(AGREEMENT_KEY);
      modal.classList.remove('hidden');

      // Wire up controls (only when modal shown)
      if (agreeCheckbox) {
        agreeCheckbox.checked = false;
        acceptBtn.disabled = true;
        agreeCheckbox.addEventListener('change', function () {
          acceptBtn.disabled = !this.checked;
        });
      }

      if (acceptBtn) {
        acceptBtn.addEventListener('click', async function () {
          acceptBtn.disabled = true;
          const token = sessionStorage.getItem('token') || localStorage.getItem('token');
          console.debug('PUT /api/users/agree token:', token);
          try {
            const resp = await fetch(`${API_BASE}/api/users/agree`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`
              },
              body: JSON.stringify({ acceptedAt: new Date().toISOString() })
            });
            if (!resp.ok) {
              // Try to read JSON/text error from server for debugging
              let errBody = 'no body';
              try {
                errBody = await resp.json();
              } catch (e) {
                try { errBody = await resp.text(); } catch (e2) {}
              }
              console.error('Agreement save failed', resp.status, errBody);
              throw new Error(`Server responded ${resp.status}: ${JSON.stringify(errBody)}`);
            }
            localStorage.setItem(AGREEMENT_KEY, 'true');
            modal.classList.add('hidden');
            console.debug('User accepted agreement (saved to server)');
          } catch (err) {
            console.error('Agreement save error:', err);
            Swal.fire({ icon: 'error', title: 'Error', text: 'Could not save agreement. Please try again.' });
            acceptBtn.disabled = false;
          }
        });
      }

      if (declineBtn) {
        declineBtn.addEventListener('click', function (e) {
          e.preventDefault();
          if (declineBtn.disabled) return;
          // immediate disable to prevent double-clicks
          declineBtn.disabled = true;
          // hide modal right away so UI responds immediately
          try { modal.classList.add('hidden'); } catch (err) {}
          Swal.fire({
            icon: 'info',
            title: 'Agreement Required',
            text: 'You must accept the agreement to use SK-INSIGHT. You will be logged out.',
            confirmButtonText: 'OK',
            allowOutsideClick: false
          }).then(() => {
            // Clear session and redirect to login
            try { sessionStorage.clear(); } catch (err) {}
            try { localStorage.removeItem('token'); } catch (err) {}
            // short delay to allow modal hide animation / cleanup
            setTimeout(() => { window.location.href = '/Frontend/html/user/login.html'; }, 80);
          }).catch(() => {
            // on error, ensure button is re-enabled so user can try again
            declineBtn.disabled = false;
          });
        });
      }
    })
    .catch(err => {
      console.error('Failed to fetch current user for agreement check', err);
      // Fail safe: hide modal if anything goes wrong to avoid blocking the user
      modal.classList.add('hidden');
    });
}

// ============================================
// USER VERIFICATION FUNCTIONALITY
// ============================================
function initIndexVerification() {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  const verificationStrip = document.getElementById('verification-strip');

  if (!token) {
    // no token -> show login strip is handled by navbar.js; nothing else to do
    return;
  }

  fetch(`${API_BASE}/api/users/me`, {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(response => response.json())
    .then(user => {
      if (!user || !user.isVerified) {
        // Show verification strip for unverified accounts
        if (verificationStrip) verificationStrip.style.display = 'flex';

        // Disable navigation buttons (keep behavior consistent with other pages)
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
}

// Run now if DOM already parsed, otherwise wait for DOMContentLoaded.
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initAgreementModal();
    initIndexVerification();
  });
} else {
  initAgreementModal();
  initIndexVerification();
}

