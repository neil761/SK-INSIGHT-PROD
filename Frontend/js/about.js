document.addEventListener('DOMContentLoaded', function () {
  const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
    ? window.API_BASE
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : 'https://sk-insight.online';

  // Keep only the verification-strip logic on the About page.
  // Navbar/hamburger and educational-assistance logic are centralized in `navbar.js`.
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) {
    fetch(`${API_BASE}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => response.json())
      .then(user => {
        const isVerified = user.isVerified || false;
        if (!isVerified) {
          const verificationStrip = document.getElementById('verification-strip');
          if (verificationStrip) verificationStrip.style.display = 'flex';
          document.body.classList.add('has-verification-strip');

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
    const loginStrip = document.getElementById('login-strip');
    if (loginStrip) loginStrip.style.display = 'flex';
    document.body.classList.add('has-login-strip');
  }
});
