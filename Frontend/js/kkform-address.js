document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('addressForm');
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
      civilStatus: form.civilStatus.value
    };
    localStorage.setItem('kkProfileStep2', JSON.stringify(data));
    window.location.href = 'kkform-youth.html';
  });
});