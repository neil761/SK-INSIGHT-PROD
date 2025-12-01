// Runtime API base (use `window.API_BASE` in production pages to override)
const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
  ? window.API_BASE
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://sk-insight.online';

// Navbar UI and wiring moved to `Frontend/js/navbar.js`.
// Keep token available for other handlers in this file.

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
  document.addEventListener('DOMContentLoaded', initIndexVerification);
} else {
  initIndexVerification();
}

