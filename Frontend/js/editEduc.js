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
        // show upload label again if present (e.g., frontLabel)
        const label = document.getElementById(`${inputEl.id}Label`);
        if (label) label.style.display = 'inline-flex';
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
          <div class="expense-field"><label>Expected Cost</label><input type="number" class="exp-cost" value="${costVal}" min="0" step="0.01"></div>
          <div><button type="button" class="remove-exp">Remove</button></div>
        `;
        expensesTableBody.appendChild(card);
        card.querySelector('.remove-exp').addEventListener('click', () => card.remove());
      } else {
        const tr = document.createElement('tr');
        const descVal = e.description || e.desc || e.item || '';
        const costVal = e.cost || e.expectedCost || '';
        tr.innerHTML = `
          <td><input type="text" class="exp-desc" value="${descVal}"></td>
          <td><input type="number" class="exp-cost" value="${costVal}" min="0" step="0.01"></td>
          <td><button type="button" class="remove-exp">Remove</button></td>
        `;
        expensesTableBody.appendChild(tr);
        tr.querySelector('.remove-exp').addEventListener('click', () => tr.remove());
      }
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
    fr.onload = () => { frontState.base64 = fr.result; frontState.removed = false; showFileName('frontFileName', f.name); };
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
    fr.onload = () => { backState.base64 = fr.result; backState.removed = false; showFileName('backFileName', f.name); };
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
    fr.onload = () => { coeState.base64 = fr.result; coeState.removed = false; showFileName('coeFileName', f.name); };
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
    fr.onload = () => { voterState.base64 = fr.result; voterState.removed = false; showFileName('voterFileName', f.name); };
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
      setIfExists('year', data.year || '');
      setIfExists('benefittype', data.benefittype || data.typeOfBenefit || '');
      setIfExists('fathername', data.fathername || '');
      setIfExists('fathercontact', data.fathercontact || '');
      setIfExists('mothername', data.mothername || '');
      setIfExists('mothercontact', data.mothercontact || '');

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

      // Toggle upload labels/file name visibility based on existing images
      const frontLabel = document.getElementById('frontLabel');
      const frontFN = document.getElementById('frontFileName');
      if (frontState.base64) { if (frontLabel) frontLabel.style.display = 'none'; if (frontFN) frontFN.style.display = 'inline-block'; }
      const backLabel = document.getElementById('backLabel');
      const backFN = document.getElementById('backFileName');
      if (backState.base64) { if (backLabel) backLabel.style.display = 'none'; if (backFN) backFN.style.display = 'inline-block'; }
      const coeLabel = document.getElementById('coeLabel');
      const coeFN = document.getElementById('coeFileName');
      if (coeState.base64) { if (coeLabel) coeLabel.style.display = 'none'; if (coeFN) coeFN.style.display = 'inline-block'; }
      const voterLabel = document.getElementById('voterLabel');
      const voterFN = document.getElementById('voterFileName');
      if (voterState.base64) { if (voterLabel) voterLabel.style.display = 'none'; if (voterFN) voterFN.style.display = 'inline-block'; }

      // siblings (array of { name, gender, age })
      try {
        const siblings = Array.isArray(data.siblings) ? data.siblings : (data.siblings ? JSON.parse(data.siblings) : []);
        renderSiblings(siblings || []);
      } catch (e) { renderSiblings([]); }

      // expenses (array of { description, cost })
      try {
        const expenses = Array.isArray(data.expenses) ? data.expenses : (data.expenses ? JSON.parse(data.expenses) : []);
        renderExpenses(expenses || []);
      } catch (e) { renderExpenses([]); }

    } catch (e) {
      console.warn('populate educational failed', e);
    }
  }

  // submit handler
  const form = document.getElementById('educationalAssistanceForm');
  if (form) form.addEventListener('submit', async function (ev) {
    ev.preventDefault();

    try {
      const confirmed = await Swal.fire({ title: 'Save changes?', icon: 'question', showCancelButton: true, confirmButtonText: 'Save', cancelButtonText: 'Cancel', confirmButtonColor: '#0A2C59' });
      if (!confirmed || !confirmed.isConfirmed) return;
    } catch (e) { console.warn('Swal failed, proceeding'); }

    try { Swal.fire({ title: 'Saving...', allowOutsideClick: false, allowEscapeKey: false, didOpen: () => Swal.showLoading(), showConfirmButton: false }); } catch (e) {}

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
        await Swal.fire({ icon: 'success', title: 'Saved', text: 'Application updated.' });
        window.location.href = 'educConfirmation.html';
        return;
      } else {
        // JSON PUT - send normalized payload
        const jsonRes = await fetch(`${API_BASE}/api/educational-assistance/me`, { method: 'PUT', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(normalized) });
        const j = await jsonRes.json().catch(()=>null);
        if (!jsonRes.ok) throw new Error((j && j.error) || 'Update failed');
        try { Swal.close(); } catch (e) {}
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

  populate();
});

// All nav button event listeners removed; navigation is now handled by navbar.js

// All nav handler implementations removed; navigation is now handled by navbar.js