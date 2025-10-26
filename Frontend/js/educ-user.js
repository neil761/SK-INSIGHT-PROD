document.addEventListener('DOMContentLoaded', async function() {
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

  const form = document.getElementById('educationalAssistanceForm');
  if (!form) return; // Prevents error if form is missing

  // Fetch birthday and set it in the form
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  if (token) {
    try {
      const res = await fetch('http://localhost:5000/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const user = await res.json();
        const birthdayInput = document.getElementById('birthday');
        if (birthdayInput && user.birthday) {
          birthdayInput.value = user.birthday.split('T')[0]; // format as yyyy-mm-dd
          birthdayInput.readOnly = true; // make it non-editable
        }

        // After fetching user data
        if (user.email) {
          const emailInput = document.getElementById('email');
          if (emailInput) {
            emailInput.value = user.email;
            emailInput.readOnly = true; // Optional: make email not editable
          }
        }
      }
    } catch (err) {
      console.error('Failed to fetch birthday:', err);
    }
  }
    document.getElementById('benefittype').value = 'Educational Assistance';

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Client-side validation (add/remove fields as required by your backend)
    const requiredIds = ['surname','firstName','birthday','contact','year'];
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
formData.append('age', Number(document.getElementById('age')?.value || 0));
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

    // Files (only append if present and valid)
    const maybeAppendFile = (id, key) => {
      const inp = document.getElementById(id);
      if (inp && inp.files && inp.files.length > 0) {
        const file = inp.files[0];
        const maxSize = 5 * 1024 * 1024; // 5MB in bytes
        
        // Double-check file size before submission
        if (file.size > maxSize) {
          throw new Error(`File "${file.name}" is too large (${(file.size / (1024 * 1024)).toFixed(2)}MB). Maximum size allowed is 5MB.`);
        }
        
        // Check file type
        if (!file.type.startsWith('image/')) {
          throw new Error(`File "${file.name}" is not a valid image file. Please upload JPG, PNG, GIF, or other image formats.`);
        }
        
        formData.append(key, file);
      }
    };
    try {
      // Validate and append files
      maybeAppendFile('voter', 'voter');
      maybeAppendFile('coeImage', 'coeImage');
      maybeAppendFile('frontImage', 'frontImage');
      maybeAppendFile('backImage', 'backImage');
    } catch (fileError) {
      return Swal.fire({
        icon: 'error',
        title: 'File Validation Error',
        text: fileError.message,
        confirmButtonText: 'OK',
        confirmButtonColor: '#0A2C59'
      });
    }

    try {
      Swal.fire({
        title: 'Submitting...',
        text: 'Please wait while your application is being submitted.',
        allowOutsideClick: false,
        allowEscapeKey: false,
        didOpen: () => Swal.showLoading()
      });

      const res = await fetch('http://localhost:5000/api/educational-assistance', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token') || localStorage.getItem('token')}`
        },
        body: formData
      });

      Swal.close();

      const text = await res.text();
      let data = null;
      try { data = JSON.parse(text); } catch (err) {}

      if (res.status === 403 && (data?.error?.includes('age') || data?.error?.includes('eligible'))) {
        return Swal.fire({
          icon: 'error',
          title: 'Not Eligible',
          text: data?.error || 'You are not eligible to submit this form due to age restrictions.',
          confirmButtonColor: '#0A2C59'
        });
      }

      if (!res.ok) {
        const message = data?.message || data?.error || text || `Server returned ${res.status}`;
        return Swal.fire('Submission failed', message, 'error');
      }

      // success
      Swal.fire('Success', data?.message || 'Form submitted successfully!', 'success').then(() => {
        sessionStorage.removeItem('educ_siblings');
        sessionStorage.removeItem('educ_expenses');
        sessionStorage.removeItem('educationalAssistanceFormData');
        window.location.href = "confirmation/html/educConfirmation.html";
      });
      form.reset();
    } catch (err) {
      Swal.close();
      Swal.fire('Error', 'Network or server error. Check console for details.', 'error');
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
  const birthdayInput = document.getElementById('birthday');
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
  let userData = JSON.parse(localStorage.getItem('user')) || JSON.parse(sessionStorage.getItem('user')) || {};
  const emailInput = document.getElementById('email');
  if (emailInput && userData.email) {
    emailInput.value = userData.email;
    emailInput.readOnly = true; // Optional: make it not editable
  }

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
    // CASE 4: Form open, no profile → Go to form
    window.location.href = "kkform-personal.html";
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
    // CASE 4: Form open, no profile → Go to form
    window.location.href = "lgbtqform.html";
  })
  .catch(() => window.location.href = "lgbtqform.html");
}

// Educational Assistance Navigation
function handleEducAssistanceNavClick(event) {
  event.preventDefault();
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  // if (!token) {
  //   Swal.fire({
  //     icon: 'warning',
  //     title: 'You need to log in first',
  //     text: 'Please log in to access Educational Assistance.',
  //     confirmButtonText: 'OK'
  //   }).then(() => {
  //     window.location.href = '/Frontend/html/user/login.html';
  //   });
  //   return;
  // }
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
    // CASE 4: Form open, no profile → Go to form
    window.location.href = "Educational-assistance-user.html";
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