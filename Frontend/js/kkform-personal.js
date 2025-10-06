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