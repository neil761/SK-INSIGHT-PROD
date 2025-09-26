document.addEventListener('DOMContentLoaded', async function() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch('http://localhost:5000/api/kkprofiling/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();

    document.getElementById('region').value = data.region || '';
    document.getElementById('province').value = data.province || '';
    document.getElementById('municipality').value = data.municipality || '';
    document.getElementById('barangay').value = data.barangay || '';
    document.getElementById('purok').value = data.purok || '';
    document.getElementById('email').value = data.email || '';
    document.getElementById('contactNumber').value = data.contactNumber || '';
    document.getElementById('civilStatus').value = data.civilStatus || '';
  } catch (err) {
    console.error('Failed to fetch KKProfile data:', err);
  }
  // Hamburger menu code
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

