document.addEventListener('DOMContentLoaded', async function() {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) return;

  const ageInput = document.getElementById('age');
  const birthdayInput = document.getElementById('birthday');

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

  try {
    const res = await fetch('http://localhost:5000/api/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (res.ok) {
      const user = await res.json();
      if (birthdayInput && user.birthday) {
        birthdayInput.value = user.birthday.split('T')[0]; // format as yyyy-mm-dd
        birthdayInput.readOnly = true; // make it non-editable
        if (ageInput) ageInput.value = calculateAge(birthdayInput.value);
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
  if (birthdayInput && !birthdayInput.value) {
    birthdayInput.value = saved.birthday || '';
    if (ageInput) ageInput.value = calculateAge(birthdayInput.value);
  }

  // If birthday is editable, update age on change
  if (birthdayInput && !birthdayInput.readOnly) {
    birthdayInput.addEventListener('change', function() {
      if (ageInput) ageInput.value = calculateAge(birthdayInput.value);
    });
  }

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

function handleLGBTQProfileNavClick(event) {
  event.preventDefault();
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) {
    Swal.fire({
      icon: 'warning',
      title: 'You need to log in first',
      text: 'Please log in to access LGBTQ+ Profiling.',
      confirmButtonText: 'OK'
    }).then(() => {
      window.location.href = '/Frontend/html/user/login.html';
    });
    return;
  }

  fetch('http://localhost:5000/api/lgbtqprofiling/me', {
    headers: { Authorization: `Bearer ${token}` }
  })
    .then(async res => {
      const data = await res.json();
      // If profile exists (res.ok), go to confirmation
      if (res.ok && data && data._id) {
        window.location.href = "confirmation/html/lgbtqconfirmation.html";
        return;
      }
      // If no profile (404 or error), go to profiling form
      window.location.href = "lgbtqform.html";
    })
    .catch(() => {
      window.location.href = "lgbtqform.html";
    });
}

document.addEventListener('DOMContentLoaded', function() {
  // Attach to desktop nav button
  const lgbtqProfileNavBtnDesktop = document.getElementById('lgbtqProfileNavBtnDesktop');
  if (lgbtqProfileNavBtnDesktop) {
    lgbtqProfileNavBtnDesktop.addEventListener('click', handleLGBTQProfileNavClick);
  }
  // Attach to mobile nav button
  const lgbtqProfileNavBtnMobile = document.getElementById('lgbtqProfileNavBtnMobile');
  if (lgbtqProfileNavBtnMobile) {
    lgbtqProfileNavBtnMobile.addEventListener('click', handleLGBTQProfileNavClick);
  }
});