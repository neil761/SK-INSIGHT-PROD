/*
  editEduc.js
  - Fetch Educational Assistance application for current user, populate the edit form
  - Fetch stored images (Cloudinary URLs) and allow preview/change/remove
  - Validate PNG/JPEG uploads
  - Send multipart PUT when images changed or removed, otherwise send JSON PUT
  - Confirm + show loading using SweetAlert2
*/

// dynamic API base for deploy vs local development (top-level so page handlers can use it)
const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
  ? window.API_BASE
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://sk-insight.online';

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

  // Navbar and navigation logic is now handled by shared navbar.js
  // All local hamburger/nav button code removed for maintainability.

  // simple helpers
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

  function showFileName(id, txt) {
    const el = document.getElementById(id);
    if (!el) return;
    // truncate display but keep full name in title
    const full = txt || '';
    const max = 24;
    const display = full.length > max ? full.substring(0, max) + '...' : full;
    el.textContent = display;
    el.title = full;
    // ensure visible when a name is provided
    el.style.display = full ? 'inline-block' : 'none';
  }

  // detect mobile layout for siblings/expenses rendering (mutable so we can respond to resize)
  let isMobile = window.innerWidth <= 768;

  // image state
  const frontState = { base64: null, removed: false };
  const backState = { base64: null, removed: false };
  const coeState = { base64: null, removed: false };
  const voterState = { base64: null, removed: false };

  // store original data to track changes
  let originalData = {};
  let originalSiblings = [];
  let originalExpenses = [];

  // inputs
  const frontInput = document.getElementById('frontImage');
  const backInput = document.getElementById('backImage');
  const coeInput = document.getElementById('coeImage');
  const voterInput = document.getElementById('voter');

  const viewFront = document.getElementById('viewFront');
  const viewBack = document.getElementById('viewBack');
  const viewCOE = document.getElementById('viewCOE');
  const viewVoter = document.getElementById('viewVoter');

  const deleteFront = document.getElementById('deleteFront');
  const deleteBack = document.getElementById('deleteBack');
  const deleteCOE = document.getElementById('deleteCOE');
  const deleteVoter = document.getElementById('deleteVoter');

  // validate file type
  function validateImageFile(file) {
    if (!file) return false;
    const allowed = ['image/png','image/jpeg','image/jpg'];
    return allowed.includes(file.type);
  }

  // render view handlers
  function setViewHandler(btnEl, state, fallbackTextId) {
    if (!btnEl) return;
    btnEl.style.cursor = 'pointer';
    btnEl.addEventListener('click', async () => {
      const src = state.base64;
      if (!src) return Swal.fire({ icon: 'info', title: 'No image', text: 'No image available.' });
      try { Swal.fire({ imageUrl: src, imageAlt: 'Preview', showCloseButton: true }); } catch (e) { window.open(src); }
    });
  }

  function setDeleteHandler(btnEl, state, inputEl, fileNameElId) {
    if (!btnEl) return;
    btnEl.style.cursor = 'pointer';
    btnEl.addEventListener('click', () => {
      state.removed = true;
      state.base64 = null;

      if (inputEl) {
        try { inputEl.value = ''; } catch (e) {}

        // try to find the existing label; if missing, create a simple upload label so user can re-upload
        // prefer existing label ids like 'frontLabel', 'backLabel', 'coeLabel', 'voterLabel'
        const preferredId = inputEl.id.replace(/Image$/i, '') + 'Label';
        let label = document.getElementById(preferredId) || document.getElementById(`${inputEl.id}Label`);
        if (!label) {
          try {
            // create a label that matches page styles (.upload-plus) and uses FontAwesome plus icon
            label = document.createElement('label');
            label.id = preferredId;
            label.htmlFor = inputEl.id;
            label.className = 'upload-plus';
            label.innerHTML = '<i class="fa-solid fa-plus"></i>';
            // append into the same cell as the input (fallback to parent/body)
            const container = inputEl.parentElement || inputEl.parentNode;
            if (container) container.appendChild(label); else document.body.appendChild(label);
          } catch (e) { /* ignore create error */ }
        }

        // persist the removed state so reloads reflect the user's action until they save
        try { localStorage.setItem(`educ_remove_${inputEl.id}`, '1'); } catch (e) { /* ignore */ }

        // ensure the label is visible and the input is enabled
        try { if (label) label.style.display = 'inline-flex'; } catch (e) {}
        try { inputEl.disabled = false; } catch (e) {}
        // ensure the table row is visible so the label is reachable
        try {
          const tr = inputEl.closest ? inputEl.closest('tr') : (inputEl.parentElement && inputEl.parentElement.parentElement);
          if (tr) tr.style.display = '';
        } catch (e) {}
      }

      if (fileNameElId) {
        showFileName(fileNameElId, '');
        const fn = document.getElementById(fileNameElId);
        if (fn) fn.style.display = 'none';
      }

      Swal.fire({ icon: 'success', title: 'Removed', text: 'Image marked for removal.' });
    });
  }

  setViewHandler(viewFront, frontState, 'frontFileName');
  setViewHandler(viewBack, backState, 'backFileName');
  setViewHandler(viewCOE, coeState, 'coeFileName');
  setViewHandler(viewVoter, voterState, 'voterFileName');

  setDeleteHandler(deleteFront, frontState, frontInput, 'frontFileName');
  setDeleteHandler(deleteBack, backState, backInput, 'backFileName');
  setDeleteHandler(deleteCOE, coeState, coeInput, 'coeFileName');
  setDeleteHandler(deleteVoter, voterState, voterInput, 'voterFileName');

  // SIBLINGS & EXPENSES: rendering, add/remove
  const siblingsTableBody = document.getElementById('siblingsTableBody');
  const expensesTableBody = document.getElementById('expensesTableBody');
  const addSiblingBtn = document.getElementById('addSiblingBtn');
  const addExpenseBtn = document.getElementById('addExpenseBtn');

  // hide table headers on mobile for a cleaner card layout
  const sibHead = document.querySelector('#siblingsTable thead');
  const expHead = document.querySelector('#expensesTable thead');
  if (sibHead) sibHead.style.display = isMobile ? 'none' : '';
  if (expHead) expHead.style.display = isMobile ? 'none' : '';

  function renderSiblings(list) {
    if (!siblingsTableBody) return;
    siblingsTableBody.innerHTML = '';
    (list || []).forEach((s, idx) => {
      if (isMobile) {
        // render as card for mobile
        const card = document.createElement('div');
        card.className = 'sibling-card';
        card.innerHTML = `
          <div class="sibling-field"><label>Name</label><input type="text" class="sib-name" value="${(s.name||s.fullName||'')}"></div>
          <div class="sibling-field"><label>Gender</label>
            <select class="sib-gender">
              <option value="">Select</option>
              <option value="Male" ${s.gender==='Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${s.gender==='Female' ? 'selected' : ''}>Female</option>
            </select>
          </div>
          <div class="sibling-field"><label>Age</label><input type="number" class="sib-age" value="${s.age||''}" min="0"></div>
          <div><button type="button" class="remove-sib">Remove</button></div>
        `;
        siblingsTableBody.appendChild(card);
        card.querySelector('.remove-sib').addEventListener('click', () => card.remove());
      } else {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td><input type="text" class="sib-name" value="${(s.name||s.fullName||'')}"></td>
          <td>
            <select class="sib-gender">
              <option value="">Select</option>
              <option value="Male" ${s.gender==='Male' ? 'selected' : ''}>Male</option>
              <option value="Female" ${s.gender==='Female' ? 'selected' : ''}>Female</option>
            </select>
          </td>
          <td><input type="number" class="sib-age" value="${s.age||''}" min="0"></td>
          <td><button type="button" class="remove-sib">Remove</button></td>
        `;
        siblingsTableBody.appendChild(tr);
        tr.querySelector('.remove-sib').addEventListener('click', () => tr.remove());
      }
    });
  }

  function renderExpenses(list) {
    if (!expensesTableBody) return;
    expensesTableBody.innerHTML = '';
    (list || []).forEach((e, idx) => {
      if (isMobile) {
        const card = document.createElement('div');
        card.className = 'expense-card';
        const descVal = e.description || e.desc || e.item || '';
        const costVal = e.cost || e.expectedCost || '';
        card.innerHTML = `
          <div class="expense-field"><label>Description</label><input type="text" class="exp-desc" value="${descVal}"></div>
          <div class="expense-field"><label>Expected Cost</label>
            <div class="expense-cost-wrapper">
              <span class="peso-prefix">₱</span>
              <input type="number" class="exp-cost" value="${costVal}" min="0">
              <span class="peso-suffix">.00</span>
            </div>
          </div>
          <div><button type="button" class="remove-exp">Remove</button></div>
        `;
        expensesTableBody.appendChild(card);
        card.querySelector('.remove-exp').addEventListener('click', () => card.remove());
        attachExpenseHandlers(card);
      } else {
        const tr = document.createElement('tr');
        const descVal = e.description || e.desc || e.item || '';
        const costVal = e.cost || e.expectedCost || '';
        tr.innerHTML = `
          <td><input type="text" class="exp-desc" value="${descVal}"></td>
          <td>
            <div class="expense-cost-wrapper">
              <span class="peso-prefix">₱</span>
              <input type="number" class="exp-cost" value="${costVal}" min="0">
              <span class="peso-suffix">.00</span>
            </div>
          </td>
          <td><button type="button" class="remove-exp">Remove</button></td>
        `;
        expensesTableBody.appendChild(tr);
        tr.querySelector('.remove-exp').addEventListener('click', () => tr.remove());
        attachExpenseHandlers(tr);
      }
    });
  }

  // Helper: attach input handlers for expense cost fields
  function attachExpenseHandlers(container) {
    const root = container || expensesTableBody;
    root.querySelectorAll('input.exp-cost').forEach(input => {
      // Prevent entering decimal characters and non-digits
      input.addEventListener('keydown', function (e) {
        const allowed = ['Backspace','ArrowLeft','ArrowRight','Delete','Tab'];
        if (allowed.includes(e.key)) return;
        if (!/^[0-9]$/.test(e.key)) {
          e.preventDefault();
        }
      });

      // On input, strip any non-digits (handle paste)
      input.addEventListener('input', function (e) {
        const cleaned = String(this.value).replace(/[^0-9]/g, '');
        if (this.value !== cleaned) this.value = cleaned;
      });

      // On blur, coerce to integer (remove fractional part)
      input.addEventListener('blur', function () {
        if (!this.value) return;
        const n = parseInt(this.value, 10);
        this.value = isNaN(n) ? '' : String(n);
      });
    });
  }

  if (addSiblingBtn) addSiblingBtn.addEventListener('click', () => {
    // preserve existing siblings, then append a blank one
    const existing = readSiblingsFromTable() || [];
    existing.push({ name: '', gender: '', age: '' });
    renderSiblings(existing);
  });

  if (addExpenseBtn) addExpenseBtn.addEventListener('click', () => {
    const existing = readExpensesFromTable() || [];
    existing.push({ description: '', cost: '' });
    renderExpenses(existing);
    attachExpenseHandlers(expensesTableBody);
  });

  function readSiblingsFromTable() {
    if (!siblingsTableBody) return [];
    // support both table rows and mobile cards
    const cards = Array.from(siblingsTableBody.querySelectorAll('.sibling-card'));
    if (cards.length) {
      return cards.map(card => ({
        name: (card.querySelector('.sib-name')||{}).value || '',
        gender: (card.querySelector('.sib-gender')||{}).value || '',
        age: (card.querySelector('.sib-age')||{}).value || ''
      })).filter(s => s.name || s.gender || s.age);
    }
    return Array.from(siblingsTableBody.querySelectorAll('tr')).map(tr => ({
      name: (tr.querySelector('.sib-name')||{}).value || '',
      gender: (tr.querySelector('.sib-gender')||{}).value || '',
      age: (tr.querySelector('.sib-age')||{}).value || ''
    })).filter(s => s.name || s.gender || s.age);
  }

  function readExpensesFromTable() {
    if (!expensesTableBody) return [];
    const cards = Array.from(expensesTableBody.querySelectorAll('.expense-card'));
    if (cards.length) {
      return cards.map(card => ({
        description: (card.querySelector('.exp-desc')||{}).value || '',
        cost: (card.querySelector('.exp-cost')||{}).value || ''
      })).filter(e => e.description || e.cost);
    }
    return Array.from(expensesTableBody.querySelectorAll('tr')).map(tr => ({
      description: (tr.querySelector('.exp-desc')||{}).value || '',
      cost: (tr.querySelector('.exp-cost')||{}).value || ''
    })).filter(e => e.description || e.cost);
  }

  // Re-render siblings/expenses when window resizes between mobile/desktop
  window.addEventListener('resize', () => {
    const prev = isMobile;
    isMobile = window.innerWidth <= 768;
    if (prev !== isMobile) {
      // preserve current values
      const curSibs = readSiblingsFromTable();
      const curExps = readExpensesFromTable();
      renderSiblings(curSibs);
      renderExpenses(curExps);
      // hide or show table headers to match mobile layout
      const sibHead = document.querySelector('#siblingsTable thead');
      const expHead = document.querySelector('#expensesTable thead');
      if (sibHead) sibHead.style.display = isMobile ? 'none' : '';
      if (expHead) expHead.style.display = isMobile ? 'none' : '';
    }
  });

  if (frontInput) frontInput.addEventListener('change', function (e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!validateImageFile(f)) { Swal.fire({ icon: 'error', title: 'Invalid file', text: 'Only PNG and JPEG allowed.' }); frontInput.value = ''; return; }
    const fr = new FileReader();
    fr.onload = () => { frontState.base64 = fr.result; frontState.removed = false; showFileName('frontFileName', f.name); try { localStorage.removeItem('educ_remove_frontImage'); } catch (e) {} };
    fr.readAsDataURL(f);
    fr.onloadend = () => {
      // hide upload label and show filename
      const label = document.getElementById('frontLabel');
      if (label) label.style.display = 'none';
      const fn = document.getElementById('frontFileName');
      if (fn) fn.style.display = 'inline-block';
    };
  });

  if (backInput) backInput.addEventListener('change', function (e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!validateImageFile(f)) { Swal.fire({ icon: 'error', title: 'Invalid file', text: 'Only PNG and JPEG allowed.' }); backInput.value = ''; return; }
    const fr = new FileReader();
    fr.onload = () => { backState.base64 = fr.result; backState.removed = false; showFileName('backFileName', f.name); try { localStorage.removeItem('educ_remove_backImage'); } catch (e) {} };
    fr.readAsDataURL(f);
    fr.onloadend = () => {
      const label = document.getElementById('backLabel');
      if (label) label.style.display = 'none';
      const fn = document.getElementById('backFileName');
      if (fn) fn.style.display = 'inline-block';
    };
  });
  if (coeInput) coeInput.addEventListener('change', function (e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!validateImageFile(f)) { Swal.fire({ icon: 'error', title: 'Invalid file', text: 'Only PNG and JPEG allowed.' }); coeInput.value = ''; return; }
    const fr = new FileReader();
    fr.onload = () => { coeState.base64 = fr.result; coeState.removed = false; showFileName('coeFileName', f.name); try { localStorage.removeItem('educ_remove_coeImage'); } catch (e) {} };
    fr.readAsDataURL(f);
    fr.onloadend = () => {
      const label = document.getElementById('coeLabel');
      if (label) label.style.display = 'none';
      const fn = document.getElementById('coeFileName');
      if (fn) fn.style.display = 'inline-block';
    };
  });
  if (voterInput) voterInput.addEventListener('change', function (e) {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    if (!validateImageFile(f)) { Swal.fire({ icon: 'error', title: 'Invalid file', text: 'Only PNG and JPEG allowed.' }); voterInput.value = ''; return; }
    const fr = new FileReader();
    fr.onload = () => { voterState.base64 = fr.result; voterState.removed = false; showFileName('voterFileName', f.name); try { localStorage.removeItem('educ_remove_voter'); } catch (e) {} };
    fr.readAsDataURL(f);
    fr.onloadend = () => {
      const label = document.getElementById('voterLabel');
      if (label) label.style.display = 'none';
      const fn = document.getElementById('voterFileName');
      if (fn) fn.style.display = 'inline-block';
    };
  });

  // populate form from server
  async function populate() {
    try {
      const res = await fetch(`${API_BASE}/api/educational-assistance/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) return;
      const data = await res.json();

      setIfExists('surname', data.surname || data.lastname || '');
      setIfExists('firstName', data.firstname || data.firstName || '');
      setIfExists('middleName', data.middlename || data.middleName || '');
      setIfExists('suffix', data.suffix || '');
      const bd = data.birthday ? (data.birthday.split ? data.birthday.split('T')[0] : data.birthday) : '';
      setIfExists('birthday', bd);
      setIfExists('placeOfBirth', data.placeOfBirth || '');
      setIfExists('age', data.age || '');
      setIfExists('gender', data.gender || data.sex || '');
      setIfExists('civilstatus', data.civilstatus || '');
      setIfExists('religion', data.religion || '');
      setIfExists('email', data.email || '');
      setIfExists('contact', data.contact || '');
      setIfExists('schoolname', data.school || data.schoolname || '');
      setIfExists('schooladdress', data.schooladdress || '');
        // Set academic level from server (handle several possible field names)
        try {
          const acadVal = (data.academicLevel || data.academiclevel || data.academic_level || data.academic || data.level || '').toString();
          const acadEl = document.getElementById('academicLevel');
          if (acadEl && acadVal) {
            try { acadEl.value = acadVal; } catch (e) { /* ignore */ }
          }
        } catch (e) { /* ignore */ }

        // Populate year select based on academic level and set selected value
        try {
          const yearEl = document.getElementById('year');
          const acadEl = document.getElementById('academicLevel');
          const JHS_YEARS = ['Grade 7','Grade 8','Grade 9','Grade 10'];
          const SHS_YEARS = ['Grade 11','Grade 12'];
          const lvl = (acadEl && acadEl.value) ? acadEl.value.toString().toLowerCase() : (data.academicLevel || '').toString().toLowerCase();
          if (yearEl && yearEl.tagName && yearEl.tagName.toLowerCase() === 'select') {
            // rebuild options according to detected level
            yearEl.innerHTML = '<option value="">Select Classification</option>';
            const opts = lvl.includes('junior') ? JHS_YEARS : (lvl.includes('senior') ? SHS_YEARS : []);
            opts.forEach(o => {
              const el = document.createElement('option'); el.value = o; el.textContent = o; yearEl.appendChild(el);
            });
            // set selected if present and valid
            if (data.year && opts.indexOf(data.year) !== -1) {
              yearEl.value = data.year;
            }
            // show/hide yearWrapper same as form logic
            const yearWrapper = document.getElementById('yearWrapper');
            if (yearWrapper) yearWrapper.style.display = opts.length ? '' : 'none';
            // Update year options live when academic level changes
            try {
              if (acadEl) {
                acadEl.addEventListener('change', function () {
                  try {
                    const newLvl = (acadEl.value || '').toString().toLowerCase();
                    const newOpts = newLvl.includes('junior') ? JHS_YEARS : (newLvl.includes('senior') ? SHS_YEARS : []);
                    yearEl.innerHTML = '<option value="">Select Classification</option>';
                    newOpts.forEach(o => { const e = document.createElement('option'); e.value = o; e.textContent = o; yearEl.appendChild(e); });
                    if (yearWrapper) yearWrapper.style.display = newOpts.length ? '' : 'none';
                  } catch (ie) { /* ignore */ }
                });
              }
            } catch (e) { /* ignore */ }
          } else if (yearEl) {
            // if it's an input, set raw value
            yearEl.value = data.year || '';
          }
        } catch (e) { /* ignore */ }
      setIfExists('benefittype', data.benefittype || data.typeOfBenefit || '');
      setIfExists('fathername', data.fathername || '');
      setIfExists('fathercontact', data.fathercontact || '');
      setIfExists('mothername', data.mothername || '');
      setIfExists('mothercontact', data.mothercontact || '');

      // Hide Parent's voter's certificate row when Academic Level is Senior High
      try {
        function toggleVoterRowByLevel(level) {
          const lvl = (level || '').toString().toLowerCase();
          const voterInput = document.getElementById('voter');
          const viewVoter = document.getElementById('viewVoter');
          const deleteVoter = document.getElementById('deleteVoter');
          const voterFileName = document.getElementById('voterFileName');
          const voterLabel = document.getElementById('voterLabel');
          // Find the table row containing the voter input or file name
          const tr = voterInput ? (voterInput.closest ? voterInput.closest('tr') : (voterInput.parentElement && voterInput.parentElement.parentElement)) : (voterFileName ? (voterFileName.closest ? voterFileName.closest('tr') : null) : null);
          if (lvl.includes('senior')) {
            if (tr) tr.style.display = 'none';
            if (viewVoter) viewVoter.style.display = 'none';
            if (deleteVoter) deleteVoter.style.display = 'none';
            if (voterFileName) voterFileName.style.display = 'none';
            if (voterLabel) voterLabel.style.display = 'none';
          } else {
            // show the row and controls
            if (tr) tr.style.display = '';
            if (viewVoter) viewVoter.style.display = '';
            if (deleteVoter) deleteVoter.style.display = '';
            // determine whether a file is present and restore proper display for filename/label
            try {
              const hasFileInState = (typeof voterState !== 'undefined') && voterState && !voterState.removed && !!voterState.base64;
              const hasFileInInput = voterInput && voterInput.files && voterInput.files.length;
              const hasFileInName = voterFileName && voterFileName.textContent && voterFileName.textContent.trim();
              const hasVoter = !!(hasFileInState || hasFileInInput || hasFileInName);
              if (voterFileName) voterFileName.style.display = hasVoter ? 'inline-block' : 'none';
              if (voterLabel) voterLabel.style.display = hasVoter ? 'none' : 'inline-flex';
            } catch (e) {
              if (voterFileName) voterFileName.style.display = '';
              if (voterLabel) voterLabel.style.display = '';
            }
          }
        }

        const acadEl = document.getElementById('academicLevel');
        const detected = (acadEl && acadEl.value) ? acadEl.value : (data.academicLevel || data.academiclevel || '');
        toggleVoterRowByLevel(detected);
        // Attach change listener so switching level during edit updates visibility
        if (acadEl) acadEl.addEventListener('change', function () { toggleVoterRowByLevel(acadEl.value); });
      } catch (e) { /* ignore */ }

      // Determine birthday preference similar to view-educ.js:
      // 1) application.user.birthday (if populated)
      // 2) application.birthday
      // 3) user's profile (/api/users/me)
      try {
        let birthday = '';
        if (data.user && data.user.birthday) birthday = data.user.birthday;
        else if (data.birthday) birthday = data.birthday;

        const birthdayInput = document.getElementById('birthday');
        if (birthdayInput) birthdayInput.value = birthday ? (birthday.split ? birthday.split('T')[0] : birthday) : '';

        // Fetch user profile to prefer its authoritative values (if any)
        const userRes = await fetch(`${API_BASE}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (userRes && userRes.ok) {
          const userData = await userRes.json();

          // If user profile has birthday, prefer it
          const userBd = userData && userData.birthday ? (userData.birthday.split ? userData.birthday.split('T')[0] : userData.birthday) : '';
          if (userBd) setIfExists('birthday', userBd);

          // civil status (try multiple property name variants)
          const civ = userData.civilstatus || userData.civilStatus || data.civilstatus || data.civilStatus || (data.user && (data.user.civilstatus || data.user.civilStatus));
          if (civ) setIfExists('civilstatus', civ);

          // contact number
          const contactVal = userData.contact || userData.contactNumber || data.contact || data.contactNumber || (data.user && (data.user.contact || data.user.contactNumber));
          if (contactVal) setIfExists('contact', contactVal);

          // school address (and fallback to school/schoolname)
          const schoolAddr = userData.schooladdress || userData.schoolAddress || data.schooladdress || data.schoolAddress || data.school || data.schoolname || '';
          if (schoolAddr) setIfExists('schooladdress', schoolAddr);

          // parents' names & phones (try multiple keys used across views)
          const fName = userData.fathername || userData.fatherName || data.fathername || data.fatherName || (data.user && (data.user.fathername || data.user.fatherName));
          const fPhone = userData.fathercontact || userData.fatherPhone || data.fathercontact || data.fatherPhone || (data.user && (data.user.fathercontact || data.user.fatherPhone));
          const mName = userData.mothername || userData.motherName || data.mothername || data.motherName || (data.user && (data.user.mothername || data.user.motherName));
          const mPhone = userData.mothercontact || userData.motherPhone || data.mothercontact || data.motherPhone || (data.user && (data.user.mothercontact || data.user.motherPhone));
          if (fName) setIfExists('fathername', fName);
          if (fPhone) setIfExists('fathercontact', fPhone);
          if (mName) setIfExists('mothername', mName);
          if (mPhone) setIfExists('mothercontact', mPhone);
        }
      } catch (e) {
        console.warn('fetch user/profile values failed', e);
      }

      // images
      const frontUrl = data.frontImage || data.frontImagePath || data.front_id || null;
      const backUrl = data.backImage || data.backImagePath || null;
      const coeUrl = data.coeImage || null;
      const voterUrl = data.voter || null;

      if (frontUrl) {
        const b64 = await fetchImageAsBase64(frontUrl);
        if (b64) {
          frontState.base64 = b64;
          frontState.removed = false;
          // prefer original filename if URL provides it
          let fname = 'Current image';
          try { fname = frontUrl ? decodeURIComponent((new URL(frontUrl)).pathname.split('/').pop() || '') : 'Current image'; } catch (e) { fname = 'Current image'; }
          if (!fname) fname = 'Current image';
          showFileName('frontFileName', fname);
        }
      }
      if (backUrl) {
        const b64 = await fetchImageAsBase64(backUrl);
        if (b64) {
          backState.base64 = b64;
          backState.removed = false;
          let fname = 'Current image';
          try { fname = backUrl ? decodeURIComponent((new URL(backUrl)).pathname.split('/').pop() || '') : 'Current image'; } catch (e) { fname = 'Current image'; }
          if (!fname) fname = 'Current image';
          showFileName('backFileName', fname);
        }
      }
      if (coeUrl) {
        const b64 = await fetchImageAsBase64(coeUrl);
        if (b64) {
          coeState.base64 = b64;
          coeState.removed = false;
          let fname = 'Current image';
          try { fname = coeUrl ? decodeURIComponent((new URL(coeUrl)).pathname.split('/').pop() || '') : 'Current image'; } catch (e) { fname = 'Current image'; }
          if (!fname) fname = 'Current image';
          showFileName('coeFileName', fname);
        }
      }
      if (voterUrl) {
        const b64 = await fetchImageAsBase64(voterUrl);
        if (b64) {
          voterState.base64 = b64;
          voterState.removed = false;
          let fname = 'Current image';
          try { fname = voterUrl ? decodeURIComponent((new URL(voterUrl)).pathname.split('/').pop() || '') : 'Current image'; } catch (e) { fname = 'Current image'; }
          if (!fname) fname = 'Current image';
          showFileName('voterFileName', fname);
        }
      }

      // Honor locally persisted "removed" flags so reloads reflect client deletion until saved
      try {
        if (frontInput && localStorage.getItem('educ_remove_frontImage')) { frontState.removed = true; frontState.base64 = null; }
        if (backInput && localStorage.getItem('educ_remove_backImage')) { backState.removed = true; backState.base64 = null; }
        if (coeInput && localStorage.getItem('educ_remove_coeImage')) { coeState.removed = true; coeState.base64 = null; }
        if (voterInput && localStorage.getItem('educ_remove_voter')) { voterState.removed = true; voterState.base64 = null; }
      } catch (e) { /* ignore localStorage access */ }

      // Toggle upload labels/file name visibility based on existing images
      const frontLabel = document.getElementById('frontLabel');
      const frontFN = document.getElementById('frontFileName');
      if (frontState.base64 && !frontState.removed) { if (frontLabel) frontLabel.style.display = 'none'; if (frontFN) frontFN.style.display = 'inline-block'; } else { if (frontLabel) frontLabel.style.display = 'inline-flex'; if (frontFN) frontFN.style.display = 'none'; }
      const backLabel = document.getElementById('backLabel');
      const backFN = document.getElementById('backFileName');
      if (backState.base64 && !backState.removed) { if (backLabel) backLabel.style.display = 'none'; if (backFN) backFN.style.display = 'inline-block'; } else { if (backLabel) backLabel.style.display = 'inline-flex'; if (backFN) backFN.style.display = 'none'; }
      const coeLabel = document.getElementById('coeLabel');
      const coeFN = document.getElementById('coeFileName');
      if (coeState.base64 && !coeState.removed) { if (coeLabel) coeLabel.style.display = 'none'; if (coeFN) coeFN.style.display = 'inline-block'; } else { if (coeLabel) coeLabel.style.display = 'inline-flex'; if (coeFN) coeFN.style.display = 'none'; }
      const voterLabel = document.getElementById('voterLabel');
      const voterFN = document.getElementById('voterFileName');
      if (voterState.base64 && !voterState.removed) { if (voterLabel) voterLabel.style.display = 'none'; if (voterFN) voterFN.style.display = 'inline-block'; } else { if (voterLabel) voterLabel.style.display = 'inline-flex'; if (voterFN) voterFN.style.display = 'none'; }

      // siblings (array of { name, gender, age })
      try {
        const siblings = Array.isArray(data.siblings) ? data.siblings : (data.siblings ? JSON.parse(data.siblings) : []);
        renderSiblings(siblings || []);
        // Store original siblings for change tracking
        originalSiblings = JSON.parse(JSON.stringify(siblings || []));
      } catch (e) { renderSiblings([]); originalSiblings = []; }

      // expenses (array of { description, cost })
      try {
        const expenses = Array.isArray(data.expenses) ? data.expenses : (data.expenses ? JSON.parse(data.expenses) : []);
        renderExpenses(expenses || []);
        // Store original expenses for change tracking
        originalExpenses = JSON.parse(JSON.stringify(expenses || []));
      } catch (e) { renderExpenses([]); originalExpenses = []; }

      // Store original form data for change tracking
      originalData = {
        surname: (document.getElementById('surname') || {}).value || '',
        firstname: (document.getElementById('firstName') || {}).value || '',
        middlename: (document.getElementById('middleName') || {}).value || '',
        suffix: (document.getElementById('suffix') || {}).value || '',
        birthday: (document.getElementById('birthday') || {}).value || '',
        placeOfBirth: (document.getElementById('placeOfBirth') || {}).value || '',
        age: (document.getElementById('age') || {}).value || '',
        gender: (document.getElementById('gender') || {}).value || '',
        civilstatus: (document.getElementById('civilstatus') || {}).value || '',
        religion: (document.getElementById('religion') || {}).value || '',
        email: (document.getElementById('email') || {}).value || '',
        contact: (document.getElementById('contact') || {}).value || '',
        schoolname: (document.getElementById('schoolname') || {}).value || '',
        schooladdress: (document.getElementById('schooladdress') || {}).value || '',
        year: (document.getElementById('year') || {}).value || '',
        benefittype: (document.getElementById('benefittype') || {}).value || '',
        fathername: (document.getElementById('fathername') || {}).value || '',
        fathercontact: (document.getElementById('fathercontact') || {}).value || '',
        mothername: (document.getElementById('mothername') || {}).value || '',
        mothercontact: (document.getElementById('mothercontact') || {}).value || ''
      };

      // Initial state: disable submit button since form just loaded (no changes yet)
      updateSubmitButtonState();

    } catch (e) {
      console.warn('populate educational failed', e);
    }
  }

  // Function to check if form has changes
  function hasChanges() {
    // Check if any form fields changed
    const currentPayload = {
      surname: (document.getElementById('surname') || {}).value || '',
      firstname: (document.getElementById('firstName') || {}).value || '',
      middlename: (document.getElementById('middleName') || {}).value || '',
      suffix: (document.getElementById('suffix') || {}).value || '',
      birthday: (document.getElementById('birthday') || {}).value || '',
      placeOfBirth: (document.getElementById('placeOfBirth') || {}).value || '',
      age: (document.getElementById('age') || {}).value || '',
      gender: (document.getElementById('gender') || {}).value || '',
      civilstatus: (document.getElementById('civilstatus') || {}).value || '',
      religion: (document.getElementById('religion') || {}).value || '',
      email: (document.getElementById('email') || {}).value || '',
      contact: (document.getElementById('contact') || {}).value || '',
      schoolname: (document.getElementById('schoolname') || {}).value || '',
      schooladdress: (document.getElementById('schooladdress') || {}).value || '',
      year: (document.getElementById('year') || {}).value || '',
      benefittype: (document.getElementById('benefittype') || {}).value || '',
      fathername: (document.getElementById('fathername') || {}).value || '',
      fathercontact: (document.getElementById('fathercontact') || {}).value || '',
      mothername: (document.getElementById('mothername') || {}).value || '',
      mothercontact: (document.getElementById('mothercontact') || {}).value || ''
    };

    // Check if any field changed
    for (const key in originalData) {
      if (currentPayload[key] !== originalData[key]) {
        return true;
      }
    }

    // Check if image states changed
    if (frontState.removed || backState.removed || coeState.removed || voterState.removed) return true;
    if (frontState.base64 && String(frontState.base64).startsWith('data:')) return true;
    if (backState.base64 && String(backState.base64).startsWith('data:')) return true;
    if (coeState.base64 && String(coeState.base64).startsWith('data:')) return true;
    if (voterState.base64 && String(voterState.base64).startsWith('data:')) return true;

    // Check if siblings changed
    const currentSiblings = readSiblingsFromTable() || [];
    if (JSON.stringify(currentSiblings) !== JSON.stringify(originalSiblings)) {
      return true;
    }

    // Check if expenses changed
    const currentExpenses = readExpensesFromTable() || [];
    if (JSON.stringify(currentExpenses) !== JSON.stringify(originalExpenses)) {
      return true;
    }

    return false;
  }

  // Function to update submit button state
  function updateSubmitButtonState() {
    const submitBtn = document.querySelector('button[type="submit"]');
    if (!submitBtn) return;

    if (hasChanges()) {
      submitBtn.disabled = false;
      submitBtn.style.opacity = '1';
      submitBtn.style.cursor = 'pointer';
    } else {
      submitBtn.disabled = true;
      submitBtn.style.opacity = '0.5';
      submitBtn.style.cursor = 'not-allowed';
    }
  }

  // submit handler
  const form = document.getElementById('educationalAssistanceForm');
  if (form) form.addEventListener('submit', async function (ev) {
    ev.preventDefault();

    // Check if there are any changes before allowing submission
    if (!hasChanges()) {
      await Swal.fire({
        icon: 'warning',
        title: 'No Changes Made',
        text: 'You didn\'t change anything. Please make some changes before updating.',
        confirmButtonText: 'OK',
        confirmButtonColor: '#0A2C59'
      });
      return;
    }

    try {
      const confirmed = await Swal.fire({
        title: 'Save changes?',
        icon: 'question',
        showCancelButton: true,
        showConfirmButton: true,
        confirmButtonText: 'Save',
        cancelButtonText: 'Cancel',
        confirmButtonColor: '#0A2C59',
        focusConfirm: true
      });
      if (!confirmed || !confirmed.isConfirmed) return;
    } catch (e) { console.warn('Swal failed, proceeding'); }

    // NOTE: moved showing of the "Saving..." loading modal until after validation

    // gather payload
    const payload = {
      surname: (document.getElementById('surname') || {}).value || '',
      firstname: (document.getElementById('firstName') || {}).value || '',
      middlename: (document.getElementById('middleName') || {}).value || '',
      suffix: (document.getElementById('suffix') || {}).value || '',
      birthday: (document.getElementById('birthday') || {}).value || '',
      placeOfBirth: (document.getElementById('placeOfBirth') || {}).value || '',
      age: (document.getElementById('age') || {}).value || '',
      gender: (document.getElementById('gender') || {}).value || '',
      civilstatus: (document.getElementById('civilstatus') || {}).value || '',
      religion: (document.getElementById('religion') || {}).value || '',
      email: (document.getElementById('email') || {}).value || '',
      contact: (document.getElementById('contact') || {}).value || '',
      schoolname: (document.getElementById('schoolname') || {}).value || '',
      schooladdress: (document.getElementById('schooladdress') || {}).value || '',
      year: (document.getElementById('year') || {}).value || '',
      benefittype: (document.getElementById('benefittype') || {}).value || '',
      fathername: (document.getElementById('fathername') || {}).value || '',
      fathercontact: (document.getElementById('fathercontact') || {}).value || '',
      mothername: (document.getElementById('mothername') || {}).value || '',
      mothercontact: (document.getElementById('mothercontact') || {}).value || ''
    };

    try {
      // collect siblings and expenses from table
      const siblings = readSiblingsFromTable();
      const expenses = readExpensesFromTable();

      // Validate required uploaded documents before proceeding
      try {
        const acadEl = document.getElementById('academicLevel');
        const acadVal = (acadEl && acadEl.value) ? acadEl.value.toString().toLowerCase() : (data && (data.academicLevel || data.academiclevel) ? (data.academicLevel || data.academiclevel).toString().toLowerCase() : '');
        const voterRequired = !(acadVal && acadVal.includes('senior'));

        const filePresent = (state, inputEl) => {
          // present if there's a base64 stored and not removed, or if input has files
          if (!state) state = {};
          if (state.removed) return false;
          if (state.base64) return true;
          if (inputEl && inputEl.files && inputEl.files.length) return true;
          return false;
        };

        const missing = [];
        if (!filePresent(frontState, frontInput)) missing.push('Front ID (School ID - Front)');
        if (!filePresent(backState, backInput)) missing.push('Back ID (School ID - Back)');
        if (!filePresent(coeState, coeInput)) missing.push('Certificate of Enrollment');
        if (voterRequired && !filePresent(voterState, voterInput)) missing.push("Parent's Voter's Certificate");

        if (missing.length) {
          try { Swal.close(); } catch (e) {}
          await Swal.fire({
            icon: 'warning',
            title: 'Missing Requirements',
            html: `<p>Please upload the following required documents before saving:</p><ul style="text-align:left">${missing.map(m=>`<li>${m}</li>`).join('')}</ul>`,
            showConfirmButton: true,
            confirmButtonText: 'OK'
          });
          return;
        }

      // All validations passed — show the saving/loading modal now
      try {
        try { Swal.close(); } catch (e) {}
        Swal.fire({
          title: 'Saving...',
          allowOutsideClick: false,
          allowEscapeKey: false,
          didOpen: () => Swal.showLoading(),
          showConfirmButton: false,
          showCancelButton: false
        });
      } catch (e) {}
      } catch (e) { /* ignore validation errors and proceed */ }

  const hasNewFront = !!frontState.base64 && String(frontState.base64).startsWith('data:');
      const hasNewBack = !!backState.base64 && String(backState.base64).startsWith('data:');
      const hasNewCOE = !!coeState.base64 && String(coeState.base64).startsWith('data:');
      const hasNewVoter = !!voterState.base64 && String(voterState.base64).startsWith('data:');

      const needFormData = hasNewFront || hasNewBack || hasNewCOE || hasNewVoter || frontState.removed || backState.removed || coeState.removed || voterState.removed;

      // Normalize keys to match backend model before sending
      const normalizeExpenses = (arr) => (arr || []).map(e => ({
        item: e.item || e.description || '',
        expectedCost: Number((e.expectedCost !== undefined ? e.expectedCost : e.cost) || 0)
      })).filter(ex => ex.item || ex.expectedCost);

      const normalizeSiblings = (arr) => (arr || []).map(s => ({
        name: s.name || s.fullName || '',
        gender: s.gender || '',
        age: Number(s.age || 0)
      })).filter(s => s.name || s.gender || s.age);

      const normalized = {
        // strings directly copied
        surname: payload.surname,
        firstname: payload.firstname,
        middlename: payload.middlename,
        suffix: payload.suffix,
        birthday: payload.birthday,
        placeOfBirth: payload.placeOfBirth,
        age: payload.age ? Number(payload.age) : undefined,
        // map frontend -> backend field names
        sex: payload.gender,
        civilStatus: payload.civilstatus,
        religion: payload.religion,
        email: payload.email,
        contactNumber: payload.contact ? (isNaN(Number(payload.contact)) ? payload.contact : Number(payload.contact)) : undefined,
        school: payload.schoolname,
        schoolAddress: payload.schooladdress,
        year: payload.year,
        typeOfBenefit: payload.benefittype,
        fatherName: payload.fathername,
        fatherPhone: payload.fathercontact,
        motherName: payload.mothername,
        motherPhone: payload.mothercontact,
        siblings: normalizeSiblings(siblings),
        expenses: normalizeExpenses(expenses),
      };

      if (needFormData) {
        const fd = new FormData();
        Object.entries(normalized).forEach(([k, v]) => {
          if (v === undefined || v === null) return;
          if (k === 'siblings' || k === 'expenses') {
            fd.append(k, JSON.stringify(v));
          } else {
            fd.append(k, String(v));
          }
        });
        const removed = {};
        if (frontState.removed) removed.front = true;
        if (backState.removed) removed.back = true;
        if (coeState.removed) removed.coe = true;
        if (voterState.removed) removed.voter = true;
        if (Object.keys(removed).length) fd.append('_removed', JSON.stringify(removed));
        if (hasNewFront) fd.append('frontImage', base64ToFile(frontState.base64, 'front.png'));
        if (hasNewBack) fd.append('backImage', base64ToFile(backState.base64, 'back.png'));
        if (hasNewCOE) fd.append('coeImage', base64ToFile(coeState.base64, 'coe.png'));
        if (hasNewVoter) fd.append('voter', base64ToFile(voterState.base64, 'voter.png'));

        const res = await fetch(`${API_BASE}/api/educational-assistance/me`, { method: 'PUT', headers: { Authorization: `Bearer ${token}` }, body: fd });
        const txt = await res.text();
        if (!res.ok) throw new Error(txt || 'Update failed');
        try { Swal.close(); } catch (e) {}
        // clear persisted removal flags now that changes were saved
        try { localStorage.removeItem('educ_remove_frontImage'); localStorage.removeItem('educ_remove_backImage'); localStorage.removeItem('educ_remove_coeImage'); localStorage.removeItem('educ_remove_voter'); } catch (e) {}
        await Swal.fire({ icon: 'success', title: 'Saved', text: 'Application updated.' });
        window.location.href = 'educConfirmation.html';
        return;
      } else {
        // JSON PUT - send normalized payload
        const jsonRes = await fetch(`${API_BASE}/api/educational-assistance/me`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(normalized) });
        const j = await jsonRes.json().catch(()=>null);
        if (!jsonRes.ok) throw new Error((j && j.error) || 'Update failed');
        try { Swal.close(); } catch (e) {}
        try { localStorage.removeItem('educ_remove_frontImage'); localStorage.removeItem('educ_remove_backImage'); localStorage.removeItem('educ_remove_coeImage'); localStorage.removeItem('educ_remove_voter'); } catch (e) {}
        await Swal.fire({ icon: 'success', title: 'Saved', text: 'Application updated.' });
        window.location.href = 'educConfirmation.html';
        return;
      }
    } catch (err) {
      console.error('Save failed', err);
      try { Swal.close(); } catch (e) {}
      await Swal.fire({ icon: 'error', title: 'Save failed', text: String(err.message || err) });
    }
  });

  // Inject CSS for expense cost wrapper with peso sign and .00
  (function injectExpenseCostStyles() {
    if (document.getElementById('editeduc-expense-cost-injected-styles')) return;
    const style = document.createElement('style');
    style.id = 'editeduc-expense-cost-injected-styles';
    style.textContent = `
      /* Place peso sign and .00 visually inside the input */
      .expense-cost-wrapper{ position:relative; display:inline-block; }
      .expense-cost-wrapper input.exp-cost{ box-sizing:border-box; padding-left:28px; padding-right:34px; width:120px; }
      .expense-cost-wrapper .peso-prefix{ position:absolute; left:8px; top:50%; transform:translateY(-50%); font-weight:600; pointer-events:none; }
      .expense-cost-wrapper .peso-suffix{ position:absolute; right:8px; top:50%; transform:translateY(-50%); color:#666; pointer-events:none; }
      /* In card (mobile) layout, make cost input match the full width of the expense item */
      .expense-card .expense-cost-wrapper { display:block; width:100%; }
      .expense-card .expense-cost-wrapper input.exp-cost { width:100%; }
    `;
    document.head.appendChild(style);
  })();

  // Attach change listeners to all form fields to track changes
  if (form) {
    // Track input changes
    form.addEventListener('input', updateSubmitButtonState);
    form.addEventListener('change', updateSubmitButtonState);
  }

  // Also monitor image state changes by watching the delete buttons
  if (deleteFront || deleteBack || deleteCOE || deleteVoter) {
    const observer = () => updateSubmitButtonState();
    if (deleteFront) deleteFront.addEventListener('click', observer);
    if (deleteBack) deleteBack.addEventListener('click', observer);
    if (deleteCOE) deleteCOE.addEventListener('click', observer);
    if (deleteVoter) deleteVoter.addEventListener('click', observer);
  }

  populate();
});

// All nav button event listeners removed; navigation is now handled by navbar.js

// All nav handler implementations removed; navigation is now handled by navbar.js