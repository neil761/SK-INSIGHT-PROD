document.addEventListener('DOMContentLoaded', async function() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch('http://localhost:5000/api/kkprofiling/me', {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();

    document.getElementById('youthAgeGroup').value = data.youthAgeGroup || '';
    document.getElementById('youthClassification').value = data.youthClassification || '';
    document.getElementById('educationalBackground').value = data.educationalBackground || '';
    document.getElementById('workStatus').value = data.workStatus || '';
    document.getElementById('registeredSKVoter').checked = !!data.registeredSKVoter;
    document.getElementById('registeredNationalVoter').checked = !!data.registeredNationalVoter;
    document.getElementById('votedLastSKElection').checked = !!data.votedLastSKElection;
    document.getElementById('attendedKKAssembly').checked = !!data.attendedKKAssembly;
    document.getElementById('attendanceCount').value = data.attendanceCount || '';
    document.getElementById('reasonDidNotAttend').value = data.reasonDidNotAttend || '';

    // Profile image preview (if exists)
    if (data.profileImage) {
      const imageUrl = data.profileImage.startsWith('http')
        ? data.profileImage
        : `http://localhost:5000/profile_images/${data.profileImage}`;
      document.getElementById('imagePreview').innerHTML =
        `<img src="${imageUrl}" alt="Profile Image" style="width:520px;border-radius:10px;">`;
    }
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