// Expose API_BASE at top-level so all handlers can use it
const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
  ? window.API_BASE
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://sk-insight.online';

document.addEventListener('DOMContentLoaded', async function() {
  // if (!validateTokenAndRedirect("Educational Assistance Profile")) {
  //   return;
  // }
  
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');

  // Navbar and navigation logic is now handled by shared navbar.js
  // All local hamburger/nav button code removed for maintainability.

  try {
    const res = await fetch(`${API_BASE}/api/educational-assistance/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return;
    const data = await res.json();


    // try {
    //   const userRes = await fetch(`${API_BASE}/api/kkprofiling/me`, {
    //     headers: { Authorization: `Bearer ${token}` }
    //   });
    //   const userInfo = userRes.ok ? await userRes.json() : {};

    //   // Try to find birthday in different places
    //   let birthday = '';
    //   if (userInfo.birthday) {
    //     birthday = userInfo.birthday;
    //   } else if (userInfo.personalInfo && userInfo.personalInfo.birthday) {
    //     birthday = userInfo.personalInfo.birthday;
    //   } else if (data.birthday) {
    //     birthday = data.birthday;
    //   } else {
    //   }

    //   // Apply to input
    //   const bdayInput = document.getElementById('birthday');
    //   if (bdayInput) {
    //     bdayInput.value = birthday ? birthday.split('T')[0] : '';
    //   } else {
    //   }
    // } catch (err) {
    // }

    // Fill form fields with fetched data
    document.getElementById('surname').value = data.surname || '';
    document.getElementById('firstName').value = data.firstname || '';
    document.getElementById('middleName').value = data.middlename || '';
    document.getElementById('suffix').value = data.suffix || '';

    // Fetch birthday from user info (from sign-in) if available
    let birthday = "";
    if (data.user && data.user.birthday) {
      birthday = data.user.birthday;
    } else if (data.kkInfo && data.kkInfo.birthday) {
      birthday = data.kkInfo.birthday;
    } else if (data.birthday) {
      birthday = data.birthday;
    }
    const birthdayInput = document.getElementById('birthday');
if (birthdayInput && data.birthday) {
  const formattedBirthday = data.birthday.split('T')[0]; // ensure it's YYYY-MM-DD
  birthdayInput.disabled = false; // temporarily enable so Chrome will display it
  birthdayInput.value = formattedBirthday;
  birthdayInput.disabled = true; // disable again to prevent user editing
}

    document.getElementById('placeOfBirth').value = data.placeOfBirth || '';
    document.getElementById('age').value = data.age || '';
    document.getElementById('gender').value = data.sex || '';
    document.getElementById('civilStatus').value = data.civilStatus || '';
    document.getElementById('religion').value = data.religion || '';
    document.getElementById('email').value = data.email || '';
    document.getElementById('contact').value = data.contactNumber || '';
    document.getElementById('schoolname').value = data.school || '';
    document.getElementById('schooladdress').value = data.schoolAddress || '';
    // Populate the Academic Level from backend data if present (handle multiple possible field names)
    try {
      const acadEl = document.getElementById('academicLevel');
      const acadVal = (data.academicLevel || data.academiclevel || data.academic_level || data.academic || (data.user && data.user.academicLevel) || '').toString();
      if (acadEl && acadVal) {
        try { acadEl.value = acadVal; } catch (e) { acadEl.selectedIndex = 0; }
      }
    } catch (e) { /* ignore */ }
    // Replace year input with a select/dropdown when an Academic Level exists
    (function setupYearDropdown() {
      const JHS_YEARS = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
      const SHS_YEARS = ['Grade 11', 'Grade 12'];

      const acadEl = document.getElementById('academicLevel');
      const existingYearEl = document.getElementById('year');

      function populateYearOptions(level, selectedYear, targetSelect) {
        if (!targetSelect) return;
        targetSelect.innerHTML = '<option value="">Select Classification</option>';
        const lvl = (level || '').toString().toLowerCase();
        let options = [];
        if (lvl.includes('junior')) options = JHS_YEARS;
        else if (lvl.includes('senior')) options = SHS_YEARS;

        options.forEach(opt => {
          const o = document.createElement('option');
          o.value = opt;
          o.textContent = opt;
          if (selectedYear && selectedYear === opt) o.selected = true;
          targetSelect.appendChild(o);
        });

        // If selectedYear is provided but not in options, leave blank
        if (selectedYear && options.indexOf(selectedYear) === -1) {
          try { targetSelect.value = ''; } catch (e) {}
        }
      }

      // If there is an academic level element, prefer showing a select for year
      if (existingYearEl) {
        // If existing is an input, replace it with a select preserving id/name/class
        if (acadEl && existingYearEl.tagName && existingYearEl.tagName.toLowerCase() === 'input') {
          const select = document.createElement('select');
          select.id = existingYearEl.id;
          if (existingYearEl.name) select.name = existingYearEl.name;
          select.className = existingYearEl.className || '';
          // insert after academic level if possible
          if (acadEl.parentNode) {
            if (acadEl.nextSibling) acadEl.parentNode.insertBefore(select, acadEl.nextSibling);
            else acadEl.parentNode.appendChild(select);
            // remove old input
            existingYearEl.parentNode && existingYearEl.parentNode.removeChild(existingYearEl);
          } else {
            existingYearEl.parentNode.replaceChild(select, existingYearEl);
          }

          const lvl = (acadEl && acadEl.value) ? acadEl.value : (data.academicLevel || '');
          populateYearOptions(lvl, data.year || '', select);

          // if academic level changes (unlikely in view page), update options
          try { if (acadEl) acadEl.addEventListener('change', () => populateYearOptions(acadEl.value, '', select)); } catch (e) {}
        } else if (existingYearEl.tagName && existingYearEl.tagName.toLowerCase() === 'select') {
          // Already a select: just populate options based on academic level or data
          const lvl = (acadEl && acadEl.value) ? acadEl.value : (data.academicLevel || '');
          populateYearOptions(lvl, data.year || '', existingYearEl);
        } else {
          // fallback: keep as input and just set value
          try { existingYearEl.value = data.year || ''; } catch (e) {}
        }
      } else {
        // No existing #year element: create a disabled select to display the value
        const select = document.createElement('select');
        select.id = 'year';
        select.name = 'year';
        select.className = '';
        const lvl = (acadEl && acadEl.value) ? acadEl.value : (data.academicLevel || '');
        populateYearOptions(lvl, data.year || '', select);
        // append it near academic level if possible, otherwise to the form
        if (acadEl && acadEl.parentNode) {
          if (acadEl.nextSibling) acadEl.parentNode.insertBefore(select, acadEl.nextSibling);
          else acadEl.parentNode.appendChild(select);
        } else {
          const formEl = document.getElementById('educationalAssistanceForm') || document.body;
          formEl.appendChild(select);
        }
      }
    })();
    document.getElementById('benefittype').value = data.typeOfBenefit || '';
    document.getElementById('fathername').value = data.fatherName || '';
    document.getElementById('fathercontact').value = data.fatherPhone || '';
    document.getElementById('mothername').value = data.motherName || '';
    document.getElementById('mothercontact').value = data.motherPhone || '';

    // If Academic Level is Senior High School, hide the Parent's Voter's Certificate row
    try {
      const acadEl = document.getElementById('academicLevel');
      const acadVal = (acadEl && acadEl.value) ? acadEl.value.toString().toLowerCase() : (data.academicLevel || '').toString().toLowerCase();
      const voterCol = document.getElementById('voterUploadColumn');
      const viewVoter = document.getElementById('viewVoter');
      if (acadVal && acadVal.includes('senior')) {
        // hide the entire table row that contains the voter certificate
        try {
          const tr = voterCol ? (voterCol.closest ? voterCol.closest('tr') : voterCol.parentElement) : null;
          if (tr) tr.style.display = 'none';
        } catch (e) {}
        if (viewVoter) viewVoter.style.display = 'none';
      } else {
        try {
          const tr = voterCol ? (voterCol.closest ? voterCol.closest('tr') : voterCol.parentElement) : null;
          if (tr) tr.style.display = '';
        } catch (e) {}
        if (viewVoter) viewVoter.style.display = '';
      }
    } catch (e) {
      /* ignore */
    }

    // Siblings table
    const siblingsBody = document.getElementById('siblingsTableBody');
    siblingsBody.innerHTML = '';
    if (Array.isArray(data.siblings)) {
      data.siblings.forEach(sibling => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${sibling.name || ''}</td>
          <td>${sibling.gender || ''}</td>
          <td>${sibling.age || ''}</td>
        `;
        siblingsBody.appendChild(row);
      });
    }

    // Expenses table
    const expensesBody = document.getElementById('expensesTableBody');
    expensesBody.innerHTML = '';
    if (Array.isArray(data.expenses)) {
      data.expenses.forEach(expense => {
        const row = document.createElement('tr');
        row.innerHTML = `
          <td>${expense.item || ''}</td>
          <td>${expense.expectedCost || ''}</td>
        `;
        expensesBody.appendChild(row);
      });
    }

    // Requirements: Sedula, COE, Signature (show truncated file name only, remove folder path)
    if (data.frontImage) {
      const fileName = data.frontImage.replace(/^.*[\\/]/, '');
      const truncatedName = truncateFileName(fileName);
      const element = document.getElementById('frontImageUploadColumn');
      if (element) {
        element.textContent = truncatedName;
        element.title = fileName; // Show full name on hover
      }
    }
    if (data.backImage) {
      const fileName = data.backImage.replace(/^.*[\\/]/, '');
      const truncatedName = truncateFileName(fileName);
      const element = document.getElementById('backImageUploadColumn');
      if (element) {
        element.textContent = truncatedName;
        element.title = fileName; // Show full name on hover
      }
    }
    if (data.coeImage) {
      const fileName = data.coeImage.replace(/^.*[\\/]/, '');
      const truncatedName = truncateFileName(fileName);
      const element = document.getElementById('coeImageUploadColumn');
      if (element) {
        element.textContent = truncatedName;
        element.title = fileName; // Show full name on hover
      }
    }
    if (data.voter) {
      const fileName = data.voter.replace(/^.*[\\/]/, '');
      const truncatedName = truncateFileName(fileName);
      const element = document.getElementById('voterUploadColumn');
      if (element) {
        element.textContent = truncatedName;
        element.title = fileName; // Show full name on hover
      }
    }

    // Optionally, add preview logic for images if you want
    // Example for Sedula:
    const viewFront = document.getElementById('viewFront');
if (viewFront) {
  viewFront.onclick = function() {
    if (data.frontImage) {
      showImagePreview(data.frontImage);
    }
  };
}

    const viewBack = document.getElementById('viewBack');
if (viewBack) {
  viewBack.onclick = function() {
    if (data.backImage) {
      showImagePreview(data.backImage);
    }
  };
}

// Handle COE preview
const viewCOE = document.getElementById('viewCOE');
if (viewCOE) {
  viewCOE.onclick = function() {
    if (data.coeImage) {
      // Use Cloudinary URL directly if it's already a full URL
      const imageUrl = data.coeImage.startsWith('http') ? data.coeImage : `/uploads/${data.coeImage}`;
      showImagePreview(imageUrl);
    }
  };
}

// Handle close preview button
const closePreviewBtn = document.getElementById('closePreviewBtn');
if (closePreviewBtn) {
  closePreviewBtn.onclick = function() {
    document.getElementById('imagePreviewModal').style.display = 'none';
  };
}

// Repeat for COE and Signature if needed
    const viewVoter = document.getElementById('viewVoter');
if (viewVoter) {
  viewVoter.onclick = function() {
    if (data.voter) {
      showImagePreview(data.voter);
    }
  };
}
  } catch (err) {
    console.error('Failed to fetch Educational Assistance data:', err);
  }
});

// Make all form fields read-only (but keep navigation/preview buttons enabled)
function makeAllFieldsReadOnly() {
  try {
    const skipSelectors = ['#doneBtn','[data-done]','[data-action="done"]','.view-btn','#viewFront','#viewBack','#viewCOE','#viewVoter'];
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
    const doneBtn = document.querySelector('#doneBtn') || document.querySelector('[data-done]') || document.querySelector('[data-action="done"]');
    if (doneBtn) {
      try { doneBtn.disabled = false; doneBtn.tabIndex = 0; } catch (e) {}
    }
  } catch (err) {
    console.warn('makeAllFieldsReadOnly error', err);
  }
}

// Call the helper after DOM is ready and the form is populated.
document.addEventListener('DOMContentLoaded', () => {
  // small delay to ensure any async population completed
  setTimeout(makeAllFieldsReadOnly, 50);
});

document.addEventListener('DOMContentLoaded', function() {
  // KK Profile
  document.getElementById('kkProfileNavBtnDesktop')?.addEventListener('click', handleKKProfileNavClick);
  document.getElementById('kkProfileNavBtnMobile')?.addEventListener('click', handleKKProfileNavClick);

  // LGBTQ+ Profile
  document.getElementById('lgbtqProfileNavBtnDesktop')?.addEventListener('click', handleLGBTQProfileNavClick);
  document.getElementById('lgbtqProfileNavBtnMobile')?.addEventListener('click', handleLGBTQProfileNavClick);

  // Educational Assistance
  document.getElementById('educAssistanceNavBtnDesktop')?.addEventListener('click', handleEducAssistanceNavClick);
  document.getElementById('educAssistanceNavBtnMobile')?.addEventListener('click', handleEducAssistanceNavClick);
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
    document.getElementById('year').value = data.year || '';
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

// Close the preview modal
document.getElementById('closePreviewBtn').addEventListener('click', function () {
  const modal = document.getElementById('imagePreviewModal');
  if (modal) modal.style.display = 'none';
});

// Attach Done button handler (shows confirmation then go to educConfirmation.html)
// ...existing code...

// Attach Done button handler — remove SweetAlert, redirect immediately
document.addEventListener('DOMContentLoaded', () => {
  const doneSelector = [
    '#doneBtn',
    '.done-btn',
    'button[data-action="done"]',
    'input[type="submit"][value="Done"]',
    'button[type="submit"].done'
  ];

  let doneBtn = null;
  for (const sel of doneSelector) {
    try { doneBtn = document.querySelector(sel); } catch (e) {}
    if (doneBtn) break;
  }

  // Fallback: find a button whose visible text/value is "Done"
  if (!doneBtn) {
    const btns = Array.from(document.querySelectorAll('button, input[type="button"], input[type="submit"]'));
    doneBtn = btns.find(b => ((b.innerText || b.value || '').trim().toLowerCase() === 'done'));
  }

  const goToConfirmation = () => {
    window.location.href = '/Frontend/html/user/confirmation/html/educConfirmation.html';
  };

  if (doneBtn) {
    doneBtn.addEventListener('click', (e) => {
      if (e && e.preventDefault) e.preventDefault();
      goToConfirmation();
    });
  } else {
    document.body.addEventListener('click', (e) => {
      const target = e.target.closest('[data-done]');
      if (target) {
        e.preventDefault();
        goToConfirmation();
      }
    });
  }
});

