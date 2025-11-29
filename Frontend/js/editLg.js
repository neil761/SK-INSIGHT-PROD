/*
  editLg.js
  - Fetch LGBTQ profile for current user, populate the edit form
  - Fetch images (Cloudinary or server URLs) and convert to base64 for preview/edit
  - Allow upload/change/remove of front/back ID images
  - Confirm + show loading on submit and PUT/POST to server (multipart when files changed)
*/



// Make a single runtime-resolved API base available to all handlers in this file.
const API_BASE =
  (typeof window !== 'undefined' && window.API_BASE)
    ? window.API_BASE
    : (typeof window !== 'undefined' && (window.location && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')))
      ? 'http://localhost:5000'
      : 'https://sk-insight.online';

// Re-open DOMContentLoaded for attaching nav handlers and helpers that also use `API_BASE`.
document.addEventListener('DOMContentLoaded', function () {


  if (typeof window !== 'undefined' && typeof window.initNavbarHamburger === 'function') {
    try { 
      window.initNavbarHamburger(); 
    } catch (e) {
       /* ignore */ 
      }
  } 

  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (!token) return;
  let _profileId = null;

  

  // helpers
  function base64ToFile(base64, filename) {
    const arr = base64.split(',');
    const mime = (arr[0].match(/:(.*?);/) || [])[1] || 'image/png';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8 = new Uint8Array(n);
    while (n--) u8[n] = bstr.charCodeAt(n);
    return new File([u8], filename, { type: mime });
  }

  async function fetchImageAsBase64(url) {
    if (!url) return null;
    try {
      const r = await fetch(url);
      if (!r.ok) return null;
      const blob = await r.blob();
      return await new Promise((resolve, reject) => {
        const fr = new FileReader();
        fr.onload = () => resolve(fr.result);
        fr.onerror = reject;
        fr.readAsDataURL(blob);
      });
    } catch (e) {
      console.warn('fetchImageAsBase64 failed', e);
      return null;
    }
  }

  function setIfExists(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value ?? '';
  }

  function renderPreview(containerId, src) {
    const c = document.getElementById(containerId);
    if (!c) return;
    if (!src) {
      c.style.display = 'none';
      c.querySelector && (c.querySelector('img').src = '');
      return;
    }
    c.style.display = 'block';
    c.innerHTML = `
      <button type="button" class="remove-image-btn" data-remove aria-label="Remove image">×</button>
      <img src="${src}" alt="preview" />
    `;
    const btn = c.querySelector('[data-remove]');
    if (btn) btn.addEventListener('click', () => {
      // clear preview and mark removed
      frontState.removed = true;
      backState.removed = backState.removed; // noop for clarity
      if (containerId.includes('Front')) frontState.base64 = null;
      if (containerId.includes('Back')) backState.base64 = null;
      renderPreview(containerId, null);
    });
    const img = c.querySelector('img');
    if (img) {
      // ensure very tall images open scaled in SweetAlert (SweetAlert will size to image naturally,
      // but we provide a constrained preview behavior here by passing the same src)
      img.addEventListener('click', () => {
        try { Swal.fire({ imageUrl: img.src, imageAlt: 'Preview', showCloseButton: true }); } catch (e) { window.open(img.src); }
      });
      // also make sure inline preview doesn't force layout: apply style attributes that respect CSS max-height
      img.style.maxWidth = '100%';
      img.style.width = 'auto';
      img.style.height = 'auto';
      img.style.maxHeight = '60vh';
      img.style.objectFit = 'contain';
      img.style.display = 'block';
      img.style.margin = '0 auto';
      img.style.borderRadius = '6px';
    }
  }

  const frontInput = document.getElementById('idImageFront');
  const backInput = document.getElementById('idImageBack');
  const frontPreviewContainer = document.getElementById('imagePreviewContainerFront');
  const backPreviewContainer = document.getElementById('imagePreviewContainerBack');

  // state for images
  const frontState = { base64: null, removed: false };
  const backState = { base64: null, removed: false };

  // populate from server
  async function populate() {
    try {
      const res = await fetch(`${API_BASE}/api/lgbtqprofiling/me/profile`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      _profileId = data && (data._id || data.id) ? (data._id || data.id) : null;

      setIfExists('lastName', data.lastname || data.lastName || '');
      setIfExists('firstName', data.firstname || data.firstName || '');
      setIfExists('middleName', data.middlename || data.middleName || '');
      const bd = data.birthday ? (data.birthday.split ? data.birthday.split('T')[0] : data.birthday) : '';
      setIfExists('birthday', bd);
      setIfExists('sex', data.sexAssignedAtBirth || data.sex || '');
      setIfExists('identity', data.lgbtqClassification || data.identity || '');

      // images
      let frontUrl = data.idImageFront || data.idImageFrontPath || data.idImage || null;
      let backUrl = data.idImageBack || data.idImageBackPath || null;

      if (frontUrl) {
        const b64 = await fetchImageAsBase64(frontUrl);
        if (b64) {
          frontState.base64 = b64;
          frontState.removed = false;
          renderPreview('imagePreviewContainerFront', b64);
        }
      }
      if (backUrl) {
        const b64 = await fetchImageAsBase64(backUrl);
        if (b64) {
          backState.base64 = b64;
          backState.removed = false;
          renderPreview('imagePreviewContainerBack', b64);
        }
      }
    } catch (e) {
      console.warn('populate lgbtq profile failed', e);
    }
  }

  // file input handlers
  function validateImageFile(file) {
    if (!file) return false;
    const allowed = ['image/png','image/jpeg','image/jpg'];
    return allowed.includes(file.type);
  }

  if (frontInput) frontInput.addEventListener('change', function (e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!validateImageFile(f)) { Swal.fire({ icon: 'error', title: 'Invalid file', text: 'Only PNG and JPEG allowed.' }); frontInput.value = ''; return; }
    const fr = new FileReader();
    fr.onload = () => {
      frontState.base64 = fr.result;
      frontState.removed = false;
      renderPreview('imagePreviewContainerFront', fr.result);
    };
    fr.readAsDataURL(f);
  });

  if (backInput) backInput.addEventListener('change', function (e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!validateImageFile(f)) { Swal.fire({ icon: 'error', title: 'Invalid file', text: 'Only PNG and JPEG allowed.' }); backInput.value = ''; return; }
    const fr = new FileReader();
    fr.onload = () => {
      backState.base64 = fr.result;
      backState.removed = false;
      renderPreview('imagePreviewContainerBack', fr.result);
    };
    fr.readAsDataURL(f);
  });

  // submit handling
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) submitBtn.addEventListener('click', async function (ev) {
    ev.preventDefault();
    try {
      const confirmed = await Swal.fire({ title: 'Are you sure you want to save changes?', icon: 'question', showCancelButton: true, confirmButtonText: 'Yes, save', cancelButtonText: 'Cancel', confirmButtonColor: '#0A2C59' });
      if (!confirmed || !confirmed.isConfirmed) return;
    } catch (e) { console.warn('Swal failed, proceeding'); }

    // show loading
    try { Swal.fire({ title: 'Saving changes...', allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading(), showConfirmButton: false }); } catch (e) {}

    // gather fields
    const payload = {
      lastname: (document.getElementById('lastName')||{}).value || '',
      firstname: (document.getElementById('firstName')||{}).value || '',
      middlename: (document.getElementById('middleName')||{}).value || '',
      birthday: (document.getElementById('birthday')||{}).value || '',
      sexAssignedAtBirth: (document.getElementById('sex')||{}).value || '',
      lgbtqClassification: (document.getElementById('identity')||{}).value || ''
    };

    try {
      // prepare FormData when files changed or for create
      const hasNewFront = !!frontState.base64 && String(frontState.base64).startsWith('data:');
      const hasNewBack = !!backState.base64 && String(backState.base64).startsWith('data:');

      if (_profileId) {
        // update
        if (hasNewFront || hasNewBack || frontState.removed || backState.removed) {
          const fd = new FormData();
          Object.entries(payload).forEach(([k,v]) => fd.append(k, v));
          if (frontState.removed) fd.append('_removed', JSON.stringify({ front: true }));
          if (backState.removed) fd.append('_removed', JSON.stringify({ back: true }));
          if (hasNewFront) fd.append('idImageFront', base64ToFile(frontState.base64, 'front.png'));
          if (hasNewBack) fd.append('idImageBack', base64ToFile(backState.base64, 'back.png'));
          const res = await fetch(`${API_BASE}/api/lgbtqprofiling/me`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: fd });
          const text = await res.text();
          if (!res.ok) throw new Error(text || 'Update failed');
          try { Swal.close(); } catch (e) {}
          await Swal.fire({ icon: 'success', title: 'Saved', text: 'Profile updated.' });
          window.location.href = 'lgbtqconfirmation.html';
          return;
        } else {
          // send JSON PUT
          const res = await fetch(`${API_BASE}/api/lgbtqprofiling/me`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
          const j = await res.json().catch(()=>null);
          if (!res.ok) throw new Error((j && j.error) || 'Update failed');
          try { Swal.close(); } catch (e) {}
          await Swal.fire({ icon: 'success', title: 'Saved', text: 'Profile updated.' });
          window.location.href = 'lgbtqconfirmation.html';
          return;
        }
      } else {
        // create new profile: always send FormData
        const fd = new FormData();
        Object.entries(payload).forEach(([k,v]) => fd.append(k, v));
        if (hasNewFront) fd.append('idImageFront', base64ToFile(frontState.base64, 'front.png'));
        if (hasNewBack) fd.append('idImageBack', base64ToFile(backState.base64, 'back.png'));
        const res = await fetch(`${API_BASE}/api/lgbtqprofiling`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
        const text = await res.text();
        if (!res.ok) throw new Error(text || 'Create failed');
  try { Swal.close(); } catch (e) {}
  await Swal.fire({ icon: 'success', title: 'Saved', text: 'Profile submitted.' });
  window.location.href = 'lgbtqconfirmation.html';
  return;
      }
    } catch (err) {
      console.error('Save failed', err);
      try { Swal.close(); } catch (e) {}
      await Swal.fire({ icon: 'error', title: 'Save failed', text: String(err.message || err) });
    }
  });

  // Navbar and navigation logic is now handled by shared navbar.js
  // All local hamburger/nav button code removed for maintainability.

  populate();


});

// All nav button event listeners and hamburger logic removed; navigation is now handled by navbar.js

// KK Profile Navigation
function handleKKProfileNavClick(event) {
  event.preventDefault();
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  Promise.all([
    fetch(`${API_BASE}/api/formcycle/status?formName=KK%20Profiling`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
    fetch(`${API_BASE}/api/kkprofiling/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
  ])
  .then(async ([cycleRes, profileRes]) => {
    let cycleData = await cycleRes.json().catch(() => null);
    let profileData = await profileRes.json().catch(() => ({}));
    const latestCycle = Array.isArray(cycleData) ? cycleData[cycleData.length - 1] : cycleData;
    const formName = latestCycle?.formName || "KK Profiling";
    const isFormOpen = latestCycle?.isOpen ?? false;
    const hasProfile = profileRes.ok && profileData && profileData._id;
    // CASE 1: Form closed, user already has profile
    if (!isFormOpen && hasProfile) {
      Swal.fire({
        icon: "info",
        title: `The ${formName} is currently closed`,
        text: `but you already have a ${formName} profile. Do you want to view your response?`,
        showCancelButton: true,
        confirmButtonText: "Yes, view my response",
        cancelButtonText: "No"
      }).then(result => {
        if (result.isConfirmed) window.location.href = "kkcofirmation.html";
      });
      return;
    }
    // CASE 2: Form closed, user has NO profile
    if (!isFormOpen && !hasProfile) {
      Swal.fire({
        icon: "warning",
        title: `The ${formName} form is currently closed`,
        text: "You cannot submit a new response at this time.",
        confirmButtonText: "OK"
      });
      return;
    }
    // CASE 3: Form open, user already has a profile
    if (isFormOpen && hasProfile) {
      Swal.fire({
        title: `You already answered ${formName} Form`,
        text: "Do you want to view your response?",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "No"
      }).then(result => {
        if (result.isConfirmed) window.location.href = "kkcofirmation.html";
      });
      return;
    }
    // CASE 4: Form open, no profile → Show SweetAlert and go to form
    if (isFormOpen && !hasProfile) {
      Swal.fire({
        icon: "info",
        title: `No profile found`,
        text: `You don't have a profile yet. Please fill out the form to create one.`,
        showCancelButton: true, // Show the "No" button
        confirmButtonText: "Go to form", // Text for the "Go to Form" button
        cancelButtonText: "No", // Text for the "No" button
      }).then(result => {
        if (result.isConfirmed) {
          // Redirect to the form page when "Go to Form" is clicked
          window.location.href = "../../kkform-personal.html";
        } else if (result.dismiss === Swal.DismissReason.cancel) {
        }
      });
      return;
    }
  })
  .catch(() => window.location.href = "../../kkform-personal.html");
}

// LGBTQ+ Profile Navigation
function handleLGBTQProfileNavClick(event) {
  event.preventDefault();
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  Promise.all([
    fetch(`${API_BASE}/api/formcycle/status?formName=LGBTQIA%2B%20Profiling`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
    fetch(`${API_BASE}/api/lgbtqprofiling/me/profile`, {
      headers: { Authorization: `Bearer ${token}` }
    })
  ])
  .then(async ([cycleRes, profileRes]) => {
    let cycleData = await cycleRes.json().catch(() => null);
    let profileData = await profileRes.json().catch(() => ({}));
    const latestCycle = Array.isArray(cycleData) ? cycleData[cycleData.length - 1] : cycleData;
    const formName = latestCycle?.formName || "LGBTQIA+ Profiling";
    const isFormOpen = latestCycle?.isOpen ?? false;
    const hasProfile = profileData && profileData._id ? true : false;
    // CASE 1: Form closed, user already has profile
    if (!isFormOpen && hasProfile) {
      Swal.fire({
        icon: "info",
        title: `The ${formName} is currently closed`,
        text: `but you already have a ${formName} profile. Do you want to view your response?`,
        showCancelButton: true,
        confirmButtonText: "Yes, view my response",
        cancelButtonText: "No"
      }).then(result => {
        if (result.isConfirmed) window.location.href = "lgbtqconfirmation.html";
      });
      return;
    }
    // CASE 2: Form closed, user has NO profile
    if (!isFormOpen && !hasProfile) {
      Swal.fire({
        icon: "warning",
        title: `The ${formName} form is currently closed`,
        text: "You cannot submit a new response at this time.",
        confirmButtonText: "OK"
      });
      return;
    }
    // CASE 3: Form open, user already has a profile
    if (isFormOpen && hasProfile) {
      Swal.fire({
        title: `You already answered ${formName} Form`,
        text: "Do you want to view your response?",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "No"
      }).then(result => {
        if (result.isConfirmed) window.location.href = "lgbtqconfirmation.html";
      });
      return;
    }
    // CASE 4: Form open, no profile → Show SweetAlert and go to form
    if (isFormOpen && !hasProfile) {
      Swal.fire({
        icon: "info",
        title: `No profile found`,
        text: `You don't have a profile yet. Please fill out the form to create one.`,
        showCancelButton: true, // Show the "No" button
        confirmButtonText: "Go to form", // Text for the "Go to Form" button
        cancelButtonText: "No", // Text for the "No" button
      }).then(result => {
        if (result.isConfirmed) {
          // Redirect to the form page when "Go to Form" is clicked
          window.location.href = "../../lgbtqform.html";
        } else if (result.dismiss === Swal.DismissReason.cancel) {
        }
      });
      return;
    }
  })
  .catch(() => window.location.href = "../../lgbtqform.html");
}

// Educational Assistance Navigation
function handleEducAssistanceNavClick(event) {
  event.preventDefault();
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  Promise.all([
    fetch(`${API_BASE}/api/formcycle/status?formName=Educational%20Assistance`, {
      headers: { Authorization: `Bearer ${token}` }
    }),
    fetch(`${API_BASE}/api/educational-assistance/me`, {
      headers: { Authorization: `Bearer ${token}` }
    })
  ])
  .then(async ([cycleRes, profileRes]) => {
    let cycleData = await cycleRes.json().catch(() => null);
    let profileData = await profileRes.json().catch(() => ({}));
    const latestCycle = Array.isArray(cycleData) ? cycleData[cycleData.length - 1] : cycleData;
    const formName = latestCycle?.formName || "Educational Assistance";
    const isFormOpen = latestCycle?.isOpen ?? false;
    const hasProfile = profileData && profileData._id ? true : false;
    // CASE 1: Form closed, user already has profile
    if (!isFormOpen && hasProfile) {
      Swal.fire({
        icon: "info",
        title: `The ${formName} is currently closed`,
        text: `but you already have an application. Do you want to view your response?`,
        showCancelButton: true,
        confirmButtonText: "Yes, view my response",
        cancelButtonText: "No"
      }).then(result => {
        if (result.isConfirmed) window.location.href = "educConfirmation.html";
      });
      return;
    }
    // CASE 2: Form closed, user has NO profile
    if (!isFormOpen && !hasProfile) {
      Swal.fire({
        icon: "warning",
        title: `The ${formName} form is currently closed`,
        text: "You cannot submit a new application at this time.",
        confirmButtonText: "OK"
      });
      return;
    }
    // CASE 3: Form open, user already has a profile
    if (isFormOpen && hasProfile) {
      Swal.fire({
        title: `You already applied for ${formName}`,
        text: "Do you want to view your response?",
        icon: "info",
        showCancelButton: true,
        confirmButtonText: "Yes",
        cancelButtonText: "No"
      }).then(result => {
        if (result.isConfirmed) window.location.href = "educConfirmation.html";
      });
      return;
    }
    // CASE 4: Form open, no profile → Show SweetAlert and go to form
    if (isFormOpen && !hasProfile) {
      Swal.fire({
        icon: "info",
        title: `No profile found`,
        text: `You don't have a profile yet. Please fill out the form to create one.`,
        showCancelButton: true, // Show the "No" button
        confirmButtonText: "Go to form", // Text for the "Go to Form" button
        cancelButtonText: "No", // Text for the "No" button
      }).then(result => {
        if (result.isConfirmed) {
          // Redirect to the form page when "Go to Form" is clicked
          window.location.href = "../../Educational-assistance-user.html";
        } else if (result.dismiss === Swal.DismissReason.cancel) {
        }
      });
      return;
    }
  })
  .catch(() => window.location.href = "../../Educational-assistance-user.html");
}
