document.addEventListener('DOMContentLoaded', function() {
  const form = document.getElementById('addressForm');
  const saved = JSON.parse(localStorage.getItem('kkProfileStep2') || '{}');

  document.getElementById('region').value = saved.region || '4-A CALABARZON';
  document.getElementById('province').value = saved.province || 'Batangas';
  document.getElementById('municipality').value = saved.municipality || 'Calaca City';
  document.getElementById('barangay').value = saved.barangay || 'Puting Bato West';
  document.getElementById('purok').value = saved.purok || '';
  document.getElementById('email').value = saved.email || '';
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
      civilStatus: form.civilStatus.value
    };
    localStorage.setItem('kkProfileStep2', JSON.stringify(data));
    window.location.href = 'kkform-youth.html';
  });
});