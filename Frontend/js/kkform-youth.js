document.addEventListener('DOMContentLoaded', function() {
  // Attendance logic
  const attendedKKAssembly = document.getElementById('attendedKKAssembly');
  const attendanceCountGroup = document.getElementById('attendanceCountGroup');
  const reasonGroup = document.getElementById('reasonGroup');
  attendedKKAssembly.addEventListener('change', () => {
    if (attendedKKAssembly.checked) {
      attendanceCountGroup.style.display = 'block';
      reasonGroup.style.display = 'none';
    } else {
      attendanceCountGroup.style.display = 'none';
      reasonGroup.style.display = 'block';
    }
  });

  // Image preview
  const profileImage = document.getElementById('profileImage');
  const imagePreview = document.getElementById('imagePreview');
  profileImage.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview.innerHTML = `<img src="${e.target.result}" alt="Profile Preview" style="width:100%;max-width:220px;border-radius:10px;">`;
      };
      reader.readAsDataURL(file);
    }
  });

  // Final submit
  document.getElementById('youthForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    // Collect all data from localStorage and this page
    const step1 = JSON.parse(localStorage.getItem('kkProfileStep1') || '{}');
    const step2 = JSON.parse(localStorage.getItem('kkProfileStep2') || '{}');
    const formData = new FormData();

    // Step 1
    Object.entries(step1).forEach(([k, v]) => formData.append(k, v));
    // Step 2
    Object.entries(step2).forEach(([k, v]) => formData.append(k, v));
    // Step 3
    formData.append('youthAgeGroup', this.youthAgeGroup.value);
    formData.append('youthClassification', this.youthClassification.value);
    formData.append('educationalBackground', this.educationalBackground.value);
    formData.append('workStatus', this.workStatus.value);
    formData.append('registeredSKVoter', this.registeredSKVoter.checked);
    formData.append('registeredNationalVoter', this.registeredNationalVoter.checked);
    formData.append('votedLastSKElection', this.votedLastSKElection.checked);
    formData.append('attendedKKAssembly', this.attendedKKAssembly.checked);
    formData.append('attendanceCount', this.attendanceCount.value);
    formData.append('reasonDidNotAttend', this.reasonDidNotAttend.value);
    if (this.profileImage.files[0]) {
      formData.append('profileImage', this.profileImage.files[0]);
    }

    try {
      // Get token from sessionStorage or localStorage
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/kkprofiling', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      if (response.ok) {
        alert('Form submitted successfully!');
        localStorage.removeItem('kkProfileStep1');
        localStorage.removeItem('kkProfileStep2');
        window.location.href = '/Frontend/html/user/userProfile.html';
      } else {
        let error;
        try {
          error = await response.json();
        } catch {
          error = { message: await response.text() };
        }
        alert(error.message || 'Something went wrong');
      }
    } catch (error) {
      alert('Failed to submit form');
    }
  });
});