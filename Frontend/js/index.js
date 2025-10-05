
      document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.getElementById('navbarHamburger');
  const mobileMenu = document.getElementById('navbarMobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function(e) {
      e.stopPropagation();
      mobileMenu.classList.toggle('active');
    });
    document.addEventListener('click', function(e) {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('active');
      }
    });
  }
});
      // Show login strip if not logged in
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) {
        document.getElementById('login-strip').style.display = 'flex';
        document.body.classList.add('has-login-strip');
      }