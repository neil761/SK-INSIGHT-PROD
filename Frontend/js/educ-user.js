document.addEventListener('DOMContentLoaded', async function () {
  const siblingsContainer = document.getElementById('siblingsTableBody');
  const expensesContainer = document.getElementById('expensesTableBody');

  // Hamburger Menu Functionality
  const navbarHamburger = document.getElementById('navbarHamburger');
  const navbarMobileMenu = document.getElementById('navbarMobileMenu');

  navbarHamburger.addEventListener('click', function () {
    navbarMobileMenu.classList.toggle('active'); // Toggle the active class
  });

  // Close the mobile menu when clicking outside
  document.addEventListener('click', function (e) {
    if (!navbarMobileMenu.contains(e.target) && !navbarHamburger.contains(e.target)) {
      navbarMobileMenu.classList.remove('active'); // Remove the active class
    }
  });

  function updateLayout() {
    const isMobile = window.innerWidth <= 480; // Detect mobile devices

    // Toggle <thead> visibility based on screen size
    const siblingsTableHead = document.querySelector('#siblingsTable thead');
    const expensesTableHead = document.querySelector('#expensesTable thead');

    if (siblingsTableHead) siblingsTableHead.style.display = isMobile ? 'none' : ''; // Hide or show <thead>
    if (expensesTableHead) expensesTableHead.style.display = isMobile ? 'none' : ''; // Hide or show <thead>

    // Update siblings layout
    const siblings = Array.from(siblingsContainer.children);
    siblingsContainer.innerHTML = ''; // Clear container
    siblings.forEach((sibling) => {
      const siblingElement = document.createElement(isMobile ? 'div' : 'tr');
      if (isMobile) {
        siblingElement.classList.add('sibling-card');
        siblingElement.innerHTML = `
          <div class="sibling-field">
            <label>Name:</label>
            <input type="text" class="sibling-name" required value="${sibling.querySelector('.sibling-name')?.value || ''}">
          </div>
          <div class="sibling-field">
            <label>Gender:</label>
            <select class="sibling-gender" required>
              <option value="">Select</option>
              <option value="Male" ${sibling.querySelector('.sibling-gender')?.value === 'Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${sibling.querySelector('.sibling-gender')?.value === 'Female' ? 'selected' : ''}>Female</option>
            </select>
          </div>
          <div class="sibling-field">
            <label>Age:</label>
            <input type="number" class="sibling-age" min="0" required value="${sibling.querySelector('.sibling-age')?.value || ''}">
          </div>
          <button type="button" class="removeSiblingBtn">Remove</button>
        `;
      } else {
        siblingElement.innerHTML = `
          <td><input type="text" class="sibling-name" required value="${sibling.querySelector('.sibling-name')?.value || ''}"></td>
          <td>
            <select class="sibling-gender" required>
              <option value="">Select</option>
              <option value="Male" ${sibling.querySelector('.sibling-gender')?.value === 'Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${sibling.querySelector('.sibling-gender')?.value === 'Female' ? 'selected' : ''}>Female</option>
            </select>
          </td>
          <td><input type="number" class="sibling-age" min="0" required value="${sibling.querySelector('.sibling-age')?.value || ''}"></td>
          <td><button type="button" class="removeSiblingBtn">Remove</button></td>
        `;
      }
      siblingsContainer.appendChild(siblingElement);
    });

    // Update expenses layout
    const expenses = Array.from(expensesContainer.children);
    expensesContainer.innerHTML = ''; // Clear container
    expenses.forEach((expense) => {
      const expenseElement = document.createElement(isMobile ? 'div' : 'tr');
      if (isMobile) {
        expenseElement.classList.add('expense-card');
        expenseElement.innerHTML = `
          <div class="expense-field">
            <label>Fees and Other Expenses:</label>
            <input type="text" class="expense-name" required value="${expense.querySelector('.expense-name')?.value || ''}">
          </div>
          <div class="expense-field">
            <label>Expected Cost:</label>
            <input type="number" class="expense-cost" min="0" required value="${expense.querySelector('.expense-cost')?.value || ''}">
          </div>
          <button type="button" class="removeExpenseBtn">Remove</button>
        `;
      } else {
        expenseElement.innerHTML = `
          <td><input type="text" class="expense-name" required value="${expense.querySelector('.expense-name')?.value || ''}"></td>
          <td><input type="number" class="expense-cost" min="0" required value="${expense.querySelector('.expense-cost')?.value || ''}"></td>
          <td><button type="button" class="removeExpenseBtn">Remove</button></td>
        `;
      }
      expensesContainer.appendChild(expenseElement);
    });
  }

  // Add event listener for window resize
  window.addEventListener('resize', updateLayout);

  // Initial layout update
  updateLayout();

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

  // Siblings: Add Row/Card
  document.getElementById('addSiblingBtn').addEventListener('click', function () {
    const siblingElement = document.createElement(window.innerWidth <= 768 ? 'div' : 'tr');
    if (window.innerWidth <= 768) {
      siblingElement.classList.add('sibling-card');
      siblingElement.innerHTML = `
        <div class="sibling-field">
          <label>Name:</label>
          <input type="text" class="sibling-name" required>
        </div>
        <div class="sibling-field">
          <label>Gender:</label>
          <select class="sibling-gender" required>
            <option value="">Select</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
          </select>
        </div>
        <div class="sibling-field">
          <label>Age:</label>
          <input type="number" class="sibling-age" min="0" required>
        </div>
        <button type="button" class="removeSiblingBtn">Remove</button>
      `;
    } else {
      siblingElement.innerHTML = `
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
    }
    siblingsContainer.appendChild(siblingElement);
  });

  // Add expense
  document.getElementById('addExpenseBtn').addEventListener('click', function () {
    const expenseElement = document.createElement(window.innerWidth <= 768 ? 'div' : 'tr');
    if (window.innerWidth <= 768) {
      expenseElement.classList.add('expense-card');
      expenseElement.innerHTML = `
        <div class="expense-field">
          <label>Fees and Other Expenses:</label>
          <input type="text" class="expense-name" required>
        </div>
        <div class="expense-field">
          <label>Expected Cost:</label>
          <input type="number" class="expense-cost" min="0" required>
        </div>
        <button type="button" class="removeExpenseBtn">Remove</button>
      `;
    } else {
      expenseElement.innerHTML = `
        <td><input type="text" class="expense-name" required></td>
        <td><input type="number" class="expense-cost" min="0" required></td>
        <td><button type="button" class="removeExpenseBtn">Remove</button></td>
      `;
    }
    expensesContainer.appendChild(expenseElement);
  });

  // Remove Row/Card for Siblings and Expenses
  document.getElementById('siblingsTableBody').addEventListener('click', function (e) {
    if (e.target.classList.contains('removeSiblingBtn')) {
      e.target.closest(window.innerWidth <= 768 ? '.sibling-card' : 'tr').remove(); // Remove the card or row
      saveSiblings(); // Save siblings after removing
    }
  });

  document.getElementById('expensesTableBody').addEventListener('click', function (e) {
    if (e.target.classList.contains('removeExpenseBtn')) {
      e.target.closest(window.innerWidth <= 768 ? '.expense-card' : 'tr').remove(); // Remove the card or row
      saveExpenses(); // Save expenses after removing
    }
  });

  // Save siblings and expenses on any change in their containers (delegated)
  document.getElementById('siblingsTableBody').addEventListener('input', function () {
    saveSiblings();
  });

  document.getElementById('expensesTableBody').addEventListener('input', function () {
    saveExpenses();
  });

  // Helper: Save siblings to sessionStorage
  function saveSiblings() {
    const siblings = [];
    document.querySelectorAll('#siblingsTableBody .sibling-card, #siblingsTableBody tr').forEach((element) => {
      const nameEl = element.querySelector('.sibling-name');
      const genderEl = element.querySelector('.sibling-gender');
      const ageEl = element.querySelector('.sibling-age');
      if (nameEl && genderEl && ageEl) {
        siblings.push({
          name: nameEl.value,
          gender: genderEl.value,
          age: ageEl.value ? Number(ageEl.value) : '',
        });
      }
    });
    sessionStorage.setItem('educ_siblings', JSON.stringify(siblings));
  }

  // Helper: Save expenses to sessionStorage
  function saveExpenses() {
    const expenses = [];
    document.querySelectorAll('#expensesTableBody .expense-card, #expensesTableBody tr').forEach((element) => {
      const nameEl = element.querySelector('.expense-name');
      const costEl = element.querySelector('.expense-cost');
      if (nameEl && costEl) {
        expenses.push({
          name: nameEl.value,
          cost: costEl.value ? Number(costEl.value) : '',
        });
      }
    });
    sessionStorage.setItem('educ_expenses', JSON.stringify(expenses));
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
        title: `No Application found`,
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