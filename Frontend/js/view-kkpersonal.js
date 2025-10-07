document.addEventListener('DOMContentLoaded', async function() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch('http://localhost:5000/api/kkprofiling/me', {
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
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function(e) {
      e.stopPropagation();
      console.log("hamburger clicked");
      mobileMenu.classList.toggle('active');
    });
    document.addEventListener('click', function(e) {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('active');
      }
    });
  }
});