// Image modal functions
function openImageModal(imageSrc) {
  const modal = document.getElementById('imageModal');
  const modalImage = document.getElementById('modalImage');
  modalImage.src = imageSrc;
  modal.style.display = 'flex';
  document.body.style.overflow = 'hidden';
}

function closeImageModal() {
  const modal = document.getElementById('imageModal');
  modal.style.display = 'none';
  document.body.style.overflow = 'auto';
}

// Close modal on escape key
document.addEventListener('keydown', function(event) {
  if (event.key === 'Escape') {
    closeImageModal();
  }
});

const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
  ? window.API_BASE
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : 'https://sk-insight.online';

document.addEventListener('DOMContentLoaded', async function() {
  // if (!validateTokenAndRedirect("LGBTQ+ Profile")) {
  //   return;
  // }
  
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  

    if (typeof window !== 'undefined' && typeof window.initNavbarHamburger === 'function') {
    try { 
      window.initNavbarHamburger(); 
    } catch (e) {
       /* ignore */ 
      }
  } 

  try {
    const res = await fetch(`${API_BASE}/api/lgbtqprofiling/me/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();

    // Front ID image preview (if exists)
    if (data.idImageFront) {
      document.getElementById('imagePreviewContainerFront').style.display = 'block';
      const frontImg = document.getElementById('imagePreviewFront');
      frontImg.src = data.idImageFront;
      frontImg.addEventListener('click', () => openImageModal(data.idImageFront));
    }

    // Back ID image preview (if exists)
    if (data.idImageBack) {
      document.getElementById('imagePreviewContainerBack').style.display = 'block';
      const backImg = document.getElementById('imagePreviewBack');
      backImg.src = data.idImageBack;
      backImg.addEventListener('click', () => openImageModal(data.idImageBack));
    }

    // Set personal info fields if they exist in the response
    if (data.lastname) document.getElementById('lastName').value = data.lastname;
    if (data.firstname) document.getElementById('firstName').value = data.firstname;
    if (data.middlename) document.getElementById('middleName').value = data.middlename;

    // Get birthday from user info (from sign-in)
    let birthday = "";
    if (data.user && data.user.birthday) {
      birthday = data.user.birthday;
    } else if (data.kkInfo && data.kkInfo.birthday) {
      birthday = data.kkInfo.birthday;
    } else if (data.birthday) {
      birthday = data.birthday;
    }
    if (birthday) {
      document.getElementById('birthday').value = birthday.split('T')[0];
    }

    if (data.sexAssignedAtBirth) document.getElementById('sex').value = data.sexAssignedAtBirth;
    if (data.lgbtqClassification) document.getElementById('identity').value = data.lgbtqClassification;
  } catch (err) {
    console.error('Failed to fetch LGBTQ Profile data:', err);
  }

  // Navbar/hamburger handled by shared `navbar.js`.
});

// Navigation is handled centrally by `navbar.js`. No per-page nav handlers required here.
// The page only provides data-fetching and the `checkAndPromptEducReapply` helper below.

// Embed educRejected helper so other pages (or the navbar) can prompt to reapply if needed
(function () {
  async function getJsonSafe(res) { try { return await res.json(); } catch (e) { return null; } }

  async function checkAndPromptEducReapply(opts = {}) {
    const {
      event,
      redirectUrl = '../../Educational-assistance-user.html',
      draftKeys = ['educDraft','educationalDraft','educAssistanceDraft'],
      formName = 'Educational Assistance',
      apiBase = API_BASE
    } = opts || {};

    if (event && typeof event.preventDefault === 'function') event.preventDefault();

    const token = opts.token || sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) return { redirected: false, isRejected: false, hasProfile: false, isFormOpen: false };

    try {
      const cycleUrl = `${apiBase}/api/formcycle/status?formName=${encodeURIComponent(formName)}`;
      const profileUrl = `${apiBase}/api/educational-assistance/me`;
      const [cycleRes, profileRes] = await Promise.all([
        fetch(cycleUrl, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(profileUrl, { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const cycleData = await getJsonSafe(cycleRes);
      const profileData = await getJsonSafe(profileRes) || {};
      const latestCycle = Array.isArray(cycleData) ? cycleData[cycleData.length - 1] : cycleData;
      const isFormOpen = latestCycle?.isOpen ?? false;
      const hasProfile = Boolean(profileData && (profileData._id || profileData.id));

      const statusVal = (profileData && (profileData.status || profileData.decision || profileData.adminDecision || profileData.result)) || '';
      const isRejected = Boolean(
        (profileData && (profileData.rejected === true || profileData.isRejected === true)) ||
        (typeof statusVal === 'string' && /reject|denied|denied_by_admin|rejected/i.test(statusVal))
      );
      const isApproved = Boolean(
        (profileData && (profileData.status === 'approved' || profileData.approved === true)) ||
        (typeof statusVal === 'string' && /approve|approved/i.test(statusVal))
      );

      if (isFormOpen && (!hasProfile || isRejected)) {
        if (isRejected) {
          await Swal.fire({ icon: 'warning', title: 'Previous Application Rejected', text: 'Your previous application was rejected. You will be redirected to the form to submit a new application.' });
          try { draftKeys.forEach(k => sessionStorage.removeItem(k)); } catch (e) {}
          window.location.href = redirectUrl;
          return { redirected: true, isRejected, hasProfile, isFormOpen };
        } else {
          const text = `You don't have a profile yet. Please fill out the form to create one.`;
          const result = await Swal.fire({ icon: 'info', title: 'No profile found', text, showCancelButton: true, confirmButtonText: 'Go to form', cancelButtonText: 'No' });
          if (result && result.isConfirmed) {
            try { draftKeys.forEach(k => sessionStorage.removeItem(k)); } catch (e) {}
            window.location.href = redirectUrl;
            return { redirected: true, isRejected, hasProfile, isFormOpen };
          }
        }
      }

      if (!isFormOpen && hasProfile && isApproved) {
        const res2 = await Swal.fire({ icon: 'info', title: `The ${formName} is currently closed`, text: `Your application has been approved. Do you want to view your response?`, showCancelButton: true, confirmButtonText: 'Yes, view my response', cancelButtonText: 'No' });
        if (res2 && res2.isConfirmed) { window.location.href = `educConfirmation.html`; return { redirected: true, isRejected, hasProfile, isFormOpen }; }
      }

      return { redirected: false, isRejected, hasProfile, isFormOpen };
    } catch (err) {
      console.error('checkAndPromptEducReapply error', err);
      return { redirected: false, isRejected: false, hasProfile: false, isFormOpen: false };
    }
  }

  if (typeof window !== 'undefined') window.checkAndPromptEducReapply = checkAndPromptEducReapply;
})();
