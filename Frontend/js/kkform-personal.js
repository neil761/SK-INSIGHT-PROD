document.addEventListener('DOMContentLoaded', function() {
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