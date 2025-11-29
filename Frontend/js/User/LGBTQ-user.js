document.addEventListener("DOMContentLoaded", () => {

  if (typeof window !== 'undefined' && typeof window.initNavbarHamburger === 'function') {
    try { 
      window.initNavbarHamburger(); 
    } catch (e) {
       /* ignore */ 
      }
  } 


  // runtime-configurable API base. In production inject `window.API_BASE = 'https://sk-insight.online'`.
  const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
    ? window.API_BASE
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : 'https://sk-insight.online';
  // if (!validateTokenAndRedirect("LGBTQ+ Form")) {
  //   return;
  // }
  
  const form = document.getElementById("lgbtqForm");
  const birthdayInput = document.getElementById("birthday");
  const submitBtn = document.getElementById("submitBtn");

  if (!form) {
    console.error("❌ No form found!");
    return;
  }

  // Get token
  const token = sessionStorage.getItem("token") || localStorage.getItem("token");

  // --- SessionStorage draft key ---
  const DRAFT_KEY = 'lgbtqDraft';

  // Restore draft if present (persists across reloads, cleared on tab close)
  const savedDraft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
  if (savedDraft && Object.keys(savedDraft).length) {
    try {
      // Fill simple inputs
      for (const [k, v] of Object.entries(savedDraft)) {
        if (!v) continue;
        const el = document.getElementById(k);
        if (!el) continue;
        // For file/image previews we set src elsewhere
        if (el.type === 'file') continue;
        if (el.tagName === 'SELECT' || el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
          el.value = v;
        }
      }

        // Ensure filename placeholders are hidden when there's no image/file
        (function initFilenamePlaceholders() {
          try {
            const inputs = ['idImageFront','idImageBack','profileImage','signatureImage'];
            inputs.forEach(inputId => {
              const fileInput = document.getElementById(inputId);
              const filenameEl = document.getElementById(`${inputId}Filename`);
              const previewImg = document.getElementById((inputId === 'idImageFront' ? 'imagePreviewFront' : inputId === 'idImageBack' ? 'imagePreviewBack' : inputId === 'profileImage' ? 'imagePreviewProfile' : 'imagePreviewSignature'));

              const hasFile = (fileInput && fileInput.files && fileInput.files.length > 0);
              const hasPreview = (previewImg && previewImg.src && previewImg.src.trim() !== '');
              const saved = (savedDraft && (savedDraft[`${inputId}Name`] || savedDraft[inputId]));

              if (filenameEl) {
                if (hasFile || hasPreview || saved) {
                  filenameEl.classList.add('visible');
                  // if there's a saved name, fill it
                  if (!filenameEl.textContent && savedDraft && savedDraft[`${inputId}Name`]) filenameEl.textContent = savedDraft[`${inputId}Name`];
                } else {
                  filenameEl.textContent = '';
                  filenameEl.classList.remove('visible');
                }
              }
            });
          } catch (e) { /* ignore */ }
        })();

      // Restore image previews if base64 saved
      if (savedDraft.idImageFront) {
        const preview = document.getElementById('imagePreviewFront');
        const container = document.getElementById('imagePreviewContainerFront');
        if (preview && container) { preview.src = savedDraft.idImageFront; preview.style.display = 'block'; container.style.display = 'block'; }
      }
      if (savedDraft.idImageBack) {
        const preview = document.getElementById('imagePreviewBack');
        const container = document.getElementById('imagePreviewContainerBack');
        if (preview && container) { preview.src = savedDraft.idImageBack; preview.style.display = 'block'; container.style.display = 'block'; }
      }
      if (savedDraft.profileImage) {
        const preview = document.getElementById('imagePreviewProfile');
        const container = document.getElementById('imagePreviewContainerProfile');
        if (preview && container) { preview.src = savedDraft.profileImage; preview.style.display = 'block'; container.style.display = 'block'; }
      }
      if (savedDraft.signatureImage) {
        const preview = document.getElementById('imagePreviewSignature');
        const container = document.getElementById('imagePreviewContainerSignature');
        if (preview && container) { preview.src = savedDraft.signatureImage; preview.style.display = 'block'; container.style.display = 'block'; }
      }
      // Restore saved filenames (if any) and show filename elements
      try {
        const frontNameEl = document.getElementById('idImageFrontFilename');
        if (frontNameEl) {
          if (savedDraft.idImageFrontName) { frontNameEl.textContent = savedDraft.idImageFrontName; frontNameEl.classList.add('visible'); }
          else { frontNameEl.textContent = ''; frontNameEl.classList.remove('visible'); }
        }
        const backNameEl = document.getElementById('idImageBackFilename');
        if (backNameEl) {
          if (savedDraft.idImageBackName) { backNameEl.textContent = savedDraft.idImageBackName; backNameEl.classList.add('visible'); }
          else { backNameEl.textContent = ''; backNameEl.classList.remove('visible'); }
        }
      } catch (e) { /* ignore */ }
    } catch (e) {
      console.warn('Failed to restore LGBTQ draft:', e);
    }
  }

  // Save current form state into sessionStorage
  function saveDraft() {
    try {
      const draft = {};
      const els = form.querySelectorAll('input, select, textarea');
      els.forEach(el => {
        if (!el.id) return;
        if (el.type === 'file') return; // files handled separately as base64
        draft[el.id] = el.value;
      });
      // Preserve existing base64 images if present
      const existing = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
      draft.idImageFront = existing.idImageFront || document.getElementById('imagePreviewFront')?.src || '';
      draft.idImageBack = existing.idImageBack || document.getElementById('imagePreviewBack')?.src || '';
      draft.profileImage = existing.profileImage || document.getElementById('imagePreviewProfile')?.src || '';
      draft.signatureImage = existing.signatureImage || document.getElementById('imagePreviewSignature')?.src || '';
      // Preserve filenames so they survive reloads
      draft.idImageFrontName = existing.idImageFrontName || document.getElementById('idImageFront')?.files?.[0]?.name || '';
      draft.idImageBackName = existing.idImageBackName || document.getElementById('idImageBack')?.files?.[0]?.name || '';
      draft.profileImageName = existing.profileImageName || document.getElementById('profileImage')?.files?.[0]?.name || '';
      draft.signatureImageName = existing.signatureImageName || document.getElementById('signatureImage')?.files?.[0]?.name || '';
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Failed to save LGBTQ draft:', e);
    }
  }

  // Hook into form changes
  form.addEventListener('input', saveDraft);
  form.addEventListener('change', saveDraft);

  // Autofill birthday and name fields from /api/users/me when token is available
  if (token && birthdayInput) {
    fetch(`${API_BASE}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : null))
      .then((user) => {
        if (!user) return;

        // Populate birthday if available and the field is empty
        if (user.birthday) {
          try {
            const d = new Date(user.birthday);
            if (d && !isNaN(d.getTime()) && (!birthdayInput.value || birthdayInput.value === '')) {
              birthdayInput.value = `${d.getFullYear()}-${String(
                d.getMonth() + 1
              ).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            }
          } catch (e) { /* ignore */ }
        }

        // Populate name fields if empty (do not overwrite existing/drafted values)
        try {
          // Support multiple possible id names used across templates
          const lastnameEl = document.getElementById('lastname') || document.getElementById('lastName') || document.getElementById('surname');
          const firstnameEl = document.getElementById('firstname') || document.getElementById('firstName');
          const middlenameEl = document.getElementById('middlename') || document.getElementById('middleName');
          const suffixEl = document.getElementById('suffix');

          if (lastnameEl && (!lastnameEl.value || lastnameEl.value === '')) {
            lastnameEl.value = user.lastname || user.surname || user.lastName || '';
          }
          if (firstnameEl && (!firstnameEl.value || firstnameEl.value === '')) {
            firstnameEl.value = user.firstname || user.firstName || user.givenName || '';
          }
          if (middlenameEl && (!middlenameEl.value || middlenameEl.value === '')) {
            middlenameEl.value = user.middlename || user.middleName || '';
          }
          if (suffixEl && (!suffixEl.value || suffixEl.value === '')) {
            suffixEl.value = user.suffix || '';
          }
        } catch (e) { /* ignore DOM errors */ }
      })
      .catch((err) => console.error("❌ Fetch me error:", err));

    // Also fetch the user's most recent profile (active cycle or fallback)
    // and populate only editable/changeable fields so users don't re-enter
    // information that doesn't change often. We respect any existing draft
    // in sessionStorage (do not overwrite draft values).
    (async () => {
      try {
        const resp = await fetch(`${API_BASE}/api/lgbtqprofiling/me/recent`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!resp.ok) return;
        const recent = await resp.json().catch(() => null);
        if (!recent) return;

        // support both { profile, isForActiveCycle } and plain profile responses
        const p = recent.profile || recent;
        if (!p) return;

        // Only populate if user has no draft for the editable fields
        const existingDraft = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
        let didPopulate = false;

        // sexAssignedAtBirth -> select#sex
        try {
          const sexEl = document.getElementById('sex');
          if (sexEl && (!existingDraft.sex && (!sexEl.value || sexEl.value === ''))) {
            if (p.sexAssignedAtBirth) { sexEl.value = p.sexAssignedAtBirth; didPopulate = true; }
          }
        } catch (e) { /* ignore DOM errors */ }

        // lgbtqClassification -> select#identity
        try {
          const identityEl = document.getElementById('identity');
          if (identityEl && (!existingDraft.identity && (!identityEl.value || identityEl.value === ''))) {
            if (p.lgbtqClassification) { identityEl.value = p.lgbtqClassification; didPopulate = true; }
          }
        } catch (e) { /* ignore DOM errors */ }

        // ID images: show previous uploaded images as previews (user can replace them)
        try {
          if (p.idImageFront) {
            const preview = document.getElementById('imagePreviewFront');
            const container = document.getElementById('imagePreviewContainerFront');
            const nameEl = document.getElementById('idImageFrontFilename');
            if (preview && container) {
              if (!existingDraft.idImageFront) {
                preview.src = p.idImageFront;
                preview.style.display = 'block';
                container.style.display = 'block';
                // derive filename from URL when possible
                let derivedName = 'Previously uploaded';
                try {
                  if (typeof p.idImageFront === 'string' && /^https?:\/\//i.test(p.idImageFront)) {
                    derivedName = (p.idImageFront.split('/').pop() || '').split('?')[0] || derivedName;
                  }
                } catch (e) { /* ignore */ }
                if (nameEl) { nameEl.textContent = derivedName; nameEl.classList.add('visible'); }
                // store into draft so it's preserved on reload but can be overwritten by user
                const save = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
                if (!save.idImageFront) { save.idImageFront = p.idImageFront; save.idImageFrontName = derivedName; sessionStorage.setItem(DRAFT_KEY, JSON.stringify(save)); }
                didPopulate = true;
              }
            }
          }
        } catch (e) { /* ignore preview issues */ }

        try {
          if (p.idImageBack) {
            const preview = document.getElementById('imagePreviewBack');
            const container = document.getElementById('imagePreviewContainerBack');
            const nameEl = document.getElementById('idImageBackFilename');
            if (preview && container) {
              if (!existingDraft.idImageBack) {
                preview.src = p.idImageBack;
                preview.style.display = 'block';
                container.style.display = 'block';
                // derive filename from URL when possible
                let derivedName = 'Previously uploaded';
                try {
                  if (typeof p.idImageBack === 'string' && /^https?:\/\//i.test(p.idImageBack)) {
                    derivedName = (p.idImageBack.split('/').pop() || '').split('?')[0] || derivedName;
                  }
                } catch (e) { /* ignore */ }
                if (nameEl) { nameEl.textContent = derivedName; nameEl.classList.add('visible'); }
                const save = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
                if (!save.idImageBack) { save.idImageBack = p.idImageBack; save.idImageBackName = derivedName; sessionStorage.setItem(DRAFT_KEY, JSON.stringify(save)); }
                didPopulate = true;
              }
            }
          }
        } catch (e) { /* ignore preview issues */ }

        // If we populated any editable field, show an informational alert with cycle info
        try {
          if (didPopulate) {
            const cycle = p.formCycle || (recent.profile && recent.profile.formCycle) || null;
            let cycleText = '';
            if (cycle && (cycle.cycleNumber || cycle.year)) {
              const num = cycle.cycleNumber ? `Cycle ${cycle.cycleNumber}` : '';
              const yr = cycle.year ? `${cycle.year}` : '';
              cycleText = `${num}${num && yr ? ', ' : ''}${yr}`.trim();
            }
            const title = cycleText ? 'Previous Submission Loaded' : 'Previous Submission Found';
            const message = cycleText
              ? `We've pre-filled editable fields using your most recent submission (${cycleText}). You can review and update any of these before submitting.`
              : 'We\'ve pre-filled editable fields using your most recent submission. You can review and update any of these before submitting.';
            Swal.fire({ icon: 'info', title, text: message, confirmButtonText: 'OK' });
          }
        } catch (e) { /* ignore alert failures */ }
      } catch (err) {
        console.warn('Failed to fetch recent LGBTQ profile:', err);
      }
    })();
  }

  // ✅ Handle submit
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!token) {
      Swal.fire({
        icon: "error",
        title: "Unauthorized",
        text: "No token found",
      });
      return;
    }

    // Show confirmation dialog
    const confirmation = await Swal.fire({
      title: "Are you sure?",
      text: 'Are you sure you want to submit your profile? Please confirm that all information is correct.',
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "Yes",
      cancelButtonText: "Cancel",
      confirmButtonColor: "#0A2C59",
      cancelButtonColor: "#d33",
    });

    if (!confirmation.isConfirmed) {
      return; // Stop submission if user cancels
    }

    submitBtn.disabled = true;
    submitBtn.textContent = "Submitting...";

    Swal.fire({
      title: "Submitting...",
      text: "Please wait while we process your profile.",
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        Swal.showLoading();
      },
    });

    try {
      const formData = new FormData(form);

      // If user didn't choose files but we have previous images in draft (URL or base64), attach them
      const existing = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
      async function attachIfMissing(inputId, fieldName) {
        try {
          const input = document.getElementById(inputId);
          const hasFile = input && input.files && input.files.length > 0;
          const draftVal = existing && existing[inputId];
          const draftName = existing && (existing[`${inputId}Name`] || existing[`${inputId}Name`.toString()]);
          if (!hasFile && draftVal) {
            // data URL
            if (typeof draftVal === 'string' && draftVal.startsWith('data:')) {
              const file = base64ToFile(draftVal, draftName || `${inputId}.png`);
              formData.append(fieldName, file);
            }
            // remote URL
            else if (typeof draftVal === 'string' && /^https?:\/\//i.test(draftVal)) {
              try {
                const resp = await fetch(draftVal);
                if (resp.ok) {
                  const blob = await resp.blob();
                  const filename = draftName || (draftVal.split('/').pop() || `${inputId}.png`).split('?')[0];
                  const file = new File([blob], filename, { type: blob.type || 'application/octet-stream' });
                  formData.append(fieldName, file);
                }
              } catch (e) { /* ignore network errors when attaching fallback images */ }
            }
          }
        } catch (e) { /* ignore */ }
      }

      // Attach known image inputs if missing
      await attachIfMissing('idImageFront', 'idImageFront');
      await attachIfMissing('idImageBack', 'idImageBack');
      await attachIfMissing('profileImage', 'profileImage');
      await attachIfMissing('signatureImage', 'signatureImage');
      const res = await fetch(`${API_BASE}/api/lgbtqprofiling`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      Swal.close();

      if (res.status === 403 && (data?.error?.includes("age") || data?.error?.includes("eligible"))) {
        Swal.fire({
          icon: "error",
          title: "Not Eligible",
          text: data?.error || "You are not eligible to submit this form due to age restrictions.",
          confirmButtonColor: "#0A2C59",
        });
        return;
      }

      if (res.ok && data.success) {
        Swal.fire({
          icon: "success",
          title: "Profile submitted!",
          text: "Redirecting...",
          confirmButtonText: "OK",
        }).then(() => {
          try { sessionStorage.removeItem(DRAFT_KEY); } catch (e) {}
          window.location.href = "confirmation/html/lgbtqconfirmation.html";
        });
      } else {
        Swal.fire({
          icon: "error",
          title: "Error",
          text: data.error || "Something went wrong.",
        });
      }
    } catch (err) {
      Swal.close();
      Swal.fire({ icon: "error", title: "Error", text: "Server error." });
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = "Submit";
    }
  });

  // Helper: convert base64 data URL to File
  function base64ToFile(dataurl, filename) {
    try {
      const arr = dataurl.split(',');
      const mime = arr[0].match(/:(.*?);/)[1];
      const bstr = atob(arr[1]);
      let n = bstr.length;
      const u8arr = new Uint8Array(n);
      while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
      }
      return new File([u8arr], filename, { type: mime });
    } catch (e) {
      // fallback: return a small empty blob file
      return new File([new Blob()], filename || 'file.bin');
    }
  }

  // Navigation handled by shared navbar.js — local nav/hamburger handlers removed

  /* ✅ IMAGE PREVIEW + VALIDATION + REMOVE */
  function handleImageInputChange(inputId, previewContainerId, previewImgId, allowedTypes = ['image/png', 'image/jpeg']) {
    const input = document.getElementById(inputId);
    const previewContainer = document.getElementById(previewContainerId);
    const previewImg = document.getElementById(previewImgId);

    if (input && previewContainer && previewImg) {
      input.addEventListener('change', function (e) {
        const file = e.target.files[0];
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
            input.value = ''; // Clear the file input
            previewImg.src = ''; // Clear the preview image
            previewContainer.style.display = 'none'; // Hide the preview container
            return; // Stop further processing
          }

          // File is valid, show the preview
          const reader = new FileReader();
          reader.onload = function (evt) {
            previewImg.src = evt.target.result; // Set the preview image source
            previewImg.style.display = 'block'; // show the image element
            previewContainer.style.display = 'block'; // Show the preview container
            try {
              const existing = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
              existing[inputId] = evt.target.result;
              // save filename if available
                if (file && file.name) {
                  existing[`${inputId}Name`] = file.name;
                  const nameEl = document.getElementById(`${inputId}Filename`);
                  if (nameEl) { nameEl.textContent = file.name; nameEl.classList.add('visible'); }
                }
              sessionStorage.setItem(DRAFT_KEY, JSON.stringify(existing));
            } catch (e) {
              console.warn('Failed to save image draft for', inputId, e);
            }
          };
          reader.readAsDataURL(file);
        } else {
          // No file selected, hide the preview
          previewImg.src = ''; // Clear the preview image
          previewImg.style.display = 'none';
          previewContainer.style.display = 'none'; // Hide the preview container
          try {
            const existing = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
            delete existing[inputId];
            // delete saved filename as well
            delete existing[`${inputId}Name`];
            const nameEl = document.getElementById(`${inputId}Filename`);
            if (nameEl) { nameEl.textContent = ''; nameEl.classList.remove('visible'); }
            sessionStorage.setItem(DRAFT_KEY, JSON.stringify(existing));
          } catch (e) { /* ignore */ }
        }
      });
    }
  }

  function handleImageRemove(inputId, previewContainerId, previewImgId) {
    const input = document.getElementById(inputId);
    const previewContainer = document.getElementById(previewContainerId);
    const previewImg = document.getElementById(previewImgId);

    if (input && previewContainer && previewImg) {
      const removeBtn = document.getElementById(`remove${inputId}`);
      if (removeBtn) {
        removeBtn.addEventListener('click', function () {
          input.value = ''; // Clear the file input
          previewImg.src = ''; // Clear the preview image
          previewContainer.style.display = 'none'; // Hide the preview container
          try {
            const existing = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
            delete existing[inputId];
            delete existing[`${inputId}Name`];
            sessionStorage.setItem(DRAFT_KEY, JSON.stringify(existing));
          } catch (e) { /* ignore */ }
          const nameEl = document.getElementById(`${inputId}Filename`);
          if (nameEl) { nameEl.textContent = ''; nameEl.classList.remove('visible'); }
        });
      }
    }
  }

  // Apply the logic to all relevant image inputs in the LGBTQ+ form
  handleImageInputChange('idImageFront', 'imagePreviewContainerFront', 'imagePreviewFront');
  handleImageRemove('idImageFront', 'imagePreviewContainerFront', 'imagePreviewFront');

  handleImageInputChange('idImageBack', 'imagePreviewContainerBack', 'imagePreviewBack');
  handleImageRemove('idImageBack', 'imagePreviewContainerBack', 'imagePreviewBack');

  handleImageInputChange('profileImage', 'imagePreviewContainerProfile', 'imagePreviewProfile');
  handleImageRemove('profileImage', 'imagePreviewContainerProfile', 'imagePreviewProfile');

  handleImageInputChange('signatureImage', 'imagePreviewContainerSignature', 'imagePreviewSignature');
  handleImageRemove('signatureImage', 'imagePreviewContainerSignature', 'imagePreviewSignature');
  
  // Wire custom choose buttons (if present) to trigger hidden native inputs
  const customFrontBtn = document.getElementById('customIdFrontBtn');
  if (customFrontBtn) {
    customFrontBtn.addEventListener('click', () => document.getElementById('idImageFront')?.click());
  }
  const customBackBtn = document.getElementById('customIdBackBtn');
  if (customBackBtn) {
    customBackBtn.addEventListener('click', () => document.getElementById('idImageBack')?.click());
  }
});

// ✅ Image preview + remove logic
const idImageInput = document.getElementById("idImage");
const imagePreview = document.getElementById("imagePreview");
const imagePreviewContainer = document.getElementById("imagePreviewContainer");
const removeImageBtn = document.getElementById("removeImageBtn");

if (idImageInput && imagePreview && removeImageBtn) {
  // Hide preview by default
  imagePreviewContainer.style.display = "none";

  // When user selects a file
  idImageInput.addEventListener("change", (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        imagePreview.src = e.target.result;
        imagePreviewContainer.style.display = "inline-block";
      };
      reader.readAsDataURL(file);
    }
  });

  // When user clicks the X button
  removeImageBtn.addEventListener("click", () => {
    idImageInput.value = ""; // clear file input
    imagePreview.src = "";
    imagePreviewContainer.style.display = "none";
  });
}

// Front ID image preview
document.getElementById('idImageFront').addEventListener('change', function(e) {
  const file = e.target.files[0];
  const previewContainer = document.getElementById('imagePreviewContainerFront');
  const previewImg = document.getElementById('imagePreviewFront');

  if (file) {
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid File Type',
        text: 'Only PNG and JPG files are allowed.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#0A2C59',
      });

      // Automatically remove invalid file
      e.target.value = ''; // Clear the file input
      previewImg.src = ''; // Clear the preview image
      previewContainer.style.display = 'none'; // Hide the preview container
      return; // Stop further processing
    }

    // File is valid, show the preview
    const reader = new FileReader();
    reader.onload = function (evt) {
      previewImg.src = evt.target.result;
      previewImg.style.display = 'block';
      previewContainer.style.display = 'block';
      try {
        const existing = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
        existing.idImageFront = evt.target.result;
        // store original filename too
        if (file && file.name) {
          existing.idImageFrontName = file.name;
          const nameEl = document.getElementById('idImageFrontFilename');
          if (nameEl) { nameEl.textContent = file.name; nameEl.classList.add('visible'); }
        }
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(existing));
      } catch (e) { /* ignore */ }
    };
    reader.readAsDataURL(file);
  } else {
    // No file selected, hide the preview
    previewImg.src = '';
    previewImg.style.display = 'none';
    previewContainer.style.display = 'none';
    const nameEl = document.getElementById('idImageFrontFilename');
    if (nameEl) { nameEl.textContent = ''; nameEl.classList.remove('visible'); }
  }
});

// Remove front image
document.getElementById('removeImageBtnFront').addEventListener('click', function () {
  document.getElementById('idImageFront').value = ''; // Clear the file input
  document.getElementById('imagePreviewFront').src = ''; // Clear the preview image
  document.getElementById('imagePreviewContainerFront').style.display = 'none'; // Hide the preview container
  try { const existing = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}'); delete existing.idImageFront; delete existing.idImageFrontName; sessionStorage.setItem(DRAFT_KEY, JSON.stringify(existing)); } catch (e) {}
  const nameEl = document.getElementById('idImageFrontFilename'); if (nameEl) { nameEl.textContent = ''; nameEl.classList.remove('visible'); }
});

// Back ID image preview
document.getElementById('idImageBack').addEventListener('change', function (e) {
  const file = e.target.files[0];
  const previewContainer = document.getElementById('imagePreviewContainerBack');
  const previewImg = document.getElementById('imagePreviewBack');

  if (file) {
    // Validate file type
    const allowedTypes = ['image/png', 'image/jpeg'];
    if (!allowedTypes.includes(file.type)) {
      Swal.fire({
        icon: 'error',
        title: 'Invalid File Type',
        text: 'Only PNG and JPG files are allowed.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#0A2C59',
      });

      // Automatically remove invalid file
      e.target.value = ''; // Clear the file input
      previewImg.src = ''; // Clear the preview image
      previewContainer.style.display = 'none'; // Hide the preview container
      return; // Stop further processing
    }

    // File is valid, show the preview
    const reader = new FileReader();
    reader.onload = function (evt) {
      previewImg.src = evt.target.result;
      previewImg.style.display = 'block';
      previewContainer.style.display = 'block';
      try {
        const existing = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}');
        existing.idImageBack = evt.target.result;
        if (file && file.name) {
          existing.idImageBackName = file.name;
          const nameEl = document.getElementById('idImageBackFilename');
          if (nameEl) { nameEl.textContent = file.name; nameEl.classList.add('visible'); }
        }
        sessionStorage.setItem(DRAFT_KEY, JSON.stringify(existing));
      } catch (e) { /* ignore */ }
    };
    reader.readAsDataURL(file);
  } else {
    // No file selected, hide the preview
    previewImg.src = '';
    previewImg.style.display = 'none';
    previewContainer.style.display = 'none';
    const nameEl = document.getElementById('idImageBackFilename');
    if (nameEl) { nameEl.textContent = ''; nameEl.classList.remove('visible'); }
  }
});

// Remove back image
document.getElementById('removeImageBtnBack').addEventListener('click', function () {
  document.getElementById('idImageBack').value = ''; // Clear the file input
  document.getElementById('imagePreviewBack').src = ''; // Clear the preview image
  document.getElementById('imagePreviewContainerBack').style.display = 'none'; // Hide the preview container
  try { const existing = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}'); delete existing.idImageBack; delete existing.idImageBackName; sessionStorage.setItem(DRAFT_KEY, JSON.stringify(existing)); } catch (e) {}
  const nameEl = document.getElementById('idImageBackFilename'); if (nameEl) { nameEl.textContent = ''; nameEl.classList.remove('visible'); }
});

// --- View (enlarge) previews using SweetAlert (adds a close button) ---
function attachPreviewViewer(imgId) {
  const img = document.getElementById(imgId);
  if (!img) return;
  img.style.cursor = 'pointer';
  img.addEventListener('click', function () {
    const src = img.src;
    if (!src) return;
    Swal.fire({ imageUrl: src, imageAlt: 'Image preview', showConfirmButton: false, showCloseButton: true, width: 'auto', customClass: { popup: 'swal2-image-popup' } });
  });
}

// Attach viewers to all preview images used in the form
['imagePreview', 'imagePreviewFront', 'imagePreviewBack', 'imagePreviewProfile', 'imagePreviewSignature'].forEach(attachPreviewViewer);
