const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
  ? window.API_BASE
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : 'https://sk-insight.online';

document.addEventListener('DOMContentLoaded', async function() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) return;

  if (typeof window !== 'undefined' && typeof window.initNavbarHamburger === 'function') {
    try { 
      window.initNavbarHamburger(); 
    } catch (e) {
       /* ignore */ 
      }
  } 

  try {
    const res = await fetch(`${API_BASE}/api/kkprofiling/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();

    document.getElementById('youthAgeGroup').value = data.youthAgeGroup || '';

    // Normalize and display youth classification
    let classification = data.youthClassification || '';
    if (classification === "Out-of-School Youth") classification = "Out of School Youth";
    document.getElementById('youthClassification').value = classification;

    // Show the specific needs dropdown and reason if needed
    if (classification === "Youth with Specific Needs") {
      document.getElementById('specificNeedsGroup').style.display = '';
      document.getElementById('specificNeedType').value = data.specificNeedType || '';

      // Display the reason as text (optional)
      let reasonText = document.getElementById('specificNeedReasonText');
      if (!reasonText) {
        reasonText = document.createElement('div');
        reasonText.id = 'specificNeedReasonText';
        reasonText.style.marginTop = '8px';
        document.getElementById('specificNeedsGroup').appendChild(reasonText);
      }
      reasonText.textContent = data.specificNeedType ? `Reason: ${data.specificNeedType}` : '';
    } else {
      document.getElementById('specificNeedsGroup').style.display = 'none';
      document.getElementById('specificNeedType').value = '';
      const reasonText = document.getElementById('specificNeedReasonText');
      if (reasonText) reasonText.textContent = '';
    }

    document.getElementById('educationalBackground').value = data.educationalBackground || '';
    document.getElementById('workStatus').value = data.workStatus || '';

    // Set dropdown values for the four fields
    document.getElementById('registeredSKVoter').value = data.registeredSKVoter === true || data.registeredSKVoter === "Yes" ? "Yes" : "No";
    document.getElementById('registeredNationalVoter').value = data.registeredNationalVoter === true || data.registeredNationalVoter === "Yes" ? "Yes" : "No";
    document.getElementById('votedLastSKElection').value = data.votedLastSKElection === true || data.votedLastSKElection === "Yes" ? "Yes" : "No";
    document.getElementById('attendedKKAssembly').value = data.attendedKKAssembly === true || data.attendedKKAssembly === "Yes" ? "Yes" : "No";

    if (data.attendedKKAssembly) {
      // Show "How many times?" and hide "Why didn't you attend?"
      document.getElementById('attendanceCountGroup').style.display = '';
      document.getElementById('reasonGroup').style.display = 'none';
      document.getElementById('attendanceCount').value = data.attendanceCount || '';
      document.getElementById('reasonDidNotAttend').value = '';
    } else {
      // Show "Why didn't you attend?" and hide "How many times?"
      document.getElementById('attendanceCountGroup').style.display = 'none';
      document.getElementById('reasonGroup').style.display = '';
      document.getElementById('attendanceCount').value = '';
      document.getElementById('reasonDidNotAttend').value = data.reasonDidNotAttend || '';
    }

    // Profile image preview (if exists)
    if (data.profileImage) {
      const imageUrl = data.profileImage.startsWith('http')
        ? data.profileImage
        : `${API_BASE}/uploads/profile/${data.profileImage}`;
      document.getElementById('idImagePreview').innerHTML =
        `<img id="kky_profile_img" src="${imageUrl}" alt="Profile Image" style="width:220px;border-radius:10px;cursor:pointer;">`;
      // Attach click to open global preview (fallback if global helper missing)
      try {
        const img = document.getElementById('kky_profile_img');
        if (img) img.addEventListener('click', () => {
          try {
            Swal.fire({ imageUrl: imageUrl, imageAlt: 'Profile Image', showConfirmButton: false, showCloseButton: true, width: 600 });
          } catch (e) { window.open(imageUrl, '_blank'); }
        });
      } catch (e) { /* ignore */ }
    }

    // Signature image preview (if exists)
    if (data.signatureImagePath) {
      const signatureUrl = data.signatureImagePath.startsWith('http')
        ? data.signatureImagePath
        : `${API_BASE}/uploads/signatures/${data.signatureImagePath.replace(/^.*[\\/]/, '')}`;
      document.getElementById('signaturePreview').innerHTML =
        `<img id="kky_signature_img" src="${signatureUrl}" alt="Signature Image" style="width:220px;border-radius:10px;cursor:pointer;">`;
      try {
        const sig = document.getElementById('kky_signature_img');
        if (sig) sig.addEventListener('click', () => {
          try {
            Swal.fire({ imageUrl: signatureUrl, imageAlt: 'Signature Image', showConfirmButton: false, showCloseButton: true, width: 600 });
          } catch (e) { window.open(signatureUrl, '_blank'); }
        });
      } catch (e) { /* ignore */ }
    }
  } catch (err) {
    console.error('Failed to fetch KKProfile data:', err);
  }
  // Navbar/hamburger is managed by navbar.js — local DOM listeners removed.
});

// Navbar-specific DOM wiring removed from here — centralized in navbar.js. See bottom of file where
// we leave the page handlers/compat helpers and let navbar.js bind buttons at runtime.

// Educational Assistance nav implementation removed — centralized in `navbar.js`.
// `navbar.js` provides the navigation logic and will call page handlers if present.

// Disable all inputs and selects
document.querySelectorAll('input, select, textarea').forEach(el => {
  el.disabled = true;
  el.readOnly = true;
});

// 1. Define all navigation handler functions FIRST
// KK Profile nav implementation removed — centralized in `navbar.js`.
// `navbar.js` will handle KK navigation and call page handlers if needed.

// LGBTQ+ nav implementation removed — centralized in `navbar.js`.
// `navbar.js` will handle LGBTQ navigation and call page handlers if needed.

// Educational Assistance nav implementation removed here too — centralized in `navbar.js`.
// `navbar.js` will handle the checks and navigation flow for Educational Assistance.

// Navbar event attachments and page-local navigational wiring moved to navbar.js.
// Page still provides handler functions and helpers — navbar.js will call them at runtime.

document.addEventListener('DOMContentLoaded', function() {
  // Disable all inputs, selects, and textareas
  document.querySelectorAll('input, select, textarea').forEach(el => {
    el.disabled = true;
    el.readOnly = true;
  });
});

document.addEventListener('DOMContentLoaded', async function() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  if (!token) return;

  try {
    const res = await fetch(`${API_BASE}/api/kkprofiling/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();

    document.getElementById('youthAgeGroup').value = data.youthAgeGroup || '';

    // Normalize and display youth classification
    let classification = data.youthClassification || '';
    if (classification === "Out-of-School Youth") classification = "Out of School Youth";
    document.getElementById('youthClassification').value = classification;

    // Show the specific needs dropdown and reason if needed
    if (classification === "Youth with Specific Needs") {
      document.getElementById('specificNeedsGroup').style.display = '';
      document.getElementById('specificNeedType').value = data.specificNeedType || '';

      // Display the reason as text (optional)
      let reasonText = document.getElementById('specificNeedReasonText');
      if (!reasonText) {
        reasonText = document.createElement('div');
        reasonText.id = 'specificNeedReasonText';
        reasonText.style.marginTop = '8px';
        document.getElementById('specificNeedsGroup').appendChild(reasonText);
      }
      reasonText.textContent = data.specificNeedType ? `Reason: ${data.specificNeedType}` : '';
    } else {
      document.getElementById('specificNeedsGroup').style.display = 'none';
      document.getElementById('specificNeedType').value = '';
      const reasonText = document.getElementById('specificNeedReasonText');
      if (reasonText) reasonText.textContent = '';
    }

    document.getElementById('educationalBackground').value = data.educationalBackground || '';
    document.getElementById('workStatus').value = data.workStatus || '';

    // Set dropdown values for the four fields
    document.getElementById('registeredSKVoter').value = data.registeredSKVoter === true || data.registeredSKVoter === "Yes" ? "Yes" : "No";
    document.getElementById('registeredNationalVoter').value = data.registeredNationalVoter === true || data.registeredNationalVoter === "Yes" ? "Yes" : "No";
    document.getElementById('votedLastSKElection').value = data.votedLastSKElection === true || data.votedLastSKElection === "Yes" ? "Yes" : "No";
    document.getElementById('attendedKKAssembly').value = data.attendedKKAssembly === true || data.attendedKKAssembly === "Yes" ? "Yes" : "No";

    if (data.attendedKKAssembly) {
      // Show "How many times?" and hide "Why didn't you attend?"
      document.getElementById('attendanceCountGroup').style.display = '';
      document.getElementById('reasonGroup').style.display = 'none';
      document.getElementById('attendanceCount').value = data.attendanceCount || '';
      document.getElementById('reasonDidNotAttend').value = '';
    } else {
      // Show "Why didn't you attend?" and hide "How many times?"
      document.getElementById('attendanceCountGroup').style.display = 'none';
      document.getElementById('reasonGroup').style.display = '';
      document.getElementById('attendanceCount').value = '';
      document.getElementById('reasonDidNotAttend').value = data.reasonDidNotAttend || '';
    }

    // Profile image preview (if exists)
    if (data.profileImage) {
      const imageUrl = data.profileImage.startsWith('http')
        ? data.profileImage
        : `${API_BASE}/uploads/profile/${data.profileImage}`;
      document.getElementById('idImagePreview').innerHTML =
        `<img id="kky_profile_img_2" src="${imageUrl}" alt="Profile Image" style="width:220px;border-radius:10px;cursor:pointer;">`;
      try {
        const img2 = document.getElementById('kky_profile_img_2');
        if (img2) img2.addEventListener('click', () => {
          try {
            Swal.fire({ imageUrl: imageUrl, imageAlt: 'Profile Image', showConfirmButton: false, showCloseButton: true, width: 600 });
          } catch (e) { window.open(imageUrl, '_blank'); }
        });
      } catch (e) { /* ignore */ }
    }

    // Signature image preview (if exists)
    if (data.signatureImagePath) {
      const signatureUrl = data.signatureImagePath.startsWith('http')
        ? data.signatureImagePath
        : `${API_BASE}/uploads/signatures/${data.signatureImagePath.replace(/^.*[\\/]/, '')}`;
      document.getElementById('signaturePreview').innerHTML =
        `<img id="kky_signature_img_2" src="${signatureUrl}" alt="Signature Image" style="width:220px;border-radius:10px;cursor:pointer;">`;
      try {
        const sig2 = document.getElementById('kky_signature_img_2');
        if (sig2) sig2.addEventListener('click', () => {
          try {
            Swal.fire({ imageUrl: signatureUrl, imageAlt: 'Signature Image', showConfirmButton: false, showCloseButton: true, width: 600 });
          } catch (e) { window.open(signatureUrl, '_blank'); }
        });
      } catch (e) { /* ignore */ }
    }
  } catch (err) {
    console.error('Failed to fetch KKProfile data:', err);
  }
  // Navbar/hamburger controlled by navbar.js — local listeners removed.
});

document.addEventListener('DOMContentLoaded', function () {
  const finishBtn = document.getElementById('finishBtn');
  if (finishBtn) {
    finishBtn.addEventListener('click', function (e) {
      e.preventDefault(); // Prevent form submission
      window.location.href = 'kkcofirmation.html'; // Redirect to confirmation page
    });
  }
});

// Helper to open the shared/global image preview modal. Uses global `showImagePreview` if present,
// otherwise falls back to a simple modal target (`#imagePreviewModal` / `#previewImg`).
function openGlobalImagePreview(src) {
  try {
    if (typeof window !== 'undefined' && typeof window.showImagePreview === 'function') {
      window.showImagePreview(src);
      return;
    }
  } catch (e) {}

  try {
    const modal = document.getElementById('imagePreviewModal');
    const previewImg = document.getElementById('previewImg');
    if (!previewImg || !modal) {
      // If modal or preview element does not exist, open the image in a new tab as a fallback
      if (src) window.open(src, '_blank');
      return;
    }

    // Track blob/object URL to allow revocation if needed
    if (typeof src === 'string' && src.startsWith('blob:')) {
      try { previewImg.dataset.objectUrl = src; } catch (e) {}
    }
    previewImg.src = src;
    try { modal.style.display = 'flex'; } catch (e) {}
  } catch (e) {
    if (src) window.open(src, '_blank');
  }
}

// Centralize navbar wiring: remove page-local nav listeners (if any) and let navbar.js bind handlers.
document.addEventListener('DOMContentLoaded', function () {
  try {
    // Replace nav elements with clones to remove previously attached listeners
    const ids = ['navbarHamburger','navbarMobileMenu','kkProfileNavBtnDesktop','kkProfileNavBtnMobile','lgbtqProfileNavBtnDesktop','lgbtqProfileNavBtnMobile','educAssistanceNavBtnDesktop','educAssistanceNavBtnMobile'];
    ids.forEach(id => {
      const el = document.getElementById(id);
      if (el && el.parentNode) {
        const clone = el.cloneNode(true);
        el.parentNode.replaceChild(clone, el);
      }
    });

    if (window && typeof window.bindNavButton === 'function') {
      try {
        window.bindNavButton('kkProfileNavBtnDesktop','kkProfileNavBtnMobile','handleKKProfileNavClick');
        window.bindNavButton('lgbtqProfileNavBtnDesktop','lgbtqProfileNavBtnMobile','handleLGBTQProfileNavClick');
        window.bindNavButton('educAssistanceNavBtnDesktop','educAssistanceNavBtnMobile','handleEducAssistanceNavClick');
      } catch (e) { console.warn('navbar binding failed', e); }
    }
  } catch (e) {
    console.warn('Failed to centralize navbar wiring', e);
  }
});