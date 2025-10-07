document.addEventListener('DOMContentLoaded', async function() {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch('http://localhost:5000/api/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const user = await res.json();
      // If you have an input for birthday, set its value:
      const birthdayInput = document.getElementById('birthday');
      if (birthdayInput && user.birthday) {
        birthdayInput.value = user.birthday.split('T')[0]; // format as yyyy-mm-dd
        birthdayInput.readOnly = true; // make it non-editable
      }
    }
  } catch (err) {
    console.error('Failed to fetch birthday:', err);
  }

  const form = document.getElementById('personalForm');
  const saved = JSON.parse(localStorage.getItem('kkProfileStep1') || '{}');

  document.getElementById('lastname').value = saved.lastname || '';
  document.getElementById('firstname').value = saved.firstname || '';
  document.getElementById('middlename').value = saved.middlename || '';
  document.getElementById('suffix').value = saved.suffix || '';
  document.getElementById('gender').value = saved.gender || '';
  document.getElementById('birthday').value = saved.birthday || '';

  form.addEventListener('submit', function(e) {
    e.preventDefault();
    const data = {
      lastname: form.lastname.value.trim(),
      firstname: form.firstname.value.trim(),
      middlename: form.middlename.value.trim(),
      suffix: form.suffix.value.trim(),
      gender: form.gender.value,
      birthday: form.birthday.value
    };
    localStorage.setItem('kkProfileStep1', JSON.stringify(data));
    window.location.href = 'kkform-address.html';
  });

  // Get birthday from localStorage (from previous step)
  const step1 = JSON.parse(localStorage.getItem('kkProfileStep1') || '{}');
  const birthday = step1.birthday;

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

  document.getElementById('age').value = calculateAge(birthday);

  // ...existing code for other fields...
});

// Place this at the end of your HTML or in a JS file
document.addEventListener('DOMContentLoaded', function() {
  const hamburger = document.getElementById('navbarHamburger');
  const mobileMenu = document.getElementById('navbarMobileMenu');
  hamburger.addEventListener('click', function() {
    mobileMenu.classList.toggle('active');
  });
  document.addEventListener('click', function(e) {
    if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
      mobileMenu.classList.remove('active');
    }
  });
});