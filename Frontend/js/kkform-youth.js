// Ensure `API_BASE` is available to all handlers in this file.
const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
  ? window.API_BASE
  : (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'))
    ? 'http://localhost:5000'
    : 'https://sk-insight.online';

document.addEventListener('DOMContentLoaded', function() {
  // if (!validateTokenAndRedirect("KK Youth Form")) {
  //   return;
  // }

    if (typeof window !== 'undefined' && typeof window.initNavbarHamburger === 'function') {
    try { 
      window.initNavbarHamburger(); 
    } catch (e) {
       /* ignore */ 
      }
  } 

  const educationalBackground = document.getElementById('educationalBackground');

  if (!educationalBackground) {
    console.error("❌ No element with id='educationalBackground' found!");
    return;
  }

  const saved = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');

  // Restore value
  if (saved.educationalBackground) {
    educationalBackground.value = saved.educationalBackground;
  }

  // Save on change
  educationalBackground.addEventListener('change', function () {
    const current = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
    current.educationalBackground = this.value;
    sessionStorage.setItem('kkProfileStep3', JSON.stringify(current));
  });
});

document.addEventListener('DOMContentLoaded', function() {
  // Restore youth step data if available
  const saved = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
  // Populate and lock the visible select (disabled) and keep a hidden input in sync
  const youthAgeSelect = document.getElementById('youthAgeGroup');
  const youthAgeHidden = document.getElementById('youthAgeGroup_hidden');
  try {
    if (youthAgeSelect) {
      youthAgeSelect.value = saved.youthAgeGroup || '';
      // Ensure the select stays disabled/read-only for users
      youthAgeSelect.disabled = true;
      youthAgeSelect.setAttribute('aria-disabled', 'true');
    }
    if (youthAgeHidden) {
      youthAgeHidden.value = saved.youthAgeGroup || '';
    }
  } catch (e) { /* ignore DOM errors */ }
  document.getElementById('youthClassification').value = saved.youthClassification || '';
  // Helper to map saved boolean/true/false values to 'Yes'/'No' for selects
  function mapYesNoFromSaved(v) {
    if (v === true || String(v).toLowerCase() === 'true') return 'Yes';
    if (v === false || String(v).toLowerCase() === 'false') return 'No';
    if (String(v).trim().toLowerCase() === 'yes') return 'Yes';
    if (String(v).trim().toLowerCase() === 'no') return 'No';
    return '';
  }
  // Show specific needs selector when classification requires it
  const youthClassificationEl = document.getElementById('youthClassification');
  const specificNeedsGroup = document.getElementById('specificNeedsGroup');
  const specificNeedTypeEl = document.getElementById('specificNeedType');

  function updateSpecificNeedsVisibility() {
    try {
      if (!youthClassificationEl || !specificNeedsGroup) return;
      if (String(youthClassificationEl.value).trim() === 'Youth with Specific Needs') {
        specificNeedsGroup.style.display = 'block';
        // restore saved value if available
        if (specificNeedTypeEl && saved.specificNeedType) specificNeedTypeEl.value = saved.specificNeedType;
        if (specificNeedTypeEl) {
          specificNeedTypeEl.required = true;
          specificNeedTypeEl.setAttribute('aria-required', 'true');
        }
      } else {
        specificNeedsGroup.style.display = 'none';
        if (specificNeedTypeEl) {
          specificNeedTypeEl.value = '';
          specificNeedTypeEl.required = false;
          specificNeedTypeEl.removeAttribute('aria-required');
        }
      }
    } catch (e) { /* ignore */ }

    // Nothing extra here; attendance/show-hide logic handled separately.
  }

  // Initialize visibility on load
  updateSpecificNeedsVisibility();

  // Toggle visibility when classification changes and autosave
  if (youthClassificationEl) {
    youthClassificationEl.addEventListener('change', function () {
      updateSpecificNeedsVisibility();
      // ensure we save the change
      try { saveStep3(); } catch (e) { /* ignore */ }
    });
  }
  document.getElementById('educationalBackground').value = saved.educationalBackground || '';
  document.getElementById('workStatus').value = saved.workStatus || '';
  // Normalize saved yes/no booleans into 'Yes'/'No' strings for the selects
  const savedRegisteredSK = mapYesNoFromSaved(saved.registeredSKVoter) || (saved.registeredSKVoter || '');
  const savedRegisteredNational = mapYesNoFromSaved(saved.registeredNationalVoter) || (saved.registeredNationalVoter || '');
  const savedAttended = mapYesNoFromSaved(saved.attendedKKAssembly) || (saved.attendedKKAssembly || '');
  try { if (document.getElementById('registeredSKVoter')) document.getElementById('registeredSKVoter').value = savedRegisteredSK; } catch (e) {}
  try { if (document.getElementById('registeredNationalVoter')) document.getElementById('registeredNationalVoter').value = savedRegisteredNational; } catch (e) {}
  try { if (document.getElementById('attendedKKAssembly')) document.getElementById('attendedKKAssembly').value = savedAttended; } catch (e) {}

  // Prefill youth-step fields from most recent KK profile (active or fallback).
  // Uses cached `kkRecentProfile` in sessionStorage when available.
  (async () => {
    try {
      const cacheKey = 'kkRecentProfile';
      let recent = null;
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        try { recent = JSON.parse(cached); } catch (e) { recent = null; }
      }
      if (!recent) {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!token) return;
        const r = await fetch(`${API_BASE}/api/kkprofiling/me/recent`, { headers: { Authorization: `Bearer ${token}` } });
        if (r.ok) { recent = await r.json().catch(() => null); if (recent) sessionStorage.setItem(cacheKey, JSON.stringify(recent)); }
      }
      if (!recent) return;
      const p = recent.profile || recent;
      if (!p) return;

      const saved3 = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');

      function fillIfEmpty(elId, savedKey, value) {
        if (value === null || value === undefined || value === '') return false;
        const el = document.getElementById(elId);
        if (!el) return false;
        // Only treat a saved value as "present" if it's a non-empty string.
        const savedVal = saved3 ? saved3[savedKey] : undefined;
        if ((typeof savedVal === 'string' && savedVal !== '') || (el.value && el.value !== '')) return false;
        el.value = value;
        saved3[savedKey] = value;
        return true;
      }

      // Normalize boolean/true/false values into 'Yes'/'No' strings for selects
      function yesNo(v) {
        if (v === true || v === 'true' || String(v).toLowerCase() === 'true') return 'Yes';
        if (v === false || v === 'false' || String(v).toLowerCase() === 'false') return 'No';
        if (String(v).trim().toLowerCase() === 'yes') return 'Yes';
        if (String(v).trim().toLowerCase() === 'no') return 'No';
        return '';
      }

      // youthAgeGroup may be stored in a hidden field
      const ageGroupHidden = document.getElementById('youthAgeGroup_hidden');
      if (p.youthAgeGroup && (!saved3.youthAgeGroup) && ageGroupHidden && (!ageGroupHidden.value || ageGroupHidden.value === '')) {
        ageGroupHidden.value = p.youthAgeGroup;
        saved3.youthAgeGroup = p.youthAgeGroup;
      }

      fillIfEmpty('youthClassification', 'youthClassification', p.youthClassification);
      fillIfEmpty('educationalBackground', 'educationalBackground', p.educationalBackground);
      fillIfEmpty('workStatus', 'workStatus', p.workStatus);
      fillIfEmpty('registeredSKVoter', 'registeredSKVoter', yesNo(p.registeredSKVoter));
      fillIfEmpty('registeredNationalVoter', 'registeredNationalVoter', yesNo(p.registeredNationalVoter));
      fillIfEmpty('votedLastSKElection', 'votedLastSKElection', yesNo(p.votedLastSKElection));
      fillIfEmpty('attendedKKAssembly', 'attendedKKAssembly', yesNo(p.attendedKKAssembly));

      // Prefill attendanceCount only if attendedKKAssembly is true/Yes
      const attended = yesNo(p.attendedKKAssembly);
      if ((attended === 'Yes' || attended === true) && p.attendanceCount && (!saved3.attendanceCount)) {
        saved3.attendanceCount = p.attendanceCount;
      }
      // Prefill reasonDidNotAttend only if attendedKKAssembly is No/false
      if ((attended === 'No' || attended === false) && p.reasonDidNotAttend && (!saved3.reasonDidNotAttend)) {
        saved3.reasonDidNotAttend = p.reasonDidNotAttend;
      }

      // Profile & signature images: copy remote URLs into sessionStorage so preview can render
      try {
        const profileUrl = p.profileImage || p.profileImagePath || p.profile_image || null;
        if (profileUrl && !saved3.profileImage) {
          saved3.profileImage = profileUrl;
          // derive a sensible filename
          try { saved3.profileImageName = saved3.profileImageName || (profileUrl.split('/').pop() || '').split('?')[0]; } catch (e) { /* ignore */ }
        }
        const sigUrl = p.signatureImagePath || p.signatureImage || p.signature || null;
        if (sigUrl && !saved3.signatureImage) {
          saved3.signatureImage = sigUrl;
          try { saved3.signatureImageName = saved3.signatureImageName || (sigUrl.split('/').pop() || '').split('?')[0]; } catch (e) { /* ignore */ }
        }
      } catch (e) { /* ignore image copy errors */ }

      try { sessionStorage.setItem('kkProfileStep3', JSON.stringify(saved3)); } catch (e) { /* ignore */ }

      // If we wrote remote images into sessionStorage, render them now (support http(s) URLs)
      try {
        if (saved3.profileImage) renderProfileImage(saved3.profileImage);
        if (saved3.signatureImage) renderSignatureImage(saved3.signatureImage);
      } catch (e) { /* ignore preview render errors */ }

      // Ensure dependent UI reflects prefilled values
      try {
        updateAttendanceVisibility();
      } catch (e) { /* ignore */ }
      try {
        const rsk = document.getElementById('registeredSKVoter');
        const voted = document.getElementById('votedLastSKElection');
        if (rsk) {
          // If registeredSKVoter is Yes, ensure votedLastSKElection is set to the prefilled value
          if (rsk.value === 'Yes' && voted && voted.value !== yesNo(p.votedLastSKElection)) {
            voted.value = yesNo(p.votedLastSKElection);
          }
          rsk.dispatchEvent(new Event('change'));
        }
      } catch (e) { /* ignore */ }
    } catch (err) {
      console.warn('Failed to fetch recent KK profile for youth:', err);
    }
  })();

  // Show/hide attendance related fields and toggle required attribute
  const attendedEl = document.getElementById('attendedKKAssembly');
  const attendanceCountEl = document.getElementById('attendanceCount');
  const reasonEl = document.getElementById('reasonDidNotAttend');

  const attendanceCountWrapper = attendanceCountEl ? (attendanceCountEl.closest('.form-group') || attendanceCountEl.parentElement) : null;
  const reasonWrapper = reasonEl ? (reasonEl.closest('.form-group') || reasonEl.parentElement) : null;

  function updateAttendanceVisibility() {
    try {
      if (!attendedEl) return;
      const val = String(attendedEl.value || '').trim();
      // When user answers 'Yes' → show attendance count
      if (val === 'Yes' || val === 'yes' || val === 'true') {
        if (attendanceCountWrapper) attendanceCountWrapper.style.display = 'block';
        if (attendanceCountEl) {
          attendanceCountEl.required = true;
          attendanceCountEl.setAttribute('aria-required', 'true');
          // restore saved value if available
          if (saved.attendanceCount) attendanceCountEl.value = saved.attendanceCount;
        }
        if (reasonWrapper) reasonWrapper.style.display = 'none';
        if (reasonEl) {
          reasonEl.value = '';
          reasonEl.required = false;
          reasonEl.removeAttribute('aria-required');
        }
      }
      // When user answers 'No' → show reason did not attend
      else if (val === 'No' || val === 'no' || val === 'false') {
        if (reasonWrapper) reasonWrapper.style.display = 'block';
        if (reasonEl) {
          reasonEl.required = true;
          reasonEl.setAttribute('aria-required', 'true');
          if (saved.reasonDidNotAttend) reasonEl.value = saved.reasonDidNotAttend;
        }
        if (attendanceCountWrapper) attendanceCountWrapper.style.display = 'none';
        if (attendanceCountEl) {
          attendanceCountEl.value = '';
          attendanceCountEl.required = false;
          attendanceCountEl.removeAttribute('aria-required');
        }
      } else {
        if (attendanceCountWrapper) attendanceCountWrapper.style.display = 'none';
        if (reasonWrapper) reasonWrapper.style.display = 'none';
        if (attendanceCountEl) { attendanceCountEl.required = false; attendanceCountEl.removeAttribute('aria-required'); attendanceCountEl.value = ''; }
        if (reasonEl) { reasonEl.required = false; reasonEl.removeAttribute('aria-required'); reasonEl.value = ''; }
      }
    } catch (e) { /* ignore */ }
  }

  // Initialize attendance visibility on load
  updateAttendanceVisibility();

  if (attendedEl) {
    attendedEl.addEventListener('change', function () {
      updateAttendanceVisibility();
      try { saveStep3(); } catch (e) { /* ignore */ }
    });
  }
  // Use centralized preview containers and restore existing saved images (if any)
  const profileImageInput = document.getElementById('profileImage');
  const signatureImageInput = document.getElementById('signatureImage');
  const profilePreviewWrapper = document.getElementById('imagePreviewContainerFront');
  const signaturePreviewWrapper = document.getElementById('imagePreviewContainerBack');

  // Ensure filename placeholders are hidden by default when there's no saved filename
  try {
    const profileFilenameEl = document.getElementById('profileImageFilename');
    if (profileFilenameEl) {
      if (saved.profileImageName) {
        profileFilenameEl.textContent = saved.profileImageName;
        profileFilenameEl.style.display = 'inline-block';
      } else {
        profileFilenameEl.textContent = '';
        profileFilenameEl.style.display = 'none';
      }
    }

    const signatureFilenameEl = document.getElementById('signatureImageFilename');
    if (signatureFilenameEl) {
      if (saved.signatureImageName) {
        signatureFilenameEl.textContent = saved.signatureImageName;
        signatureFilenameEl.style.display = 'inline-block';
      } else {
        signatureFilenameEl.textContent = '';
        signatureFilenameEl.style.display = 'none';
      }
    }
  } catch (e) {
    // ignore
  }

  // Restore previews from sessionStorage when page loads
  if (saved.profileImage) {
    // `renderProfileImage` will populate the preview area and attach remove handler
    renderProfileImage(saved.profileImage);
    // restore filename display if available
    try {
      const fd = document.getElementById('profileImageFilename');
      if (fd && saved.profileImageName) {
        fd.textContent = saved.profileImageName;
        fd.style.display = 'inline-block';
      } else if (fd) {
        fd.textContent = '';
        fd.style.display = 'none';
      }
    } catch (e) {}
  }
  if (saved.signatureImage) {
    renderSignatureImage(saved.signatureImage);
    try {
      const fd = document.getElementById('signatureImageFilename');
      if (fd && saved.signatureImageName) {
        fd.textContent = saved.signatureImageName;
        fd.style.display = 'inline-block';
      } else if (fd) {
        fd.textContent = '';
        fd.style.display = 'none';
      }
    } catch (e) {}
  }

  // If there is no saved image, hide the outer preview wrappers and remove buttons
  try {
    const removeBtnFront = document.getElementById('removeImageBtnFront');
    const removeBtnBack = document.getElementById('removeImageBtnBack');
    if (profilePreviewWrapper) profilePreviewWrapper.style.display = saved.profileImage ? 'block' : 'none';
    if (signaturePreviewWrapper) signaturePreviewWrapper.style.display = saved.signatureImage ? 'block' : 'none';
    if (removeBtnFront) removeBtnFront.style.display = saved.profileImage ? 'inline-block' : 'none';
    if (removeBtnBack) removeBtnBack.style.display = saved.signatureImage ? 'inline-block' : 'none';
  } catch (e) {
    // ignore
  }

  // Remove profile image handler
  const removeFront = document.getElementById('removeImageBtnFront');
  if (removeFront) {
    removeFront.addEventListener('click', function () {
      if (profileImageInput) profileImageInput.value = '';
      const current = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
      delete current.profileImage;
      // clear filename
      delete current.profileImageName;
      sessionStorage.setItem('kkProfileStep3', JSON.stringify(current));
      // Clear preview area and hide wrapper
      const preview = document.getElementById('profileImagePreview');
      if (preview) { preview.src = ''; preview.style.display = 'none'; }
      if (profilePreviewWrapper) profilePreviewWrapper.style.display = 'none';
      this.style.display = 'none';
        const filenameDisplay = document.getElementById('profileImageFilename');
        if (filenameDisplay) { filenameDisplay.textContent = ''; filenameDisplay.style.display = 'none'; }
    });
  }

  // Remove signature image handler
  const removeBack = document.getElementById('removeImageBtnBack');
  if (removeBack) {
    removeBack.addEventListener('click', function () {
      if (signatureImageInput) signatureImageInput.value = '';
      const current = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
      delete current.signatureImage;
      // clear filename
      delete current.signatureImageName;
      sessionStorage.setItem('kkProfileStep3', JSON.stringify(current));
      const preview = document.getElementById('signatureImagePreview');
      if (preview) { preview.src = ''; preview.style.display = 'none'; }
      if (signaturePreviewWrapper) signaturePreviewWrapper.style.display = 'none';
      this.style.display = 'none';
         const filenameDisplay = document.getElementById('signatureImageFilename');
         if (filenameDisplay) { filenameDisplay.textContent = ''; filenameDisplay.style.display = 'none'; }
    });
  }


  const youthForm = document.getElementById('youthForm');

  // 🔹 Autosave on any input change (guard existence)
  if (youthForm && typeof saveStep3 === 'function') {
    youthForm.addEventListener('input', saveStep3);
  }

  // Save step3 data including specificNeedType
  function saveStep3() {
    // Use the hidden field for submission because the visible select is disabled
    const yVal = (document.getElementById('youthAgeGroup_hidden') && document.getElementById('youthAgeGroup_hidden').value) || (document.getElementById('youthAgeGroup') && document.getElementById('youthAgeGroup').value) || '';
    // keep the visible select in sync (in case code changes it elsewhere)
    try { const yg = document.getElementById('youthAgeGroup'); if (yg) yg.value = yVal; } catch (e) {}

    // helper to safely get element value
    function val(id) {
      try { return (document.getElementById(id) && document.getElementById(id).value) || ''; } catch (e) { return ''; }
    }

    const step3Data = {
      youthAgeGroup: yVal,
      youthClassification: val('youthClassification'),
      educationalBackground: val('educationalBackground'),
      workStatus: val('workStatus'),
      specificNeedType: val('specificNeedType'),
      registeredSKVoter: val('registeredSKVoter'),
      registeredNationalVoter: val('registeredNationalVoter'),
      votedLastSKElection: val('votedLastSKElection'),
      attendedKKAssembly: val('attendedKKAssembly'),
      attendanceCount: val('attendanceCount'),
      reasonDidNotAttend: val('reasonDidNotAttend')
    };

    // Keep existing saved images
    const existing = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
    if (existing.profileImage) {
      step3Data.profileImage = existing.profileImage;
    }
    if (existing.signatureImage) {
      step3Data.signatureImage = existing.signatureImage;
    }
    // Keep existing saved filenames
    if (existing.profileImageName) step3Data.profileImageName = existing.profileImageName;
    if (existing.signatureImageName) step3Data.signatureImageName = existing.signatureImageName;

    sessionStorage.setItem('kkProfileStep3', JSON.stringify(step3Data));
  }

  // ✅ Automatically restore educational background value from sessionStorage
  const educationalBackground = document.getElementById('educationalBackground');

  // Restore saved value
  if (educationalBackground && saved.educationalBackground) {
    educationalBackground.value = saved.educationalBackground;
  }

  // Save value when changed
  if (educationalBackground) {
    educationalBackground.addEventListener('change', function () {
      const current = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
      current.educationalBackground = this.value;
      sessionStorage.setItem('kkProfileStep3', JSON.stringify(current));
    });
  }

  // 🔹 Helper: Convert Base64 -> File
  function base64ToFile(base64, filename) {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  // Final submit
  

  // Navigation (hamburger + nav button handlers) is centralized in `navbar.js`.
  // This page no longer attaches its own nav handlers; `navbar.js` will call
  // `window.checkAndPromptEducReapply` when needed.

  // Embed educRejected helper so this page can prompt to reapply if needed
  (function () {
    async function getJsonSafe(res) { try { return await res.json(); } catch (e) { return null; } }

    async function checkAndPromptEducReapply(opts = {}) {
      const {
        event,
        redirectUrl = 'Educational-assistance-user.html',
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
          if (res2 && res2.isConfirmed) { window.location.href = `./confirmation/html/educConfirmation.html`; return { redirected: true, isRejected, hasProfile, isFormOpen }; }
        }

        return { redirected: false, isRejected, hasProfile, isFormOpen };
      } catch (err) {
        console.error('checkAndPromptEducReapply error', err);
        return { redirected: false, isRejected: false, hasProfile: false, isFormOpen: false };
      }
    }

    window.checkAndPromptEducReapply = checkAndPromptEducReapply;
  })();

  // When submitting the form
  const form = document.getElementById('youthForm');
  // Disable browser native validation so our custom SweetAlert workflow always runs
  if (form) form.noValidate = true;
  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Always save before confirmation
    saveStep3();

    // Validate required fields (we disabled browser validation above)
    try {
      const requiredIds = [
        'youthAgeGroup', 'youthClassification', 'educationalBackground', 'workStatus',
        'registeredSKVoter', 'registeredNationalVoter', 'votedLastSKElection', 'attendedKKAssembly'
      ];
      for (const id of requiredIds) {
        const el = document.getElementById(id);
        if (el && String(el.value || '').trim() === '') {
          await Swal.fire({
            title: 'Missing Field',
            text: 'Please fill out all required fields before submitting.',
            icon: 'warning',
            showConfirmButton: true,
            confirmButtonText: 'OK'
          });
          return;
        }
      }
    } catch (e) { /* ignore */ }

    // Conditional requirement: if user answered they attended KK Assembly,
    // require `attendanceCount`. If they did NOT attend, require `reasonDidNotAttend`.
    try {
      const attendedEl = document.getElementById('attendedKKAssembly');
      const attendedVal = attendedEl ? String(attendedEl.value || '').trim().toLowerCase() : '';
      if (attendedVal === 'yes') {
        const attendanceCountEl = document.getElementById('attendanceCount');
        const countVal = attendanceCountEl ? String(attendanceCountEl.value || '').trim() : '';
        if (!countVal) {
          await Swal.fire({
            title: 'Missing Field',
            text: 'Please indicate how many times you attended KK Assembly.',
            icon: 'warning',
            showConfirmButton: true,
            confirmButtonText: 'OK'
          });
          return;
        }
      } else if (attendedVal === 'no') {
        const reasonEl = document.getElementById('reasonDidNotAttend');
        const reasonVal = reasonEl ? String(reasonEl.value || '').trim() : '';
        if (!reasonVal) {
          await Swal.fire({
            title: 'Missing Field',
            text: 'Please provide a reason why you did not attend KK Assembly.',
            icon: 'warning',
            showConfirmButton: true,
            confirmButtonText: 'OK'
          });
          return;
        }
      }
    } catch (e) { /* ignore conditional validation errors */ }

    // SweetAlert confirmation before actual submit
    const result = await Swal.fire({
      title: "Are you sure?",
      text: 'Are you sure you want to submit your profile? Please confirm that all information is correct.',
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes",
      cancelButtonText: "Cancel",
      confirmButtonColor: '#0A2C59',
      cancelButtonColor: "#d33",
    });

    if (!result.isConfirmed) return;

    // Check if profile image is present (either in file input or sessionStorage)
    const hasImage = form.profileImage.files.length > 0 || (JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}').profileImage);

    if (!hasImage) {
      await Swal.fire({
        title: 'Missing Image',
        text: 'Please upload a profile image before submitting.',
        icon: 'warning',
        showConfirmButton: true,
        confirmButtonText: 'OK'
      });
      return;
    }

    // Show loading SweetAlert after confirmation and after validation
    Swal.fire({
      title: "Submitting...",
      text: "Please wait...",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      }
    });

    // Collect all data from sessionStorage and this page
    const step1 = JSON.parse(sessionStorage.getItem('kkProfileStep1') || '{}');
    const step2 = JSON.parse(sessionStorage.getItem('kkProfileStep2') || '{}');
    const step3 = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');

    // In your submit handler, after loading step3:
    const booleanFields = [
      'registeredSKVoter',
      'registeredNationalVoter',
      'votedLastSKElection',
      'attendedKKAssembly'
    ];

    booleanFields.forEach(field => {
      if (field in step3) {
        step3[field] = step3[field] === 'Yes' ? true
                      : step3[field] === 'No' ? false
                      : '';
      }
    });

    // Validate image presence
    if (
      form.profileImage.files.length === 0 &&
      !step3.profileImage
    ) {
      Swal.close();
      await Swal.fire("Missing Image", "Please upload a profile image before submitting.", "warning");
      return;
    }

    // Check if signature image is present (either in file input or sessionStorage)
    const hasSignature =
      form.signatureImage.files.length > 0 ||
      (JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}').signatureImage);

    if (!hasSignature) {
      Swal.close();
      await Swal.fire("Missing Signature", "Please upload a signature image before submitting.", "warning");
      return;
    }

    const formData = new FormData();

    // Step 1
    Object.entries(step1).forEach(([k, v]) => formData.append(k, v));
    // Step 2
    Object.entries(step2).forEach(([k, v]) => formData.append(k, v));
    // Step 3 (excluding profileImage)
    Object.entries(step3).forEach(([k, v]) => {
      // Only send attendanceCount if attended
      if (k === 'attendanceCount' && step3.attendedKKAssembly) {
        formData.append(k, v);
      }
      // Only send reasonDidNotAttend if NOT attended
      else if (k === 'reasonDidNotAttend' && !step3.attendedKKAssembly) {
        formData.append(k, v);
      }
      // Send other fields
      else if (k !== 'profileImage' && k !== 'attendanceCount' && k !== 'reasonDidNotAttend') {
        formData.append(k, v);
      }
    });

    // Add actual image file if selected
    if (form.profileImage.files.length > 0) {
      formData.append('profileImage', form.profileImage.files[0]);
    } else if (step3.profileImage) {
      // Fallback: support remote URLs or base64 data URLs stored in sessionStorage
      try {
        const imgVal = step3.profileImage;
        if (/^https?:\/\//i.test(imgVal)) {
          const filename = step3.profileImageName || (imgVal.split('/').pop() || 'profile.jpg').split('?')[0];
          const resp = await fetch(imgVal);
          const blob = await resp.blob();
          const file = new File([blob], filename, { type: blob.type || 'image/jpeg' });
          formData.append('profileImage', file);
        } else if (String(imgVal).startsWith('data:')) {
          const file = base64ToFile(imgVal, step3.profileImageName || 'profile.png');
          formData.append('profileImage', file);
        }
      } catch (e) {
        console.debug('kkform-youth: failed to attach profile image from sessionStorage', e);
      }
    }

    // Add signature image file if selected
    if (form.signatureImage && form.signatureImage.files.length > 0) {
      formData.append('signatureImage', form.signatureImage.files[0]);
    } else if (step3.signatureImage) {
      try {
        const imgVal = step3.signatureImage;
        if (/^https?:\/\//i.test(imgVal)) {
          const filename = step3.signatureImageName || (imgVal.split('/').pop() || 'signature.png').split('?')[0];
          const resp = await fetch(imgVal);
          const blob = await resp.blob();
          const file = new File([blob], filename, { type: blob.type || 'image/png' });
          formData.append('signatureImage', file);
        } else if (String(imgVal).startsWith('data:')) {
          const file = base64ToFile(imgVal, step3.signatureImageName || 'signature.png');
          formData.append('signatureImage', file);
        }
      } catch (e) {
        console.debug('kkform-youth: failed to attach signature image from sessionStorage', e);
      }
    }

    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const response = await fetch(`${API_BASE}/api/kkprofiling`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      });
      // Close loading
      Swal.close();

      // Try to parse JSON body (if any) to show helpful error messages
      let body = null;
      try { body = await response.json(); } catch (e) { try { body = await response.text(); } catch (_) { body = null; } }

      if (response.ok) {
        // Try to update user name fields on the backend so /api/users/me reflects submitted names
        try {
          const token = sessionStorage.getItem('token') || localStorage.getItem('token');
          if (token && step1) {
            const namesPayload = {
              lastname: step1.lastname || step1.lastName || '',
              firstname: step1.firstname || step1.firstName || '',
              middlename: step1.middlename || step1.middleName || ''
            };
            if (namesPayload.lastname || namesPayload.firstname || namesPayload.middlename) {
              await fetch(`${API_BASE}/api/users/me`, {
                method: 'PATCH',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(namesPayload)
              }).catch(() => {});
            }
          }
        } catch (e) { /* ignore update errors */ }

        await Swal.fire({
          title: "Submitted!",
          text: "Form submitted successfully!",
          icon: "success",
          showConfirmButton: true,
          confirmButtonText: "OK",
          allowOutsideClick: false,
        });

        // Remove sessionStorage data for all steps before redirecting
        try {
          sessionStorage.removeItem('kkProfileStep1');
          sessionStorage.removeItem('kkProfileStep2');
          sessionStorage.removeItem('kkProfileStep3');
        } catch (e) {
          // ignore storage errors
        }

        // Redirect to the confirmation page
        window.location.href = '../../html/user/confirmation/html/kkcofirmation.html';
        return;
      }

      // Non-OK: show helpful message including status and backend body when available
      console.error('kkform-youth submit failed', { status: response.status, body });

      if (response.status === 409) {
        await Swal.fire("Already Submitted", "You already submitted a KKProfile for this cycle.", "error");
        return;
      }

      if (response.status === 403) {
        const msg = (body && (body.error || body.message)) || 'You are not eligible to submit this form due to access/age restrictions.';
        await Swal.fire({ icon: 'error', title: 'Not Eligible', text: msg, confirmButtonColor: '#0A2C59' });
        return;
      }

      // For validation or other server errors, display server-provided details when available
      const serverMsg = (body && (body.error || body.message)) || (typeof body === 'string' ? body : null) || `Server responded with status ${response.status}`;
      await Swal.fire({ icon: 'error', title: 'Submission Failed', text: serverMsg });
    } catch (error) {
      // Network or unexpected error
      console.error('kkform-youth network/exception during submit', error);
      Swal.close();
      await Swal.fire({ icon: 'error', title: 'Submission Error', text: `Failed to submit form: ${error && error.message ? error.message : 'Network or unexpected error'}` });
    }
  });

  document.getElementById('previousBtn')?.addEventListener('click', function(e) {
    saveStep3(); // Save all current values to sessionStorage
    // Optionally, navigate to the previous page here:
    // window.location.href = 'your-previous-page.html';
  });

  const customUploadBtn = document.getElementById('customUploadBtn');
  if (customUploadBtn) {
    customUploadBtn.addEventListener('click', function() {
      const p = document.getElementById('profileImage');
      if (p) p.click();
    });
  }

  const profileImageEl = document.getElementById('profileImage');
  if (profileImageEl) {
    profileImageEl.addEventListener('change', function () {
      const file = this.files[0];
      const allowedTypes = ['image/png', 'image/jpeg']; // Allowed file types
      // Display filename element
      const filenameDisplay = document.getElementById('profileImageFilename');
      const imgEl = document.getElementById('profileImagePreview');
      const outer = document.getElementById('imagePreviewContainerFront');
      const removeStatic = document.getElementById('removeImageBtnFront');

      if (file) {
        // Validate file type
        if (!allowedTypes.includes(file.type)) {
          Swal.fire({
            icon: 'error',
            title: 'Invalid File Type',
            text: 'Only PNG and JPG files are allowed.',
            confirmButtonText: 'OK',
            confirmButtonColor: '#0A2C59',
          });

          // Automatically remove invalid file
          this.value = ''; // Clear the file input
          if (imgEl) imgEl.src = '';
          if (outer) outer.style.display = 'none';
          if (removeStatic) removeStatic.style.display = 'none';
          return; // Stop further processing
        }

        // File is valid, show the preview
        const reader = new FileReader();
        reader.onload = function (e) {
          renderProfileImage(e.target.result);
          // Save the filename separately so it can be shown after reload
          try {
            const current = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
            current.profileImageName = file.name;
            sessionStorage.setItem('kkProfileStep3', JSON.stringify(current));
            if (filenameDisplay) { filenameDisplay.textContent = file.name; filenameDisplay.style.display = 'inline-block'; }
          } catch (e) {}
        };
        reader.readAsDataURL(file);
      } else {
        // Clear the preview if no file is selected
        if (imgEl) imgEl.src = '';
        if (outer) outer.style.display = 'none';
        if (removeStatic) removeStatic.style.display = 'none';
        const filenameDisplay = document.getElementById('profileImageFilename');
        if (filenameDisplay) { filenameDisplay.textContent = ''; filenameDisplay.style.display = 'none'; }
      }
    });
  }

  function renderProfileImage(imgSrc) {
    const imgEl = document.getElementById('profileImagePreview');
    const outer = document.getElementById('imagePreviewContainerFront');
    const removeStatic = document.getElementById('removeImageBtnFront');

    const isData = typeof imgSrc === 'string' && imgSrc.startsWith('data:image/');
    const isRemote = typeof imgSrc === 'string' && /^https?:\/\//i.test(imgSrc);

    if (!isData && !isRemote) {
      const current = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
      delete current.profileImage;
      sessionStorage.setItem('kkProfileStep3', JSON.stringify(current));
      if (imgEl) imgEl.src = '';
      if (outer) outer.style.display = 'none';
      if (removeStatic) removeStatic.style.display = 'none';
      return;
    }

    if (imgEl) {
      imgEl.src = imgSrc;
      imgEl.style.display = 'block';
      imgEl.style.cursor = 'pointer';
      imgEl.onclick = function () {
        Swal.fire({ imageUrl: imgSrc, imageAlt: 'Profile Image', showConfirmButton: false, showCloseButton: true, width: 400 });
      };
    }
    if (outer) outer.style.display = 'block';
    if (removeStatic) removeStatic.style.display = 'inline-block';

    // Save to sessionStorage so it persists across navigation
    const current = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
    current.profileImage = imgSrc;
    sessionStorage.setItem('kkProfileStep3', JSON.stringify(current));
    // Restore filename display if present
    const filenameDisplay = document.getElementById('profileImageFilename');
    if (filenameDisplay && current.profileImageName) { filenameDisplay.textContent = current.profileImageName; filenameDisplay.style.display = 'inline-block'; }
    else if (filenameDisplay) { filenameDisplay.textContent = ''; filenameDisplay.style.display = 'none'; }
  }

  // Signature image
  const signatureEl = document.getElementById('signatureImage');
  if (signatureEl) {
    signatureEl.addEventListener('change', function () {
      const file = this.files[0];
      const allowedTypes = ['image/png', 'image/jpeg'];
      const filenameDisplay = document.getElementById('signatureImageFilename');
      const imgEl = document.getElementById('signatureImagePreview');
      const outer = document.getElementById('imagePreviewContainerBack');
      const removeStatic = document.getElementById('removeImageBtnBack');

      if (file) {
        if (!allowedTypes.includes(file.type)) {
          Swal.fire({ icon: 'error', title: 'Invalid File Type', text: 'Only PNG and JPG files are allowed.', confirmButtonText: 'OK', confirmButtonColor: '#0A2C59' });
          this.value = '';
          if (imgEl) imgEl.src = '';
          if (outer) outer.style.display = 'none';
          if (removeStatic) removeStatic.style.display = 'none';
          return;
        }
        const reader = new FileReader();
        reader.onload = function (e) {
          renderSignatureImage(e.target.result);
          try {
            const current = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
            current.signatureImageName = file.name;
            sessionStorage.setItem('kkProfileStep3', JSON.stringify(current));
            if (filenameDisplay) { filenameDisplay.textContent = file.name; filenameDisplay.style.display = 'inline-block'; }
          } catch (e) {}
        };
        reader.readAsDataURL(file);
      } else {
        if (imgEl) imgEl.src = '';
        if (outer) outer.style.display = 'none';
        if (removeStatic) removeStatic.style.display = 'none';
        const filenameDisplay = document.getElementById('signatureImageFilename');
        if (filenameDisplay) { filenameDisplay.textContent = ''; filenameDisplay.style.display = 'none'; }
      }
    });
  }

  function renderSignatureImage(imgSrc) {
    const imgEl = document.getElementById('signatureImagePreview');
    const outer = document.getElementById('imagePreviewContainerBack');
    const removeStatic = document.getElementById('removeImageBtnBack');

    const isData = typeof imgSrc === 'string' && imgSrc.startsWith('data:image/');
    const isRemote = typeof imgSrc === 'string' && /^https?:\/\//i.test(imgSrc);

    if (!isData && !isRemote) {
      const current = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
      delete current.signatureImage;
      sessionStorage.setItem('kkProfileStep3', JSON.stringify(current));
      if (imgEl) imgEl.src = '';
      if (outer) outer.style.display = 'none';
      if (removeStatic) removeStatic.style.display = 'none';
      return;
    }

    if (imgEl) {
      imgEl.src = imgSrc;
      imgEl.style.display = 'block';
      imgEl.style.cursor = 'pointer';
      imgEl.onclick = function () { Swal.fire({ imageUrl: imgSrc, imageAlt: 'Signature Image', showConfirmButton: false, showCloseButton: true, width: 400 }); };
    }
    if (outer) outer.style.display = 'block';
    if (removeStatic) removeStatic.style.display = 'inline-block';

    const current = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
    current.signatureImage = imgSrc;
    sessionStorage.setItem('kkProfileStep3', JSON.stringify(current));
    const filenameDisplay = document.getElementById('signatureImageFilename');
    if (filenameDisplay && current.signatureImageName) { filenameDisplay.textContent = current.signatureImageName; filenameDisplay.style.display = 'inline-block'; }
    else if (filenameDisplay) { filenameDisplay.textContent = ''; filenameDisplay.style.display = 'none'; }
  }

  const customSignatureBtn = document.getElementById('customSignatureBtn');
  if (customSignatureBtn) {
    customSignatureBtn.addEventListener('click', function() {
      const s = document.getElementById('signatureImage');
      if (s) s.click();
    });
  }

  // Add this event listener to handle the change for registeredSKVoter
  const registeredSKVoter = document.getElementById('registeredSKVoter');
  const votedLastSKElection = document.getElementById('votedLastSKElection');

  if (registeredSKVoter) {
    registeredSKVoter.addEventListener('change', function() {
      if (this.value === 'No') {
        votedLastSKElection.value = 'No'; // Automatically set to No
        votedLastSKElection.disabled = true; // Disable the field
      } else {
        votedLastSKElection.disabled = false; // Enable the field if registered
      }
    });

    // Initial check to set the state based on the current value
    if (registeredSKVoter.value === 'No') {
      votedLastSKElection.value = 'No';
      votedLastSKElection.disabled = true;
    } else {
      votedLastSKElection.disabled = false;
    }
  }

  const registeredNationalVoter = document.getElementById('registeredNationalVoter');
  const birthdayInput = document.getElementById('birthday'); // Assuming there's a birthday input field

  function enforceRegisteredNationalVoterByAgeFromBirthday(bdayValue) {
    try {
      if (!registeredNationalVoter) return;
      if (!bdayValue) return;
      const birthday = new Date(bdayValue);
      if (isNaN(birthday.getTime())) return;
      const today = new Date();
      let age = today.getFullYear() - birthday.getFullYear();
      const monthDiff = today.getMonth() - birthday.getMonth();
      const dayDiff = today.getDate() - birthday.getDate();
      if (monthDiff < 0 || (monthDiff === 0 && dayDiff < 0)) age--;
      if (age <= 17) {
        // Force-select 'No' option if present, otherwise set value and ensure UI shows it
        try {
          const opts = Array.from(registeredNationalVoter.options || []);
          const noOpt = opts.find(o => (o.value||'').toString().toLowerCase() === 'no');
          if (noOpt) registeredNationalVoter.value = noOpt.value;
          else {
            // fallback: create temporary option
            let injected = registeredNationalVoter.querySelector('option[data-injected-no="1"]');
            if (!injected) {
              injected = document.createElement('option');
              injected.value = 'No';
              injected.text = 'No';
              injected.setAttribute('data-injected-no','1');
              registeredNationalVoter.insertBefore(injected, registeredNationalVoter.firstChild);
            }
            // select it
            for (let i = 0; i < registeredNationalVoter.options.length; i++) {
              if (registeredNationalVoter.options[i].getAttribute('data-injected-no') === '1') { registeredNationalVoter.selectedIndex = i; break; }
            }
          }
        } catch (e) {
          registeredNationalVoter.value = 'No';
        }
        registeredNationalVoter.disabled = true;
      } else {
        registeredNationalVoter.disabled = false;
        // remove injected option if present
        const injected = registeredNationalVoter.querySelector('option[data-injected-no="1"]');
        if (injected) injected.remove();
      }
    } catch (e) { /* ignore */ }
  }

  // If we have a registeredNationalVoter select, prefer calculating age from a local birthday input.
  if (registeredNationalVoter) {
    // If there is a birthday input on this page, hook it up
    if (birthdayInput) {
      // Add an event listener to check the age when the birthday changes
      birthdayInput.addEventListener('change', function () { enforceRegisteredNationalVoterByAgeFromBirthday(this.value); });

      // Initial check to set the state based on the current value of birthday
      if (birthdayInput.value) enforceRegisteredNationalVoterByAgeFromBirthday(birthdayInput.value);
    } else {
      // No birthday input on this page — try retrieving saved birthday from sessionStorage (kkProfileStep1)
      try {
        const step1 = JSON.parse(sessionStorage.getItem('kkProfileStep1') || '{}');
        if (step1 && step1.birthday) enforceRegisteredNationalVoterByAgeFromBirthday(step1.birthday);
      } catch (e) { /* ignore */ }
    }
  }
});