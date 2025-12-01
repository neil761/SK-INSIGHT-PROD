// Expose API_BASE at top-level so all handlers can use it
const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
  ? window.API_BASE
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://sk-insight.online';
// DOMContentLoaded initialization consolidated later in this file.

// Make all form fields read-only (but keep navigation/preview buttons enabled)
function makeAllFieldsReadOnly() {
  try {
    const skipSelectors = ['#doneBtn','[data-done]','[data-action="done"]','.submit-btn','.done-btn','.view-btn','#viewFront','#viewBack','#viewCOE','#viewVoter','#closePreviewBtn'];
    const skip = el => {
      try {
        if (!el) return false;
        if (el.matches) {
          for (const s of skipSelectors) if (el.matches(s)) return true;
        }
      } catch (e) {}
      return false;
    };

    // Inputs and textareas -> readonly (but keep view/preview buttons clickable)
    document.querySelectorAll('input, textarea').forEach(el => {
      if (skip(el)) return;
      // file inputs should be disabled to prevent selection
      if (el.type === 'file') {
        el.disabled = true;
      } else {
        el.readOnly = true;
      }
      // remove from tab order
      try { el.tabIndex = -1; } catch (e) {}
    });

    // selects and buttons (except done/preview) -> disabled
    document.querySelectorAll('select, button').forEach(el => {
      if (skip(el)) return;
      try { el.disabled = true; } catch (e) {}
    });

    // Keep Done navigation (if present) enabled so the user can proceed
    const doneBtn = document.querySelector('#doneBtn') || document.querySelector('.submit-btn') || document.querySelector('.done-btn') || document.querySelector('[data-done]') || document.querySelector('[data-action="done"]');
    if (doneBtn) {
      try { doneBtn.disabled = false; doneBtn.tabIndex = 0; } catch (e) {}
    }
  } catch (err) {
    console.warn('makeAllFieldsReadOnly error', err);
  }
}

// makeAllFieldsReadOnly is scheduled from the consolidated initializer above

document.addEventListener('DOMContentLoaded', function() {
  // Initialize shared navbar hamburger if available

  // Ensure form fields are set read-only shortly after population
  try { setTimeout(makeAllFieldsReadOnly, 50); } catch (e) {}

  // Done button handler (keep it reachable even when others are disabled)
  const doneBtn = document.querySelector('.submit-btn, #doneBtn, .done-btn, button[data-action="done"], [data-done]');
  if (doneBtn) {
    try {
      doneBtn.addEventListener('click', function (e) {
        e && e.preventDefault();
        window.location.href = '/Frontend/html/user/confirmation/html/educConfirmation.html';
      });
    } catch (e) {}
  }
});

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

// Helper function to truncate file names
function truncateFileName(fileName, maxLength = 6) {
  if (fileName.length <= maxLength) {
    return fileName;
  }
  
  // Always show first 6 characters + "..." for files longer than 6 characters
  return fileName.substring(0, maxLength) + "...";
}

document.addEventListener('DOMContentLoaded', async function () {
  // if (!validateTokenAndRedirect("Educational Assistance Profile")) {
  //   return;
  // }
  
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');

  try {
    // Fetch Educational Assistance data
    const res = await fetch(`${API_BASE}/api/educational-assistance/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return;
    const data = await res.json();

    // Fetch user data (to get birthday from sign-up)
    const userRes = await fetch(`${API_BASE}/api/users/me`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const userInfo = userRes.ok ? await userRes.json() : {};

    // Use the birthday from the user data
    const birthday = userInfo.birthday || ''; // Default to empty string if not found
    const birthdayInput = document.getElementById('birthday');
    if (birthdayInput) {
      birthdayInput.value = birthday ? birthday.split('T')[0] : ''; // Format as YYYY-MM-DD
      birthdayInput.disabled = true; // Make it read-only
    }

    // Populate other fields with fetched data
    document.getElementById('surname').value = data.surname || '';
    document.getElementById('firstName').value = data.firstname || '';
    document.getElementById('middleName').value = data.middlename || '';
    document.getElementById('suffix').value = data.suffix || '';
    document.getElementById('placeOfBirth').value = data.placeOfBirth || '';
    document.getElementById('age').value = data.age || '';
    document.getElementById('gender').value = data.sex || '';
    document.getElementById('civilStatus').value = data.civilStatus || '';
    document.getElementById('religion').value = data.religion || '';
    document.getElementById('email').value = data.email || '';
    document.getElementById('contact').value = data.contactNumber || '';
    document.getElementById('schoolname').value = data.school || '';
    document.getElementById('schooladdress').value = data.schoolAddress || '';
    // Academic level & year handling: populate year options based on academic level
    const acadEl = document.getElementById('academicLevel');
    const yearEl = document.getElementById('year');
    const yearWrapper = document.getElementById('yearWrapper');
    const JHS_YEARS = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
    const SHS_YEARS = ['Grade 11', 'Grade 12'];

    function populateYearOptions(level, selectedYear, targetSelect) {
      const target = targetSelect || yearEl;
      if (!target) return;
      target.innerHTML = '<option value="">Select Classification</option>';
      const lvl = (level || '').toString().toLowerCase();
      let options = [];
      if (lvl.includes('junior')) options = JHS_YEARS;
      else if (lvl.includes('senior')) options = SHS_YEARS;

      options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt;
        o.textContent = opt;
        if (selectedYear && selectedYear === opt) o.selected = true;
        target.appendChild(o);
      });

      if (selectedYear && options.indexOf(selectedYear) === -1) {
        try { target.value = ''; } catch (e) {}
      }
    }

    // Apply academic level and populate year accordingly
    try {
      const acadVal = (data.academicLevel || data.academiclevel || data.academic_level || data.academic || (data.user && data.user.academicLevel) || '').toString();
      if (acadEl && acadVal) {
        try { acadEl.value = acadVal; } catch (e) { /* ignore */ }
      }
      // populate year options and set visibility
      populateYearOptions(acadVal, data.year || '', yearEl);
      if (yearWrapper) {
        yearWrapper.style.display = acadVal ? '' : 'none';
      }

      // Hide voter certificate row if Senior High School
      function toggleVoterCertificateRow(level) {
        const voterRow = Array.from(document.querySelectorAll('.requirements-table tbody tr')).find(row => 
          row.textContent.includes("Parent's Voter's Certificate")
        );
        if (voterRow) {
          const isJHS = (level || '').toLowerCase().includes('junior');
          voterRow.style.display = isJHS ? '' : 'none';
        }
      }

      toggleVoterCertificateRow(acadVal);

      // update year options when academic level changes (defensive)
      if (acadEl) {
        acadEl.addEventListener('change', function () {
          const lvl = acadEl.value || '';
          populateYearOptions(lvl, '', yearEl);
          if (yearWrapper) yearWrapper.style.display = lvl ? '' : 'none';
          toggleVoterCertificateRow(lvl);
        });
      }
    } catch (e) { /* ignore */ }
    document.getElementById('benefittype').value = data.typeOfBenefit || '';
    document.getElementById('fathername').value = data.fatherName || '';
    document.getElementById('fathercontact').value = data.fatherPhone || '';
    document.getElementById('mothername').value = data.motherName || '';
    document.getElementById('mothercontact').value = data.motherPhone || '';

    // Populate siblings table
    const siblingsBody = document.getElementById('siblingsTableBody');
    siblingsBody.innerHTML = '';
    if (Array.isArray(data.siblings)) {
      data.siblings.forEach((sibling) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${sibling.name || ''}</td>
          <td>${sibling.gender || ''}</td>
          <td>${sibling.age || ''}</td>
        `;
        siblingsBody.appendChild(row);
      });
    }

    // Populate expenses table
    const expensesBody = document.getElementById('expensesTableBody');
    expensesBody.innerHTML = '';
    if (Array.isArray(data.expenses)) {
      data.expenses.forEach((expense) => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${expense.item || ''}</td>
          <td>${expense.expectedCost || ''}</td>
        `;
        expensesBody.appendChild(row);
      });
    }

    // Populate requirements (e.g., uploaded files)
    const requirements = [
      { id: 'viewFront', column: 'frontImage', label: 'Front ID', url: data.frontImage },
      { id: 'viewBack', column: 'backImage', label: 'Back ID', url: data.backImage },
      { id: 'viewCOE', column: 'coeImage', label: 'Certificate of Enrollment', url: data.coeImage },
      { id: 'viewVoter', column: 'voter', label: "Parent's Voter's Certificate", url: data.voter },
    ];

    requirements.forEach((req) => {
      const column = document.getElementById(`${req.column}UploadColumn`);
      if (column) {
        const fileName = req.url ? req.url.replace(/^.*[\\/]/, '') : '';
        const truncatedName = truncateFileName(fileName);
        column.textContent = truncatedName;
        column.title = fileName; // Show full name on hover
      }
    });

    // Add preview logic for images
    const viewFront = document.getElementById('viewFront');
    if (viewFront) {
      viewFront.onclick = function () {
        if (data.frontImage) {
          showImagePreview(data.frontImage);
        }
      };
    }

    const viewBack = document.getElementById('viewBack');
    if (viewBack) {
      viewBack.onclick = function () {
        if (data.backImage) {
          showImagePreview(data.backImage);
        }
      };
    }

    const viewCOE = document.getElementById('viewCOE');
    if (viewCOE) {
      viewCOE.onclick = function () {
        if (data.coeImage) {
          showImagePreview(data.coeImage);
        }
      };
    }

    const viewVoter = document.getElementById('viewVoter');
    if (viewVoter) {
      viewVoter.onclick = function () {
        if (data.voter) {
          showImagePreview(data.voter);
        }
      };
    }
  } catch (err) {
    console.error('Failed to fetch Educational Assistance data:', err);
  }
});

// Helper function to truncate file names
function truncateFileName(fileName, maxLength = 6) {
  if (fileName.length <= maxLength) {
    return fileName;
  }
  return fileName.substring(0, maxLength) + '...';
}

// Helper function to show image preview in a modal
function showImagePreview(imageUrl) {
  const modal = document.getElementById('imagePreviewModal');
  const previewImg = document.getElementById('previewImg');
  if (modal && previewImg) {
    previewImg.src = imageUrl;
    modal.style.display = 'flex';
  }
}

// Modal close handlers (delegated) — works regardless of load timing
(function setupPreviewModalHandlers() {
  const modal = document.getElementById('imagePreviewModal');

  // Click delegation: close when clicking the close button or the modal backdrop
  document.addEventListener('click', function (e) {
    const target = e.target;
    // Close button clicked
    if (target.closest && target.closest('#closePreviewBtn')) {
      if (modal) modal.style.display = 'none';
      return;
    }

    // Clicking directly on the modal backdrop (outside the image) closes it
    if (modal && target === modal) {
      modal.style.display = 'none';
      return;
    }
  }, false);

  // Close on Escape key
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') {
      if (modal && modal.style.display && modal.style.display !== 'none') {
        modal.style.display = 'none';
      }
    }
  });
})();

// Done handler is attached from the consolidated initializer earlier.

