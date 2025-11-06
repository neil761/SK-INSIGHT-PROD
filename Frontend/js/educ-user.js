document.addEventListener('DOMContentLoaded', async function () {
  async function fetchUserDetails() {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) {
      console.error('No token found. User is not logged in.');
      return null;
    }

    try {
      const response = await fetch('http://localhost:5000/api/users/me', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`
        }
      });

      if (!response.ok) {
        console.error('Failed to fetch user details:', response.status, await response.text());
        return null;
      }

      const userData = await response.json();
      return userData; // Return the user data object
    } catch (error) {
      console.error('Error fetching user details:', error);
      return null;
    }
  }

  const form = document.getElementById('educationalAssistanceForm');
  if (!form) {
    console.error('Educational Assistance form not found.');
    return;
  }

  // Fetch and set the user's email
  const emailInput = document.getElementById('email');
  if (!emailInput) {
    console.error('Email input field not found in the DOM.');
    return;
  }

  const userDetails = await fetchUserDetails();
  if (userDetails?.email) {
    emailInput.value = userDetails.email;
    emailInput.readOnly = true; // Make it non-editable
  }

  // Fetch and set the user's birthday
  const birthdayInput = document.getElementById('birthday');
  if (birthdayInput && userDetails?.birthday) {
    birthdayInput.value = userDetails.birthday.split('T')[0]; // Format as yyyy-mm-dd
    birthdayInput.readOnly = true; // Make it non-editable
  }

  function calculateAge(birthday) {
    if (!birthday) return '';
    const birthDate = new Date(birthday);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  }

  // Set default benefit type
  document.getElementById('benefittype').value = 'Educational Assistance';

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Client-side validation (add/remove fields as required by your backend)
    const requiredIds = ['surname', 'firstName', 'birthday', 'contact', 'year'];
    for (const id of requiredIds) {
      const el = document.getElementById(id);
      if (!el || !el.value.trim()) {
        return Swal.fire('Missing field', `Please fill the ${id} field.`, 'warning');
      }
    }

    // Ensure typeOfBenefiting is present and default to Applicant
    const typeEl = document.getElementById('typeOfBenefiting') || document.getElementById('benefittype');
    const typeValue = typeEl && typeEl.value ? typeEl.value : 'Applicant';

    const formData = new FormData();
    formData.append('surname', document.getElementById('surname').value.trim());
    formData.append('firstname', document.getElementById('firstName').value.trim());
    formData.append('middlename', document.getElementById('middleName')?.value?.trim() || '');
    formData.append('placeOfBirth', document.getElementById('placeOfBirth')?.value || '');
    formData.append('age', calculateAge(birthdayInput.value)); // Calculate age based on the birthday input
    formData.append('birthday', birthdayInput.value); // Include birthday in the form submission
    formData.append('sex', document.getElementById('gender')?.value || '');
    formData.append('civilStatus', document.getElementById('civilstatus')?.value || '');
    formData.append('religion', document.getElementById('religion')?.value || '');
    formData.append('email', document.getElementById('email')?.value || '');
    formData.append('contactNumber', Number(document.getElementById('contact')?.value || 0));
    formData.append('school', document.getElementById('schoolname')?.value || '');
    formData.append('schoolAddress', document.getElementById('schooladdress')?.value || '');
    formData.append('year', document.getElementById('year')?.value || '');
    formData.append('typeOfBenefit', typeValue); // <-- use this name
    formData.append('fatherName', document.getElementById('fathername')?.value || '');
    formData.append('fatherPhone', document.getElementById('fathercontact')?.value || '');
    formData.append('motherName', document.getElementById('mothername')?.value || '');
    formData.append('motherPhone', document.getElementById('mothercontact')?.value || '');

    // siblings & expenses as before
    const siblings = [];
    document.querySelectorAll('#siblingsTableBody tr').forEach(row => {
      const nameEl = row.querySelector('.sibling-name');
      const genderEl = row.querySelector('.sibling-gender');
      const ageEl = row.querySelector('.sibling-age');
      if (nameEl) siblings.push({ name: nameEl.value, gender: genderEl?.value || '', age: ageEl?.value ? Number(ageEl.value) : '' });
    });
    formData.append('siblings', JSON.stringify(siblings));

    const expenses = [];
    document.querySelectorAll('#expensesTableBody tr').forEach(row => {
      const itemEl = row.querySelector('.expense-item');
      const costEl = row.querySelector('.expense-cost');
      if (itemEl) expenses.push({ item: itemEl.value, expectedCost: costEl?.value ? Number(costEl.value) : '' });
    });
    formData.append('expenses', JSON.stringify(expenses));

    // Append file inputs (requirements)
    const fileInputs = ['frontImage', 'backImage', 'coeImage', 'voter'];
    for (const inputId of fileInputs) {
      const input = document.getElementById(inputId);
      if (input && input.files && input.files.length > 0) {
        formData.append(inputId, input.files[0]); // Append file to FormData
      }
    }

    try {
      Swal.fire({
        title: 'Submitting...',
        text: 'Please wait while your application is being submitted.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading()
      });

      const response = await fetch('http://localhost:5000/api/educational-assistance', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token') || localStorage.getItem('token')}`
        },
        body: formData
      });

      Swal.close();

      const text = await response.text();
      let data = null;
      try { data = JSON.parse(text); } catch (err) {}

      if (response.status === 403 && (data?.error?.includes('age') || data?.error?.includes('eligible'))) {
        return Swal.fire({
          icon: 'error',
          title: 'Not Eligible',
          text: data?.error || 'You are not eligible to submit this form due to age restrictions.',
          confirmButtonColor: '#0A2C59'
        });
      }

      if (!response.ok) {
        const message = data?.message || data?.error || text || `Server returned ${response.status}`;
        return Swal.fire('Submission failed', message, 'error');
      }

      Swal.fire('Success', 'Form submitted successfully!', 'success').then(() => {
        form.reset();
        window.location.href = "confirmation/html/educConfirmation.html";
      });
    } catch (error) {
      Swal.close();
      console.error('Error submitting form:', error);
      Swal.fire('Error', 'Network or server error. Please try again later.', 'error');
    }
  });

  // Siblings: Add Row
  document.getElementById('addSiblingBtn').addEventListener('click', function() {
    const tbody = document.getElementById('siblingsTableBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="sibling-name" required></td>
      <td>
        <select class="sibling-gender" required>
          <option value="">Select</option>
          <option value="Male">Male</option>
          <option value="Female">Female</option>
        </select>
      </td>
      <td><input type="number" class="sibling-age" min="0" required></td>
      <td><button type="button" class="removeSiblingBtn">Remove</button></td>
    `;
    tbody.appendChild(tr);
    saveSiblings(); // save after adding
  });

  // Siblings: Remove Row
  document.getElementById('siblingsTableBody').addEventListener('click', function(e) {
    if (e.target.classList.contains('removeSiblingBtn')) {
      e.target.closest('tr').remove();
      saveSiblings(); // save after removing
    }
  });

  // Save siblings on any change in siblings table (delegated)
  document.getElementById('siblingsTableBody').addEventListener('input', function() {
    saveSiblings();
  });

  // Expenses: Add Row
  document.getElementById('addExpenseBtn').addEventListener('click', function() {
    const tbody = document.getElementById('expensesTableBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><input type="text" class="expense-item" required></td>
      <td><input type="number" class="expense-cost" min="0" required></td>
      <td><button type="button" class="removeExpenseBtn">Remove</button></td>
    `;
    tbody.appendChild(tr);
    saveExpenses(); // save after adding
  });

  // Expenses: Remove Row
  document.getElementById('expensesTableBody').addEventListener('click', function(e) {
    if (e.target.classList.contains('removeExpenseBtn')) {
      e.target.closest('tr').remove();
      saveExpenses(); // save after removing
    }
  });

  // Save expenses on any change in expenses table (delegated)
  document.getElementById('expensesTableBody').addEventListener('input', function() {
    saveExpenses();
  });

  // Restore siblings/expenses from sessionStorage on load
  (function restoreDynamicTables() {
    const savedSiblings = JSON.parse(sessionStorage.getItem('educ_siblings') || '[]');
    if (Array.isArray(savedSiblings) && savedSiblings.length) {
      const tbody = document.getElementById('siblingsTableBody');
      tbody.innerHTML = '';
      savedSiblings.forEach(s => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input type="text" class="sibling-name" required value="${escapeHtml(s.name || '')}"></td>
          <td>
            <select class="sibling-gender" required>
              <option value="">Select</option>
              <option value="Male" ${s.gender === 'Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${s.gender === 'Female' ? 'selected' : ''}>Female</option>
            </select>
          </td>
          <td><input type="number" class="sibling-age" min="0" required value="${s.age ?? ''}"></td>
          <td><button type="button" class="removeSiblingBtn">Remove</button></td>
        `;
        tbody.appendChild(tr);
      });
    }

    const savedExpenses = JSON.parse(sessionStorage.getItem('educ_expenses') || '[]');
    if (Array.isArray(savedExpenses) && savedExpenses.length) {
      const tbody = document.getElementById('expensesTableBody');
      tbody.innerHTML = '';
      savedExpenses.forEach(ex => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input type="text" class="expense-item" required value="${escapeHtml(ex.item || '')}"></td>
          <td><input type="number" class="expense-cost" min="0" required value="${ex.expectedCost ?? ''}"></td>
          <td><button type="button" class="removeExpenseBtn">Remove</button></td>
        `;
        tbody.appendChild(tr);
      });
    }
  })();

  // helper: save siblings to sessionStorage
  function saveSiblings() {
    const arr = [];
    document.querySelectorAll('#siblingsTableBody tr').forEach(row => {
      const nameEl = row.querySelector('.sibling-name');
      const genderEl = row.querySelector('.sibling-gender');
      const ageEl = row.querySelector('.sibling-age');
      if (!nameEl || !genderEl || !ageEl) return;
      arr.push({
        name: nameEl.value,
        gender: genderEl.value,
        age: ageEl.value ? Number(ageEl.value) : ''
      });
    });
    sessionStorage.setItem('educ_siblings', JSON.stringify(arr));
  }

  // helper: save expenses to sessionStorage
  function saveExpenses() {
    const arr = [];
    document.querySelectorAll('#expensesTableBody tr').forEach(row => {
      const itemEl = row.querySelector('.expense-item');
      const costEl = row.querySelector('.expense-cost');
      if (!itemEl || !costEl) return;
      arr.push({
        item: itemEl.value,
        expectedCost: costEl.value ? Number(costEl.value) : ''
      });
    });
    sessionStorage.setItem('educ_expenses', JSON.stringify(arr));
  }

  // small utility to escape values when inserting into HTML
  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  // Eye icon click listeners
  document.getElementById('viewVoter').addEventListener('click', function() {
    showImagePreview('voter');
  });
  document.getElementById('viewCOE').addEventListener('click', function() {
    showImagePreview('coeImage');
  });
  document.getElementById('viewFront').addEventListener('click', function() {
    showImagePreview('frontImage');
  });
  document.getElementById('viewBack').addEventListener('click', function() {
    showImagePreview('backImage');
  });

  // Navbar: Mobile menu toggle
  const hamburger = document.getElementById('navbarHamburger');
  const mobileMenu = document.getElementById('navbarMobileMenu');

  hamburger.addEventListener('click', function() {
    mobileMenu.classList.toggle('active'); // Assuming 'active' class shows the menu
  });

  // Helper function to truncate file names
  function truncateFileName(fileName, maxLength = 6) {
    if (fileName.length <= maxLength) {
      return fileName;
    }
    
    // Always show first 6 characters + "..." for files longer than 6 characters
    return fileName.substring(0, maxLength) + "...";
  }

  function handleFileInput(inputId, labelId, fileNameId, viewId, deleteId) {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);
    const fileNameSpan = document.getElementById(fileNameId);
    const viewIcon = document.getElementById(viewId);
    const deleteIcon = document.getElementById(deleteId);

    function updateIcons() {
      const hasFile = input && input.files && input.files.length > 0;
      
      if (viewIcon) {
        // Restore proper eye icon when file is present
        if (hasFile) {
          viewIcon.classList.remove('fa-eye-slash', 'disabled');
          viewIcon.classList.add('fa-eye');
          viewIcon.style.pointerEvents = 'auto';
          viewIcon.style.opacity = '1';
        } else {
          viewIcon.classList.remove('fa-eye');
          viewIcon.classList.add('fa-eye-slash', 'disabled');
          viewIcon.style.pointerEvents = 'none';
          viewIcon.style.opacity = '0.5';
        }
      }
      
      if (deleteIcon) {
        deleteIcon.classList.toggle('disabled', !hasFile);
        deleteIcon.style.pointerEvents = hasFile ? 'auto' : 'none';
        deleteIcon.style.opacity = hasFile ? '1' : '0.5';
      }
    }

    if (input && label && fileNameSpan) {
      input.addEventListener('change', function() {
        if (input.files && input.files.length > 0) {
          const file = input.files[0];
          const maxSize = 5 * 1024 * 1024; // 5MB in bytes
          
          // Check file size
          if (file.size > maxSize) {
            Swal.fire({
              icon: 'error',
              title: 'File Too Large',
              text: `File size (${(file.size / (1024 * 1024)).toFixed(2)}MB) exceeds the maximum limit of 5MB. Please choose a smaller file.`,
              confirmButtonText: 'OK',
              confirmButtonColor: '#0A2C59'
            });
            
            // Clear the input
            input.value = '';
            label.style.display = 'inline-flex';
            fileNameSpan.textContent = '';
            fileNameSpan.title = '';
            fileNameSpan.style.display = 'none';
            updateIcons();
            return;
          }
          
          // Check file type (optional - only allow image files)
          if (!file.type.startsWith('image/')) {
            Swal.fire({
              icon: 'error',
              title: 'Invalid File Type',
              text: 'Please select an image file (JPG, PNG, GIF, etc.).',
              confirmButtonText: 'OK',
              confirmButtonColor: '#0A2C59'
            });
            
            // Clear the input
            input.value = '';
            label.style.display = 'inline-flex';
            fileNameSpan.textContent = '';
            fileNameSpan.title = '';
            fileNameSpan.style.display = 'none';
            updateIcons();
            return;
          }
          
          // File is valid, proceed with normal handling
          label.style.display = 'none';
          const originalFileName = file.name;
          const truncatedFileName = truncateFileName(originalFileName);
          fileNameSpan.textContent = truncatedFileName;
          fileNameSpan.title = originalFileName; // Show full name on hover
          fileNameSpan.style.display = 'inline-block';
        } else {
          label.style.display = 'inline-flex';
          fileNameSpan.textContent = '';
          fileNameSpan.title = '';
          fileNameSpan.style.display = 'none';
        }
        updateIcons();
      });
      updateIcons(); // Initial state
    }
  }

  // --- ADD: showImagePreview helper (uses existing modal) ---
  function showImagePreview(inputId) {
    const input = document.getElementById(inputId);
    let src = '';

    // Prefer selected file (local preview)
    if (input && input.files && input.files.length > 0) {
      src = URL.createObjectURL(input.files[0]);
    } else {
      // fallback: try data-url attributes or hidden URL inputs (server-provided URLs)
      if (input && input.dataset && input.dataset.url) src = input.dataset.url;
      const hidden = document.getElementById(`${inputId}Url`);
      if (!src && hidden && hidden.value) src = hidden.value;
    }

    if (!src) {
      Swal.fire("No file selected", "Please upload an image first.", "info");
      return;
    }

    // Use existing modal from HTML
    const modal = document.getElementById('imagePreviewModal');
    const imgEl = document.getElementById('previewImg');
    const closeBtn = document.getElementById('closePreviewBtn');

    if (!modal || !imgEl || !closeBtn) {
      console.error('Modal elements not found');
      return;
    }

    // Set up close button event listener (only once)
    if (!closeBtn.hasAttribute('data-listener-added')) {
      closeBtn.addEventListener('click', () => {
        modal.style.display = 'none';
        if (imgEl.dataset.objectUrl === 'true') {
          URL.revokeObjectURL(imgEl.src);
        }
        imgEl.src = '';
        delete imgEl.dataset.objectUrl;
      });
      closeBtn.setAttribute('data-listener-added', 'true');
    }

    // Set up modal click-to-close (only once)
    if (!modal.hasAttribute('data-listener-added')) {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          closeBtn.click();
        }
      });
      modal.setAttribute('data-listener-added', 'true');
    }

    // Set image source and show modal
    if (imgEl) {
      // revoke previous object URL if any
      if (imgEl.dataset.objectUrl === 'true' && imgEl.src) {
        try { URL.revokeObjectURL(imgEl.src); } catch (e) {}
      }
      imgEl.src = src;
      // determine if src is a blob/object URL
      imgEl.dataset.objectUrl = src.startsWith('blob:') ? 'true' : 'false';
    }

    modal.style.display = 'flex';
  }
  // --- END added helper ---

  // Sedula delete
  document.getElementById('deleteVoter').addEventListener('click', function() {
    handleFileDelete('voter', 'voterLabel', 'voterFileName');
  });
  // COE delete
  document.getElementById('deleteCOE').addEventListener('click', function() {
    handleFileDelete('coeImage', 'coeLabel', 'coeFileName');
  });
  // Front Image delete
  document.getElementById('deleteFront').addEventListener('click', function() {
    handleFileDelete('frontImage', 'frontLabel', 'frontFileName');
  });
  // Back Image delete
  document.getElementById('deleteBack').addEventListener('click', function() {
    handleFileDelete('backImage', 'backLabel', 'backFileName');
  });

  // Call for each file input
  handleFileInput('voter', 'voterLabel', 'voterFileName', 'viewVoter', 'deleteVoter');
  handleFileInput('coeImage', 'coeLabel', 'coeFileName', 'viewCOE', 'deleteCOE');
  handleFileInput('frontImage', 'frontLabel', 'frontFileName', 'viewFront', 'deleteFront');
  handleFileInput('backImage', 'backLabel', 'backFileName', 'viewBack', 'deleteBack');

  // Set age when birthday is loaded from backend
  const ageInput = document.getElementById('age');
  if (birthdayInput && ageInput) {
    // When birthday is fetched from backend
    if (birthdayInput.value) {
      ageInput.value = calculateAge(birthdayInput.value);
    }
    // When user changes birthday manually
    birthdayInput.addEventListener('change', function() {
      ageInput.value = calculateAge(birthdayInput.value);
    });
  }

  // Close preview button
  // document.getElementById('closePreviewBtn').addEventListener('click', function() {
  //   document.getElementById('imagePreviewModal').style.display = 'none';
  // });

  // Get user data from localStorage or sessionStorage
  // let userData = JSON.parse(localStorage.getItem('user')) || JSON.parse(sessionStorage.getItem('user')) || {};
  // const emailInput = document.getElementById('email');
  // if (emailInput && userData.email) {
  //   emailInput.value = userData.email; // Set the email input value
  //   emailInput.readOnly = true; // Optional: make it not editable
  // }

  // Restore form data from localStorage if available
const savedFormData = JSON.parse(sessionStorage.getItem('educationalAssistanceFormData') || '{}');
if (form && savedFormData) {
  Array.from(form.elements).forEach(el => {
    if (el.name && savedFormData[el.name] !== undefined) {
      if (el.type === "checkbox" || el.type === "radio") {
        el.checked = savedFormData[el.name] === true;
      } 
      // ✅ Skip file inputs
      else if (el.type === "file") {
        // do nothing for file input
      } 
      else {
        el.value = savedFormData[el.name];
      }
    }
  });
}


  // Save form data to localStorage on input change
  form.addEventListener('input', function() {
    const dataToSave = {};
    Array.from(form.elements).forEach(el => {
      if (el.name) {
        if (el.type === "checkbox" || el.type === "radio") {
          dataToSave[el.name] = el.checked;
        } else {
          dataToSave[el.name] = el.value;
        }
      }
    });
    sessionStorage.setItem('educationalAssistanceFormData', JSON.stringify(dataToSave));
  });

  // Clear saved data on successful submit
  form.addEventListener('submit', function() {
    sessionStorage.removeItem('educationalAssistanceFormData');
  });

  // ensure "Type of Benefiting" defaults to "Applicant" so user doesn't have to input it
  const typeEl = document.getElementById('typeOfBenefiting')
    || document.getElementById('typeOfBenefitting')
    || document.getElementById('benefitType')
    || document.getElementById('benefittype'); // fallback to existing id

  if (typeEl) {
    if (!typeEl.value) typeEl.value = 'Educational Assistance';
    // keep it submitted but prevent accidental change (do not disable if it's a select)
    if (typeEl.tagName === 'INPUT') typeEl.readOnly = true;
  }
});

// KK Profile Navigation
function handleKKProfileNavClick(event) {
  event.preventDefault();
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  Promise.all([
    fetch('http://localhost:5000/api/formcycle/status?formName=KK%20Profiling', {
      headers: { Authorization: `Bearer ${token}` }
    }),
    fetch('http://localhost:5000/api/kkprofiling/me', {
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
        if (result.isConfirmed) window.location.href = "confirmation/html/kkcofirmation.html";
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
        if (result.isConfirmed) window.location.href = "confirmation/html/kkcofirmation.html";
      });
      return;
    }
    // CASE 4: Form open, no profile → Show SweetAlert and go to form
    if (isFormOpen && !hasProfile) {
      Swal.fire({
        icon: "info",
        title: `No profile found`,
        text: `You don't have a profile yet. Please fill out the form to create one.`,
        confirmButtonText: "Go to form"
      }).then(() => {
        window.location.href = "kkform-personal.html";
      });
      return;
    }
  })
  .catch(() => window.location.href = "kkform-personal.html");
}

// LGBTQ+ Profile Navigation
function handleLGBTQProfileNavClick(event) {
  event.preventDefault();
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  Promise.all([
    fetch('http://localhost:5000/api/formcycle/status?formName=LGBTQIA%2B%20Profiling', {
      headers: { Authorization: `Bearer ${token}` }
    }),
    fetch('http://localhost:5000/api/lgbtqprofiling/me/profile', {
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
        if (result.isConfirmed) window.location.href = "confirmation/html/lgbtqconfirmation.html";
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
        if (result.isConfirmed) window.location.href = "confirmation/html/lgbtqconfirmation.html";
      });
      return;
    }
    // CASE 4: Form open, no profile → Show SweetAlert and go to form
    if (isFormOpen && !hasProfile) {
      Swal.fire({
        icon: "info",
        title: `No profile found`,
        text: `You don't have a profile yet. Please fill out the form to create one.`,
        confirmButtonText: "Go to form"
      }).then(() => {
        window.location.href = "lgbtqform.html";
      });
      return;
    }
  })
  .catch(() => window.location.href = "lgbtqform.html");
}

// Educational Assistance Navigation
function handleEducAssistanceNavClick(event) {
  event.preventDefault();
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  Promise.all([
    fetch('http://localhost:5000/api/formcycle/status?formName=Educational%20Assistance', {
      headers: { Authorization: `Bearer ${token}` }
    }),
    fetch('http://localhost:5000/api/educational-assistance/me', {
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
        if (result.isConfirmed) window.location.href = "confirmation/html/educConfirmation.html";
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
        if (result.isConfirmed) window.location.href = "confirmation/html/educConfirmation.html";
      });
      return;
    }
    // CASE 4: Form open, no profile → Show SweetAlert and go to form
    if (isFormOpen && !hasProfile) {
      Swal.fire({
        icon: "info",
        title: `No profile found`,
        text: `You don't have a profile yet. Please fill out the form to create one.`,
        confirmButtonText: "Go to form"
      }).then(() => {
        window.location.href = "Educational-assistance-user.html";
      });
      return;
    }
  })
  .catch(() => window.location.href = "Educational-assistance-user.html");
}

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

// remove the stray removal at file bottom (do not clear saved data on load)
// localStorage.removeItem('educationalAssistanceFormData');

function handleFileDelete(inputId, labelId, fileNameId) {
  const input = document.getElementById(inputId);
  const label = document.getElementById(labelId);
  const fileNameSpan = document.getElementById(fileNameId);

  // Clear file input (allowed only to set to empty string)
  if (input) {
    try { input.value = ''; } catch (e) { /* ignore */ }
  }

  // Restore add/plus label and hide filename
  if (label) label.style.display = 'inline-flex';
  if (fileNameSpan) {
    fileNameSpan.textContent = '';
    fileNameSpan.title = '';
    fileNameSpan.style.display = 'none';
  }

  // Reset view icon and delete icon states for known IDs
  const viewMap = {
    voter: 'viewVoter',
    coeImage: 'viewCOE',
    frontImage: 'viewFront',
    backImage: 'viewBack'
  };
  const deleteMap = {
    voter: 'deleteVoter',
    coeImage: 'deleteCOE',
    frontImage: 'deleteFront',
    backImage: 'deleteBack'
  };

  const viewIcon = document.getElementById(viewMap[inputId] || `view${capitalize(inputId)}`);
  const deleteIcon = document.getElementById(deleteMap[inputId] || `delete${capitalize(inputId)}`);

  if (viewIcon) {
    viewIcon.classList.remove('fa-eye');
    viewIcon.classList.add('fa-eye-slash', 'disabled');
    viewIcon.style.pointerEvents = 'none';
    viewIcon.style.opacity = '0.5';
  }
  if (deleteIcon) {
    deleteIcon.classList.add('disabled');
    deleteIcon.style.pointerEvents = 'none';
    deleteIcon.style.opacity = '0.5';
  }

  // clear any server URL holder if present
  const hiddenUrl = document.getElementById(`${inputId}Url`);
  if (hiddenUrl) hiddenUrl.value = '';
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}