document.addEventListener('DOMContentLoaded', async function() {
  const form = document.getElementById('addressForm');
  const saved = JSON.parse(localStorage.getItem('kkProfileStep2') || '{}');

  document.getElementById('region').value = saved.region || '4-A CALABARZON';
  document.getElementById('province').value = saved.province || 'Batangas';
  document.getElementById('municipality').value = saved.municipality || 'Calaca City';
  document.getElementById('barangay').value = saved.barangay || 'Puting Bato West';
  document.getElementById('purok').value = saved.purok || '';

  // Try to default email from signup (API), otherwise use saved one
  const emailInput = document.getElementById('email');
  emailInput.value = saved.email || '';

  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) {
    try {
      const res = await fetch('http://localhost:5000/api/users/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const user = await res.json();
        if (user.email && !saved.email) {
          emailInput.value = user.email;   // ✅ default from signup
          emailInput.readOnly = true;      // optional: lock it so user can’t change
        }
      }
    } catch (err) {
      console.error('Failed to fetch user:', err);
    }
  }

  document.getElementById('contactNumber').value = saved.contactNumber || '';
  document.getElementById('civilStatus').value = saved.civilStatus || '';

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const data = {
      region: form.region.value.trim(),
      province: form.province.value.trim(),
      municipality: form.municipality.value.trim(),
      barangay: form.barangay.value.trim(),
      purok: form.purok.value.trim(),
      email: form.email.value.trim(),
      contactNumber: form.contactNumber.value.trim(),
      civilStatus: form.civilStatus.value,
    };
    localStorage.setItem('kkProfileStep2', JSON.stringify(data));
    window.location.href = 'kkform-youth.html';
  });
});

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
