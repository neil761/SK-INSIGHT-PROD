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
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');

  const ageInput = document.getElementById('age');
  const birthdayInput = document.getElementById('birthday');
  const registeredNationalVoter = document.getElementById('registeredNationalVoter'); // Your select element

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



  const form = document.getElementById('personalForm');
  const saved = JSON.parse(sessionStorage.getItem('kkProfileStep1') || '{}');

  document.getElementById('lastname').value = saved.lastname || '';
  document.getElementById('firstname').value = saved.firstname || '';
  document.getElementById('middlename').value = saved.middlename || '';
  document.getElementById('suffix').value = saved.suffix || '';
  document.getElementById('gender').value = saved.gender || '';
  if (birthdayInput && !birthdayInput.value) {
    // Prefer saved value in sessionStorage
    birthdayInput.value = saved.birthday || '';

    // If no saved birthday and we have a token, fetch from server (/api/users/me)
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if ((!birthdayInput.value || birthdayInput.value === '') && token) {
      fetch(`${API_BASE}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.json())
      .then(user => {
        if (user && (user.birthday || user.dateOfBirth)) {
          // Accept either `birthday` or `dateOfBirth` field if backend uses different name
          const raw = user.birthday || user.dateOfBirth;
          const val = (typeof raw === 'string' && raw.includes('T')) ? raw.split('T')[0] : raw;
          if (val && !birthdayInput.value) {
            birthdayInput.value = val;
            if (ageInput) {
              ageInput.value = calculateAge(birthdayInput.value);
              try { updateRegisteredNationalVoterEligibility(calculateAge(birthdayInput.value)); } catch(e) {}
            }
          }
        } else {
          if (ageInput) {
            ageInput.value = calculateAge(birthdayInput.value);
            try { updateRegisteredNationalVoterEligibility(calculateAge(birthdayInput.value)); } catch(e) {}
          }
        }
      })
      .catch(() => {
        if (ageInput) {
          ageInput.value = calculateAge(birthdayInput.value);
          try { updateRegisteredNationalVoterEligibility(calculateAge(birthdayInput.value)); } catch(e) {}
        }
      });
    } else {
      if (ageInput) {
        const age = calculateAge(birthdayInput.value);
        ageInput.value = age;
        try { updateRegisteredNationalVoterEligibility(age); } catch(e) {}
      }
    }
  }

  // If name fields are empty and we have a token, fetch user info from /api/users/me
  // and populate `lastname`, `firstname`, `middlename`, `suffix` when available.
  if (token) {
    try {
      fetch(`${API_BASE}/api/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      })
      .then(res => res.ok ? res.json() : null)
      .then(user => {
        if (!user) return;
        // Support multiple id variants used across templates
        const lastnameEl = document.getElementById('lastname') || document.getElementById('lastName') || document.getElementById('surname');
        const firstnameEl = document.getElementById('firstname') || document.getElementById('firstName');
        const middlenameEl = document.getElementById('middlename') || document.getElementById('middleName');
        const suffixEl = document.getElementById('suffix');

        // Only fill if the field is currently empty (do not overwrite saved/drafted values)
        if (lastnameEl && (!lastnameEl.value || lastnameEl.value === '')) {
          lastnameEl.value = user.lastname || user.lastName || user.surname || user.familyName || '';
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
      })
      .catch(() => {});
    } catch (e) {
      // ignore fetch errors silently
    }
  }

    // Prefill from most recent KK profile (active or fallback). Populates only empty fields
    // Cache the recent profile in sessionStorage under 'kkRecentProfile' to avoid repeated requests.
    (async () => {
      if (!token) return;
      try {
        const cacheKey = 'kkRecentProfile';
        let recent = null;
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          try { recent = JSON.parse(cached); } catch (e) { recent = null; }
        }
        if (!recent) {
          const r = await fetch(`${API_BASE}/api/kkprofiling/me/recent`, { headers: { Authorization: `Bearer ${token}` } });
          if (r.ok) {
            recent = await r.json().catch(() => null);
            if (recent) sessionStorage.setItem(cacheKey, JSON.stringify(recent));
          }
        }
        if (!recent) return;
        const p = recent.profile || recent;
        if (!p) return;

        const saved = JSON.parse(sessionStorage.getItem('kkProfileStep1') || '{}');
        let didPopulate = false;

        function fillIfEmpty(elId, savedKey, value) {
          if (!value) return false;
          const el = document.getElementById(elId);
          if (!el) return false;
          if ((saved && saved[savedKey]) || (el.value && el.value !== '')) return false;
          el.value = value;
          saved[savedKey] = value;
          return true;
        }

        // Map profile fields to form fields (do not overwrite existing values)
        didPopulate = fillIfEmpty('lastname', 'lastname', p.lastname || p.lastName || p.surname) || didPopulate;
        didPopulate = fillIfEmpty('firstname', 'firstname', p.firstname || p.firstName || p.givenName) || didPopulate;
        didPopulate = fillIfEmpty('middlename', 'middlename', p.middlename || p.middleName) || didPopulate;
        didPopulate = fillIfEmpty('suffix', 'suffix', p.suffix) || didPopulate;
        // birthday
        didPopulate = fillIfEmpty('birthday', 'birthday', p.birthday || p.dateOfBirth) || didPopulate;
        // gender field in this form is 'gender'
        didPopulate = fillIfEmpty('gender', 'gender', p.gender || p.sexAssignedAtBirth) || didPopulate;

        // Persist any changes into kkProfileStep1 so next step sees them
        try { sessionStorage.setItem('kkProfileStep1', JSON.stringify(saved)); } catch (e) { /* ignore */ }

        // Show one-time alert on personal form when prefill occurred or when the
        // returned profile is a fallback from a previous cycle. Do not show again
        // in this tab once displayed (tracked by sessionStorage).
        try {
          const isFallback = (recent && typeof recent.isForActiveCycle !== 'undefined') ? !recent.isForActiveCycle : false;
          // If the user navigated back from the Address page, suppress the alert once.
          const navigatedFromAddress = !!sessionStorage.getItem('kkNavigatedFromAddress');
          if (navigatedFromAddress) {
            try { sessionStorage.removeItem('kkNavigatedFromAddress'); } catch (e) {}
          }
          const shouldAlert = (didPopulate || isFallback) && !navigatedFromAddress;
          if (shouldAlert) {
            const cycle = p.formCycle || (recent.profile && recent.profile.formCycle) || null;
            let cycleText = '';
            if (cycle && (cycle.cycleNumber || cycle.year)) {
              const num = cycle.cycleNumber ? `Cycle ${cycle.cycleNumber}` : '';
              const yr = cycle.year ? `${cycle.year}` : '';
              cycleText = `${num}${num && yr ? ', ' : ''}${yr}`.trim();
            }
            const message = 'Some fields were prefilled. Your draft was not changed. Please review before submitting.';
            Swal.fire({ icon: 'info', title: 'Prefilled answers loaded', text: message, confirmButtonText: 'OK', showClass: { popup: '' }, hideClass: { popup: '' } });
          }
        } catch (e) { /* ignore alert failures */ }
      } catch (err) {
        // ignore
        console.warn('Failed to fetch recent KK profile:', err);
      }
    })();

  // Determine youth age group from calculated age and persist as a suggestion for step3
  function determineYouthAgeGroup(age) {
    if (typeof age !== 'number' || isNaN(age)) return '';
    if (age >= 15 && age <= 17) return 'Child Youth';
    if (age >= 18 && age <= 24) return 'Core Youth';
    if (age >= 25 && age <= 30) return 'Young Youth';
    return '';
  }

  // Ensure registered national voter field is false/No and readonly for minors (age <= 17)
  function updateRegisteredNationalVoterEligibility(age) {
    if (!registeredNationalVoter) return;
    const numericAge = Number(age);
    const isMinor = !isNaN(numericAge) && numericAge <= 17;
    const opts = Array.from(registeredNationalVoter.options || []);
    let noOptionIndex = opts.findIndex(o => {
      const v = (o.value||'').toString().toLowerCase();
      const t = (o.text||'').toString().toLowerCase();
      return ['false','no','0','n','none'].includes(v) || t === 'no' || /(^|\s)no(\s|$)/i.test(t);
    });
    if (isMinor) {
      if (noOptionIndex >= 0) {
        registeredNationalVoter.selectedIndex = noOptionIndex;
      } else {
        // create an injected "No" option so there's a concrete selectable value
        let injected = registeredNationalVoter.querySelector('option[data-injected-no="1"]');
        if (!injected) {
          injected = document.createElement('option');
          injected.value = 'false';
          injected.text = 'No';
          injected.setAttribute('data-injected-no','1');
          registeredNationalVoter.insertBefore(injected, registeredNationalVoter.firstChild);
        }
        // select the injected option
        for (let i = 0; i < registeredNationalVoter.options.length; i++) {
          if (registeredNationalVoter.options[i].getAttribute('data-injected-no') === '1') {
            registeredNationalVoter.selectedIndex = i;
            break;
          }
        }
      }
      registeredNationalVoter.disabled = true;
      registeredNationalVoter.classList && registeredNationalVoter.classList.add('readonly');
    } else {
      // Re-enable and remove injected option if present
      registeredNationalVoter.disabled = false;
      registeredNationalVoter.classList && registeredNationalVoter.classList.remove('readonly');
      const injected = registeredNationalVoter.querySelector('option[data-injected-no="1"]');
      if (injected) {
        const wasSelected = injected.selected;
        injected.remove();
        if (wasSelected) {
          // choose a sensible default: first option with non-empty value
          let selectedIndex = -1;
          for (let i = 0; i < registeredNationalVoter.options.length; i++) {
            const v = (registeredNationalVoter.options[i].value || '').toString();
            if (v !== '') { selectedIndex = i; break; }
          }
          if (selectedIndex >= 0) registeredNationalVoter.selectedIndex = selectedIndex;
        }
      }
    }
  }

  // If we have an age now, set a suggested youthAgeGroup in kkProfileStep3 (do not overwrite existing value)
  try {
    const currentBirthday = (birthdayInput && birthdayInput.value) ? birthdayInput.value : saved.birthday;
    const currentAge = calculateAge(currentBirthday);
    // Ensure registered national voter state matches current age
    try { updateRegisteredNationalVoterEligibility(currentAge); } catch(e) {}
    const suggestedGroup = determineYouthAgeGroup(currentAge);
    if (suggestedGroup) {
      const step3 = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
      if (!step3.youthAgeGroup) {
        step3.youthAgeGroup = suggestedGroup;
        sessionStorage.setItem('kkProfileStep3', JSON.stringify(step3));
      }
    }
  } catch (e) {
    // ignore
  }



  form.addEventListener('submit', function (e) {
    e.preventDefault();
    const data = {
      lastname: form.lastname.value.trim(),
      firstname: form.firstname.value.trim(),
      middlename: form.middlename.value.trim(),
      suffix: form.suffix.value.trim(),
      gender: form.gender.value,
      birthday: form.birthday.value
    };
    sessionStorage.setItem('kkProfileStep1', JSON.stringify(data));
    window.location.href = 'kkform-address.html';
  });

  // Autosave on any input change so data persists across reloads (but cleared on tab close)
  function saveStep1() {
    try {
      const data = {
        lastname: form.lastname.value.trim(),
        firstname: form.firstname.value.trim(),
        middlename: form.middlename.value.trim(),
        suffix: form.suffix.value.trim(),
        gender: form.gender.value,
        birthday: form.birthday.value
      };
      sessionStorage.setItem('kkProfileStep1', JSON.stringify(data));
      // Also persist suggested youthAgeGroup from this birthday into step3 if not set
      try {
        const age = calculateAge(data.birthday);
        const suggested = determineYouthAgeGroup(age);
        if (suggested) {
          const step3 = JSON.parse(sessionStorage.getItem('kkProfileStep3') || '{}');
          if (!step3.youthAgeGroup) {
            step3.youthAgeGroup = suggested;
            sessionStorage.setItem('kkProfileStep3', JSON.stringify(step3));
          }
        }
      } catch (e) { /* ignore */ }
    } catch (e) {
      // ignore storage errors
    }
  }

  // Save as user types or changes fields
  form.addEventListener('input', saveStep1);

  // When birthday changes update age and enforce voter eligibility rules
  if (birthdayInput) {
    birthdayInput.addEventListener('change', function () {
      const newAge = calculateAge(this.value);
      if (ageInput) ageInput.value = newAge;
      try { updateRegisteredNationalVoterEligibility(newAge); } catch(e) {}
    });
  }
});

// Navigation and hamburger are handled centrally by `navbar.js`.
// This file no longer defines or attaches nav click handlers. If this page needs to provide
// helpers for the centralized navbar, they should be registered on `window` (see helper below).

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

  if (typeof window !== 'undefined') window.checkAndPromptEducReapply = checkAndPromptEducReapply;
})();