document.addEventListener('DOMContentLoaded', async function () {

  if (typeof window !== 'undefined' && typeof window.initNavbarHamburger === 'function') {
    try { 
      window.initNavbarHamburger(); 
    } catch (e) {
       /* ignore */ 
      }
  } 


  const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
    ? window.API_BASE
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : 'https://sk-insight.online';
  const isMobile = window.innerWidth <= 768; // Detect mobile devices (adjust breakpoint as needed)

  // Remove <thead> for mobile devices
  if (isMobile) {
    const siblingsTableHead = document.querySelector('#siblingsTable thead');
    const expensesTableHead = document.querySelector('#expensesTable thead');

    if (siblingsTableHead) siblingsTableHead.style.display = 'none'; // Hide <thead> for siblings table
    if (expensesTableHead) expensesTableHead.style.display = 'none'; // Hide <thead> for expenses table
  }

  async function fetchUserDetails() {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) {
      console.error('No token found. User is not logged in.');
      return null;
    }

    try {
      const response = await fetch(`${API_BASE}/api/users/me`, {
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

  // Check latest application status for this user in the present cycle
  try {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (token) {
      const appRes = await fetch(`${API_BASE}/api/educational-assistance/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (appRes.ok) {
        let app = await appRes.json();
        // If backend returned an array of historical submissions, prefer the latest one
        if (Array.isArray(app) && app.length > 0) app = app[app.length - 1];

        const statusVal = (app && (app.status || app.decision || app.adminDecision || app.result)) || '';
        const status = (statusVal || '').toString().toLowerCase();

        // If latest is rejected -> when already on the form page, silently clear drafts and allow continuing.
        if (/(reject|denied|rejected)/i.test(status) || (app && (app.rejected === true || app.isRejected === true))) {
          try {
            sessionStorage.removeItem('educationalAssistanceFormData');
            sessionStorage.removeItem('educ_siblings');
            sessionStorage.removeItem('educ_expenses');
          } catch (e) { /* ignore */ }
          // If we are on the form page (this script runs on it), do not show an alert — just continue with the cleared draft.
          // Other pages that call the shared helper will still show the alert+redirect behavior.
        }

        // If latest is pending or approved (or similar), tell the user they already applied and offer to view response
        if (/pending|approve|approved|ending/i.test(status) || (app && (app.status === 'pending' || app.status === 'approved'))) {
          const res = await Swal.fire({
            icon: 'info',
            title: 'Application Exists',
            text: 'You already applied for Educational Assistance for the current cycle. Do you want to view your response?',
            showCancelButton: true,
            confirmButtonText: 'View my response',
            cancelButtonText: 'Stay on form'
          });
          if (res.isConfirmed) {
            window.location.href = 'confirmation/html/educConfirmation.html';
            return;
          }
        }
      }
      // if 404 or other non-ok, treat as no application and allow apply
    }
  } catch (e) {
    console.warn('Could not check existing application status', e);
  }

  // Fetch and set the user's birthday
  const birthdayInput = document.getElementById('birthday');
  if (birthdayInput && userDetails?.birthday) {
    birthdayInput.value = userDetails.birthday.split('T')[0]; // Format as yyyy-mm-dd
    birthdayInput.readOnly = true; // Make it non-editable
  }

  // Populate name fields from user details if they are empty (do not overwrite user input)
  try {
    const surnameEl = document.getElementById('surname');
    const firstNameEl = document.getElementById('firstName');
    const middleNameEl = document.getElementById('middleName');

    if (surnameEl && (!surnameEl.value || surnameEl.value === '')) {
      surnameEl.value = userDetails.surname || userDetails.lastname || userDetails.lastName || '';
    }
    if (firstNameEl && (!firstNameEl.value || firstNameEl.value === '')) {
      firstNameEl.value = userDetails.firstName || userDetails.firstname || userDetails.givenName || '';
    }
    if (middleNameEl && (!middleNameEl.value || middleNameEl.value === '')) {
      middleNameEl.value = userDetails.middleName || userDetails.middlename || '';
    }
  } catch (e) { /* ignore errors */ }

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

  // Helper: show inline tooltip-style warning anchored to a field and highlight its row
  function showInlineFieldWarning(targetEl, message, autoDismissMs = 6000) {
    try {
      if (!targetEl) return;
      // remove existing tooltip if any
      const existing = document.getElementById('inlineMissingTooltip');
      if (existing && existing.parentNode) existing.parentNode.removeChild(existing);

      const row = targetEl.closest ? (targetEl.closest('tr') || targetEl) : targetEl;
      if (row && row.scrollIntoView) row.scrollIntoView({ behavior: 'smooth', block: 'center' });

      if (row) {
        row.style.outline = '2px solid rgba(255,165,0,0.7)';
        row.setAttribute('data-missing-highlight', 'true');
      }

      const tip = document.createElement('div');
      tip.id = 'inlineMissingTooltip';
      tip.textContent = message;
      tip.style.cssText = 'position:absolute;background:#fff;border:1px solid #f0ad4e;color:#333;padding:10px 12px;border-radius:6px;box-shadow:0 2px 10px rgba(0,0,0,0.12);z-index:2147483647;font-size:13px;max-width:320px';
      document.body.appendChild(tip);

      // position tooltip relative to target
      const rect = targetEl.getBoundingClientRect();
      const tipRect = tip.getBoundingClientRect();
      let left = rect.left + window.scrollX + (rect.width - tipRect.width) / 2;
      if (left < 8) left = 8;
      let top = rect.top + window.scrollY - tipRect.height - 10;
      if (top < window.scrollY + 8) top = rect.bottom + window.scrollY + 10;
      tip.style.left = `${Math.round(left)}px`;
      tip.style.top = `${Math.round(top)}px`;

      // Make the target focusable if it isn't
      let prevTab = null;
      let addedTab = false;
      try {
        if (typeof targetEl.tabIndex === 'number' && targetEl.tabIndex < 0) {
          prevTab = targetEl.getAttribute('tabindex');
          targetEl.setAttribute('tabindex', '-1');
          addedTab = true;
        } else if (typeof targetEl.tabIndex === 'undefined' || targetEl.tabIndex === null) {
          // some elements may not expose tabIndex; ensure focusable
          prevTab = targetEl.getAttribute && targetEl.getAttribute('tabindex');
          targetEl.setAttribute && targetEl.setAttribute('tabindex', '-1');
          addedTab = true;
        }
      } catch (e) { /* ignore tabindex manipulation errors */ }

      // Keep focus on the target until the user interacts (input/keydown/click outside)
      let userInteracted = false;

      const onUserInteract = () => {
        userInteracted = true;
        cleanup();
      };

      const onBlur = (ev) => {
        if (userInteracted) return;
        // re-focus after a short delay to avoid focus race conditions
        setTimeout(() => {
          try { if (!userInteracted && typeof targetEl.focus === 'function') targetEl.focus({ preventScroll: true }); } catch (e) {}
        }, 20);
      };

      const onDocClick = (ev) => {
        // if click is inside target or tip, treat it as interaction
        if (targetEl.contains && targetEl.contains(ev.target)) return;
        if (tip.contains && tip.contains(ev.target)) return;
        onUserInteract();
      };

      function cleanup() {
        try { if (tip && tip.parentNode) tip.parentNode.removeChild(tip); } catch (e) {}
        try { if (row) { row.style.outline = ''; row.removeAttribute('data-missing-highlight'); } } catch (e) {}
        try { targetEl.removeEventListener('blur', onBlur, true); } catch (e) {}
        try { targetEl.removeEventListener('input', onUserInteract, true); } catch (e) {}
        try { targetEl.removeEventListener('keydown', onUserInteract, true); } catch (e) {}
        try { document.removeEventListener('click', onDocClick, true); } catch (e) {}
        try { tip.removeEventListener('click', onUserInteract); } catch (e) {}
        if (addedTab) {
          try {
            if (prevTab !== null && prevTab !== undefined) targetEl.setAttribute('tabindex', prevTab);
            else targetEl.removeAttribute && targetEl.removeAttribute('tabindex');
          } catch (e) {}
        }
        try { clearTimeout(autoTimeout); } catch (e) {}
      }

      tip.addEventListener('click', onUserInteract);
      targetEl.addEventListener('input', onUserInteract, true);
      targetEl.addEventListener('keydown', onUserInteract, true);
      targetEl.addEventListener('blur', onBlur, true);
      document.addEventListener('click', onDocClick, true);

      const autoTimeout = setTimeout(() => { if (!userInteracted) cleanup(); }, autoDismissMs);

      // attempt to focus the target (prevent scrolling since we've already scrolled the row)
      try { if (typeof targetEl.focus === 'function') targetEl.focus({ preventScroll: true }); } catch (e) {}
    } catch (e) { /* ignore failures showing inline tooltip */ }
  }

  // Set default benefit type
  document.getElementById('benefittype').value = 'Educational Assistance';

  form.addEventListener('submit', async function (e) {
    e.preventDefault();

    // Ask user for confirmation before running validations and submitting
    const confirmResult = await Swal.fire({
      title: 'Are you sure?',
      text: 'Are you sure you want to submit your application? Please confirm that all information is correct.',
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Yes',
      cancelButtonText: 'Cancel',
      confirmButtonColor: '#0A2C59',
      cancelButtonColor: "#d33",
    });
    if (!confirmResult.isConfirmed) return; // user cancelled

    // Client-side validation (match backend required fields to avoid server 500)


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
    // Validate contact numbers: accept typical separators (spaces/dashes) by normalizing to digits
    const contactRaw = document.getElementById('contact')?.value || '';
    const fatherRaw = document.getElementById('fathercontact')?.value || '';
    const motherRaw = document.getElementById('mothercontact')?.value || '';
    const normalize = s => (s || '').toString().replace(/\D/g, ''); // strip non-digits
    const contactDigits = normalize(contactRaw);
    const fatherDigits = normalize(fatherRaw);
    const motherDigits = normalize(motherRaw);

    if (contactDigits.length !== 11 || !contactDigits.startsWith('09')) {
      await Swal.fire({
        icon: 'error',
        title: 'Invalid Contact Number',
        text: "Contact number must be 11 digits and start with '09' (e.g. 09171234567).",
      });
      try { const t = document.getElementById('contact'); if (t && typeof t.focus === 'function') t.focus(); } catch (e) {}
      return;
    }
    if (fatherDigits) {
      if (fatherDigits.length !== 11 || !fatherDigits.startsWith('09')) {
        await Swal.fire({
          icon: 'error',
          title: 'Invalid Contact Number',
          text: "Please enter an 11-digit contact number for Father that starts with '09', or leave it empty.",
        });
        try { const t = document.getElementById('fathercontact'); if (t && typeof t.focus === 'function') t.focus(); } catch (e) {}
        return;
      }
    }
    if (motherDigits) {
      if (motherDigits.length !== 11 || !motherDigits.startsWith('09')) {
        await Swal.fire({
          icon: 'error',
          title: 'Invalid Contact Number',
          text: "Please enter an 11-digit contact number for Mother that starts with '09', or leave it empty.",
        });
        try { const t = document.getElementById('mothercontact'); if (t && typeof t.focus === 'function') t.focus(); } catch (e) {}
        return;
      }
    }

    // Append normalized contact numbers as strings (preserve leading zeroes)
    formData.append('contactNumber', String(contactDigits)); // Ensure it's sent as string
    formData.append('school', document.getElementById('schoolname')?.value || '');
    formData.append('schoolAddress', document.getElementById('schooladdress')?.value || '');
    formData.append('year', document.getElementById('year')?.value || '');
    formData.append('typeOfBenefit', typeValue); // <-- use this name
    formData.append('fatherName', document.getElementById('fathername')?.value || '');
  formData.append('fatherPhone', String(fatherDigits || '')); // Ensure it's sent as string
    formData.append('motherName', document.getElementById('mothername')?.value || '');
  formData.append('motherPhone', String(motherDigits || '')); // Ensure it's sent as string

    // siblings & expenses as before
    const siblings = [];
    document.querySelectorAll('#siblingsTableBody .sibling-card, #siblingsTableBody tr').forEach(row => {
      const nameEl = row.querySelector('.sibling-name');
      const genderEl = row.querySelector('.sibling-gender');
      const ageEl = row.querySelector('.sibling-age');
      if (nameEl && genderEl && ageEl) {
        siblings.push({
          name: nameEl.value.trim(),
          gender: genderEl.value.trim(),
          age: Number(ageEl.value.trim()),
        });
      }
    });
    formData.append('siblings', JSON.stringify(siblings));

    const expenses = [];
    document.querySelectorAll('#expensesTableBody .expense-card, #expensesTableBody tr').forEach(row => {
      const itemEl = row.querySelector('.expense-item');
      const costEl = row.querySelector('.expense-cost');
      if (itemEl && costEl && itemEl.value.trim() && costEl.value.trim()) {
        expenses.push({
          item: itemEl.value.trim(),
          expectedCost: Number(costEl.value.trim()),
        });
      }
    });

    if (expenses.length === 0) {
      const target = document.getElementById('addExpenseBtn') || document.getElementById('expensesTable') || document.getElementById('expensesTableBody');
      showInlineFieldWarning(target || document.getElementById('addExpenseBtn'), 'Please provide at least one fee or expense.');
      return;
    }

    formData.append('expenses', JSON.stringify(expenses));

    // Append file inputs (requirements). Exclude parent's voter certificate for Senior High students
    const fileInputs = ['frontImage', 'backImage', 'coeImage'];
    try {
      const acadVal = (document.getElementById('academicLevel') && document.getElementById('academicLevel').value) ? document.getElementById('academicLevel').value : '';
      if (!/senior\s*high/i.test(acadVal)) {
        fileInputs.push('voter');
      }
    } catch (e) { /* ignore and include voter by default below */ }

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

      const response = await fetch(`${API_BASE}/api/educational-assistance`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sessionStorage.getItem('token') || localStorage.getItem('token')}`
        },
        body: formData
      });

      Swal.close();

      // Read response text for better diagnostics
      const text = await response.text();
      let data = null;
      try { data = JSON.parse(text); } catch (err) { /* not JSON */ }

      // Log detailed info to console to help debug 500s
      if (!response.ok) {
        console.error('Educational assistance submit failed', {
          status: response.status,
          statusText: response.statusText,
          bodyText: text,
          json: data
        });
      }

      if (response.status === 403 && (data?.error?.includes('age') || data?.error?.includes('eligible'))) {
        return Swal.fire({
          icon: 'error',
          title: 'Not Eligible',
          text: data?.error || 'You are not eligible to submit this form due to age restrictions.',
          confirmButtonColor: '#0A2C59'
        });
      }

      if (!response.ok) {
        // Prefer server-provided message when available
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

  const siblingsContainer = document.getElementById('siblingsTableBody');
  const expensesContainer = document.getElementById('expensesTableBody');
  const siblingsTable = document.getElementById('siblingsTable');
  const expensesTable = document.getElementById('expensesTable');

  // Function to save siblings to sessionStorage
  function saveSiblings() {
    const siblings = [];
    document.querySelectorAll('#siblingsTableBody .sibling-card, #siblingsTableBody tr').forEach((row) => {
      const nameEl = row.querySelector('.sibling-name');
      const genderEl = row.querySelector('.sibling-gender');
      const ageEl = row.querySelector('.sibling-age');
      if (nameEl && genderEl && ageEl) {
        siblings.push({
          name: nameEl.value.trim(),
          gender: genderEl.value.trim(),
          age: Number(ageEl.value.trim()),
        });
      }
    });
    sessionStorage.setItem('educ_siblings', JSON.stringify(siblings));
  }

  // Function to save expenses to sessionStorage
  function saveExpenses() {
    const expenses = [];
    document.querySelectorAll('#expensesTableBody .expense-card, #expensesTableBody tr').forEach((row) => {
      const itemEl = row.querySelector('.expense-item');
      const costEl = row.querySelector('.expense-cost');
      if (itemEl && costEl) {
        expenses.push({
          item: itemEl.value.trim(),
          expectedCost: Number(costEl.value.trim()),
        });
      }
    });
    sessionStorage.setItem('educ_expenses', JSON.stringify(expenses));
  }

  // Function to render siblings as cards or table rows
  function renderSiblings() {
    const siblings = JSON.parse(sessionStorage.getItem('educ_siblings') || '[]');
    const siblingsContainer = document.getElementById('siblingsTableBody');
    const isMobile = window.innerWidth <= 480; // Detect mobile devices

    siblingsContainer.innerHTML = ''; // Clear existing siblings

    siblings.forEach((sibling, index) => {
      if (isMobile) {
        // Render as cards for mobile
        const siblingCard = document.createElement('div');
        siblingCard.classList.add('sibling-card');
        siblingCard.innerHTML = `
          <div class="sibling-field">
            <label>Name:</label>
            <input type="text" class="sibling-name" required value="${escapeHtml(sibling.name || '')}">
          </div>
          <div class="sibling-field">
            <label>Age:</label>
            <input type="number" class="sibling-age" min="0" required value="${sibling.age || ''}">
          </div>
          <div class="sibling-field">
            <label>Gender:</label>
            <select class="sibling-gender" required>
              <option value="">Select</option>
              <option value="Male" ${sibling.gender === 'Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${sibling.gender === 'Female' ? 'selected' : ''}>Female</option>
            </select>
          </div>
          <button type="button" class="removeSiblingBtn" data-index="${index}">Remove</button>
        `;
        siblingsContainer.appendChild(siblingCard);
      } else {
        // Render as table rows for larger screens
        const siblingRow = document.createElement('tr');
        siblingRow.innerHTML = `
          <td><input type="text" class="sibling-name" required value="${escapeHtml(sibling.name || '')}"></td>
          <td><input type="number" class="sibling-age" min="0" required value="${sibling.age || ''}"></td>
          <td>
            <select class="sibling-gender" required>
              <option value="">Select</option>
              <option value="Male" ${sibling.gender === 'Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${sibling.gender === 'Female' ? 'selected' : ''}>Female</option>
            </select>
          </td>
          <td><button type="button" class="removeSiblingBtn" data-index="${index}">Remove</button></td>
        `;
        siblingsContainer.appendChild(siblingRow);
      }
    });

    // Add event listeners for "Remove" buttons
    document.querySelectorAll('.removeSiblingBtn').forEach((button) => {
      button.addEventListener('click', function () {
        const index = this.getAttribute('data-index');
        siblings.splice(index, 1); // Remove the sibling from the array
        sessionStorage.setItem('educ_siblings', JSON.stringify(siblings)); // Save updated siblings to sessionStorage
        renderSiblings(); // Re-render siblings
      });
    });

    // Show or hide the table header based on screen size
    const siblingsTableHead = siblingsTable.querySelector('thead');
    if (siblingsTableHead) siblingsTableHead.style.display = isMobile ? 'none' : '';
  }

  // Function to render expenses as cards or table rows
  function renderExpenses() {
    const expenses = JSON.parse(sessionStorage.getItem('educ_expenses') || '[]');
    const expensesContainer = document.getElementById('expensesTableBody');
    const isMobile = window.innerWidth <= 480; // Detect mobile devices

    expensesContainer.innerHTML = ''; // Clear existing expenses

    expenses.forEach((expense, index) => {
      if (isMobile) {
        // Render as cards for mobile
        const expenseCard = document.createElement('div');
        expenseCard.classList.add('expense-card');
        expenseCard.innerHTML = `
          <div class="expense-field">
            <label>Fees and Other Expenses:</label>
            <input type="text" class="expense-item" required value="${escapeHtml(expense.item || '')}">
          </div>
          <div class="expense-field">
            <label>Expected Cost:</label>
            <div class="expense-cost-wrapper">
              <span class="peso-prefix">₱</span>
              <input type="number" class="expense-cost" min="0" required value="${expense.expectedCost || ''}">
              <span class="peso-suffix">.00</span>
            </div>
          </div>
          <button type="button" class="removeExpenseBtn" data-index="${index}">Remove</button>
        `;
        expensesContainer.appendChild(expenseCard);
      } else {
        // Render as table rows for larger screens
        const expenseRow = document.createElement('tr');
        expenseRow.innerHTML = `
          <td><input type="text" class="expense-item" required value="${escapeHtml(expense.item || '')}"></td>
          <td>
            <div class="expense-cost-wrapper">
              <span class="peso-prefix">₱</span>
              <input type="number" class="expense-cost" min="0" required value="${expense.expectedCost || ''}">
              <span class="peso-suffix">.00</span>
            </div>
          </td>
          <td><button type="button" class="removeExpenseBtn" data-index="${index}">Remove</button></td>
        `;
        expensesContainer.appendChild(expenseRow);
      }
    });

    // Add event listeners for "Remove" buttons
    document.querySelectorAll('.removeExpenseBtn').forEach((button) => {
      button.addEventListener('click', function () {
        const index = this.getAttribute('data-index');
        expenses.splice(index, 1); // Remove the expense from the array
        sessionStorage.setItem('educ_expenses', JSON.stringify(expenses)); // Save updated expenses to sessionStorage
        renderExpenses(); // Re-render expenses
      });
    });

    // Show or hide the table header based on screen size
    const expensesTableHead = expensesTable.querySelector('thead');
    if (expensesTableHead) expensesTableHead.style.display = isMobile ? 'none' : '';
  }

  // Basic styles for expense-cost wrapper (added via JS to avoid editing CSS files)
  (function injectExpenseCostStyles() {
    if (document.getElementById('expense-cost-injected-styles')) return;
    const style = document.createElement('style');
    style.id = 'expense-cost-injected-styles';
    style.textContent = `
      .expense-cost-wrapper{display:inline-flex;align-items:center;gap:6px}
      .expense-cost-wrapper .peso-prefix{font-weight:600}
      .expense-cost-wrapper .peso-suffix{color:#666}
      .expense-cost-wrapper input.expense-cost{width:120px}
      @media(max-width:480px){ .expense-cost-wrapper input.expense-cost{width:100px} }
    `;
    document.head.appendChild(style);
  })();

  // Restore siblings and expenses on page load
  renderSiblings();
  renderExpenses();

  // Save data before re-rendering on screen resize
  window.addEventListener('resize', () => {
    saveSiblings(); // Save current sibling data
    saveExpenses(); // Save current expense data
    renderSiblings(); // Re-render siblings
    renderExpenses(); // Re-render expenses
  });

  // Utility function to escape HTML
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

  // Navbar and navigation logic is now handled by shared navbar.js
  // All local hamburger/nav button code removed for maintainability.

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
      input.addEventListener('change', function () {
        if (input.files && input.files.length > 0) {
          const file = input.files[0];
          const maxSize = 5 * 1024 * 1024; // 5MB in bytes
          const allowedTypes = ['image/png', 'image/jpeg']; // Allowed file types

          // Check file type
          if (!allowedTypes.includes(file.type)) {
            Swal.fire({
              icon: 'error',
              title: 'Invalid File Type',
              text: 'Only PNG and JPG files are allowed.',
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
      try {
        // Avoid restoring file inputs via this generic loop
        if (el.type === 'file') return;
        el.value = savedFormData[el.name];
      } catch (e) { /* ignore per-field restore errors */ }
    }
  });

  // After restoring raw values, ensure year options match academic level and only show year after level selected
  const academicLevelEl = document.getElementById('academicLevel');
  const yearEl = document.getElementById('year');
  const yearWrapper = document.getElementById('yearWrapper');
  const JHS_YEARS = ['Grade 7', 'Grade 8', 'Grade 9', 'Grade 10'];
  const SHS_YEARS = ['Grade 11', 'Grade 12'];

  function populateYearOptions(level, selectedYear) {
    if (!yearEl) return;
    yearEl.innerHTML = '<option value="">Select Classification</option>';
    let options = [];
    const lvl = (level || '').toString().toLowerCase();

    if (lvl.includes('junior')) {
      options = JHS_YEARS;
    } else if (lvl.includes('senior')) {
      options = SHS_YEARS;
    } else {
      // fallback: do not include JHS by default — keep empty so user chooses level first
      options = [];
    }

    // ensure selectedYear is present and selected only if it belongs to options
    options.forEach(opt => {
      const o = document.createElement('option');
      o.value = opt;
      o.textContent = opt;
      if (selectedYear && selectedYear === opt) o.selected = true;
      yearEl.appendChild(o);
    });

    // If selectedYear was provided but isn't in options, do NOT set it (avoid incorrect restore)
    if (selectedYear && !options.includes(selectedYear)) {
      // leave year empty so user selects appropriate year for chosen level
      yearEl.value = "";
    }
  }

  // Use saved academic + saved year but only set year if it is valid for that level
  const savedAcademic = savedFormData.academicLevel || document.getElementById('academicLevel')?.value || '';
  const savedYear = savedFormData.year || document.getElementById('year')?.value || '';

  // Initially hide the year wrapper until an academic level is chosen (mirror original behaviour)
  if (yearWrapper) {
    yearWrapper.style.display = savedAcademic ? '' : 'none';
  }

  if (academicLevelEl) {
    // Populate year options using saved academic level, but only restore year when valid
    populateYearOptions(savedAcademic, savedYear);

    // apply initial visibility based on savedAcademic
    if (savedAcademic) {
      academicLevelEl.value = savedAcademic;
      yearWrapper.style.display = '';
    }

    // Helper: hide/show voter ID requirement when academic level is Senior High
    function isSeniorHigh(level) {
      return /senior\s*high/i.test((level || '').toString());
    }

    function toggleVoterVisibility(level) {
      try {
        const label = document.getElementById('voterLabel');
        const input = document.getElementById('voter');
        const viewIcon = document.getElementById('viewVoter');
        const deleteIcon = document.getElementById('deleteVoter');
        // find enclosing table row if present
        let row = null;
        if (label) row = label.closest && label.closest('tr');
        if (!row && viewIcon) row = viewIcon.closest && viewIcon.closest('tr');
        // Determine desired state
        const hide = isSeniorHigh(level);
        if (row) row.style.display = hide ? 'none' : '';
        // If hiding, also clear file input and filename UI so it isn't submitted
        if (input) {
          try {
            // Toggle the required attribute so native validation doesn't try to focus hidden inputs
            input.required = !hide;
            if (!hide) input.setAttribute('required', ''); else input.removeAttribute('required');
            // Clear value when hiding to avoid accidental submission
            if (hide) input.value = '';
          } catch (e) { /* ignore input toggling errors */ }
        }
        const fname = document.getElementById('voterFileName');
        if (fname) {
          if (hide) { fname.textContent = ''; fname.classList.remove('visible'); }
        }
        if (viewIcon) viewIcon.style.display = hide ? 'none' : '';
        if (deleteIcon) deleteIcon.style.display = hide ? 'none' : '';
      } catch (e) { /* ignore errors toggling voter row */ }
    }

    // Apply initial voter visibility based on restored or current value
    try { toggleVoterVisibility(savedAcademic || academicLevelEl.value || ''); } catch (e) {}

    // When the user changes academic level, repopulate year options and clear invalid year
    academicLevelEl.addEventListener('change', function () {
      const lvl = academicLevelEl.value || '';
      populateYearOptions(lvl, ""); // don't force previous year
      // show year area when a known level chosen
      yearWrapper.style.display = lvl ? '' : 'none';
      // clear stored year if it's not valid for new level
      try {
        const currentYear = yearEl.value;
        const allowedYears = lvl.toLowerCase().includes('junior') ? JHS_YEARS :
                             lvl.toLowerCase().includes('senior') ? SHS_YEARS : [];
        if (!allowedYears.includes(currentYear)) {
          yearEl.value = "";
          // also remove stale saved year from sessionStorage to avoid later restore conflicts
          const s = JSON.parse(sessionStorage.getItem('educationalAssistanceFormData') || '{}');
          if (s && s.year) { delete s.year; sessionStorage.setItem('educationalAssistanceFormData', JSON.stringify(s)); }
        }
      } catch (e) { /* ignore */ }
      // Toggle voter requirement visibility when academic level changes
      try { toggleVoterVisibility(lvl); } catch (e) { }
    });
  } else {
    if (savedYear && yearEl) { yearEl.value = savedYear; }
  }
}


  // Save form data to sessionStorage on input change (attach only if form exists)
if (form) {
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
} else {
  console.warn('educ-user: #educationalAssistanceForm not found — autosave hooks skipped');
}

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

  document.getElementById('addSiblingBtn').addEventListener('click', function () {
    const siblingsContainer = document.getElementById('siblingsTableBody');
    const isMobile = window.innerWidth <= 480; // Detect mobile devices

    if (isMobile) {
      // Create a sibling card for mobile devices
      const siblingCard = document.createElement('div');
      siblingCard.classList.add('sibling-card');
      siblingCard.innerHTML = `
        <div class="sibling-field">
          <label>Name:</label>
          <input type="text" class="sibling-name" required>
        </div>
        <div class="sibling-field">
          <label>Age:</label>
          <input type="number" class="sibling-age" min="0" required>
        </div>
        <div class="sibling-field">
          <label>Gender:</label>
          <select class="sibling-gender" required>
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
        <button type="button" class="removeSiblingBtn">Remove</button>
      `;

      // Add event listener for the "Remove" button
      siblingCard.querySelector('.removeSiblingBtn').addEventListener('click', function () {
        siblingCard.remove();
        saveSiblings(); // Save siblings after removing
      });

      siblingsContainer.appendChild(siblingCard);
    } else {
      // Create a sibling row for larger screens
      const siblingRow = document.createElement('tr');
      siblingRow.innerHTML = `
        <td><input type="text" class="sibling-name" required></td>
        <td><input type="number" class="sibling-age" min="0" required></td>
        <td>
          <select class="sibling-gender" required>
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </td>
        <td><button type="button" class="removeSiblingBtn">Remove</button></td>
      `;

      // Add event listener for the "Remove" button
      siblingRow.querySelector('.removeSiblingBtn').addEventListener('click', function () {
        siblingRow.remove();
        saveSiblings(); // Save siblings after removing
      });

      siblingsContainer.appendChild(siblingRow);
    }

    saveSiblings(); // Save siblings after adding
  });

  document.getElementById('addExpenseBtn').addEventListener('click', function () {
    const expensesContainer = document.getElementById('expensesTableBody');
    const isMobile = window.innerWidth <= 480; // Detect mobile devices

    if (isMobile) {
      // Create an expense card for mobile devices
      const expenseCard = document.createElement('div');
      expenseCard.classList.add('expense-card');
      expenseCard.innerHTML = `
        <div class="expense-field">
          <label>Fees and Other Expenses:</label>
          <input type="text" class="expense-item" required>
        </div>
        <div class="expense-field">
          <label>Expected Cost:</label>
          <div class="expense-cost-wrapper">
            <span class="peso-prefix">₱</span>
            <input type="number" class="expense-cost" min="0" required>
            <span class="peso-suffix">.00</span>
          </div>
        </div>
        <button type="button" class="removeExpenseBtn">Remove</button>
      `;

      // Add event listener for the "Remove" button
      expenseCard.querySelector('.removeExpenseBtn').addEventListener('click', function () {
        expenseCard.remove();
        saveExpenses(); // Save expenses after removing
      });

      expensesContainer.appendChild(expenseCard);
    } else {
      // Create an expense row for larger screens
      const expenseRow = document.createElement('tr');
      expenseRow.innerHTML = `
        <td><input type="text" class="expense-item" required></td>
        <td>
          <div class="expense-cost-wrapper">
            <span class="peso-prefix">₱</span>
            <input type="number" class="expense-cost" min="0" required>
            <span class="peso-suffix">.00</span>
          </div>
        </td>
        <td><button type="button" class="removeExpenseBtn">Remove</button></td>
      `;

      // Add event listener for the "Remove" button
      expenseRow.querySelector('.removeExpenseBtn').addEventListener('click', function () {
        expenseRow.remove();
        saveExpenses(); // Save expenses after removing
      });

      expensesContainer.appendChild(expenseRow);
    }

    saveExpenses(); // Save expenses after adding
  });
});

// All nav handler implementations removed; navigation is now handled by navbar.js

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