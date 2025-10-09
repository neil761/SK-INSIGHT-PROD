document.addEventListener('DOMContentLoaded', async function() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch('http://localhost:5000/api/lgbtqprofiling/me/profile', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();

    // Fill form fields with fetched data
    document.getElementById('lastName').value = data.lastname || '';
    document.getElementById('firstName').value = data.firstname || '';
    document.getElementById('middleName').value = data.middlename || '';
    document.getElementById('birthday').value = data.birthday
      ? new Date(data.birthday).toISOString().split('T')[0]
      : '';
    document.getElementById('sex').value = data.sexAssignedAtBirth || '';
    document.getElementById('identity').value = data.lgbtqClassification || '';

    // Profile image preview (if exists)
    if (data.idImage) {
      const imageUrl = data.idImage.startsWith('http')
        ? data.idImage
        : `http://localhost:5000/lgbtq_id_images/${data.idImage}`;
      document.getElementById('imagePreview').innerHTML =
        `<img src="${imageUrl}" alt="ID Image" style="width:320px;border-radius:10px;">`;
    }
  } catch (err) {
    console.error('Failed to fetch LGBTQ Profile data:', err);
  }

  // Hamburger menu code (optional, if you use it)
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