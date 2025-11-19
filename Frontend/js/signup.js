document.addEventListener('DOMContentLoaded', () => {

    const signupForm = document.getElementById('signupForm');
    const passwordField = document.getElementById('passwordField');
    const togglePassword = document.getElementById('togglePassword');

    // NEW: birthday selects (ensure HTML has #birthdayYear, #birthdayMonth, #birthdayDay)
    const yearSelect = document.getElementById('birthdayYear');
    const monthSelect = document.getElementById('birthdayMonth');
    const daySelect = document.getElementById('birthdayDay');

    // helper to access custom wrapper parts
    function getCustom(field) {
      const wrapper = document.querySelector(`.custom-select[data-field="${field}"]`);
      if (!wrapper) return null;
      return {
        wrapper,
        trigger: wrapper.querySelector('.custom-select-trigger'),
        optionsContainer: wrapper.querySelector('.custom-options'),
        native: wrapper.querySelector('.native-select') || document.getElementById(field)
      };
    }

    (function populateBirthdaySelects() {
        const now = new Date();
        const currentYear = now.getFullYear();
        const startYear = currentYear - 100;

        const yearCustom = getCustom('birthdayYear');
        const monthCustom = getCustom('birthdayMonth');
        const dayCustom = getCustom('birthdayDay');

        // Populate native years (descending) and custom options
        for (let y = currentYear; y >= startYear; y--) {
            const opt = document.createElement('option');
            opt.value = String(y);
            opt.textContent = String(y);
            yearSelect.appendChild(opt);

            if (yearCustom && yearCustom.optionsContainer) {
              const row = document.createElement('div');
              row.className = 'custom-option';
              row.tabIndex = 0;
              row.dataset.value = String(y);
              row.textContent = String(y);
              yearCustom.optionsContainer.appendChild(row);
            }
        }

        // Populate month custom options from native monthSelect (native months already in HTML)
        if (monthCustom && monthCustom.optionsContainer) {
          const monthOptions = Array.from(monthSelect.querySelectorAll('option')).slice(1); // skip placeholder
          monthOptions.forEach(optEl => {
            const row = document.createElement('div');
            row.className = 'custom-option';
            row.tabIndex = 0;
            row.dataset.value = optEl.value;
            row.textContent = optEl.textContent;
            monthCustom.optionsContainer.appendChild(row);
          });
        }

        // Days population helper (native + custom)
        function setDays(count) {
            daySelect.innerHTML = '<option value="">Day</option>';
            if (dayCustom && dayCustom.optionsContainer) dayCustom.optionsContainer.innerHTML = '';
            for (let d = 1; d <= count; d++) {
                const v = d < 10 ? '0' + d : String(d);
                const opt = document.createElement('option');
                opt.value = v;
                opt.textContent = String(d);
                daySelect.appendChild(opt);

                if (dayCustom && dayCustom.optionsContainer) {
                  const row = document.createElement('div');
                  row.className = 'custom-option';
                  row.tabIndex = 0;
                  row.dataset.value = v;
                  row.textContent = String(d);
                  dayCustom.optionsContainer.appendChild(row);
                }
            }
        }
        setDays(31);

        // Update days when month or year changes (handles leap years)
        function updateDaysFromNative() {
            const year = parseInt(yearSelect.value, 10);
            const month = parseInt(monthSelect.value, 10);
            if (!month || !year) {
                setDays(31);
                return;
            }
            const daysInMonth = new Date(year, month, 0).getDate();
            const prev = daySelect.value;
            setDays(daysInMonth);
            if (prev && parseInt(prev, 10) <= daysInMonth) daySelect.value = prev;
            // reflect selection text on custom trigger if day changed
            const dayC = getCustom('birthdayDay');
            if (dayC && prev) updateTrigger(dayC, String(Number(prev))); // remove leading zero for display
        }

        monthSelect.addEventListener('change', updateDaysFromNative);
        yearSelect.addEventListener('change', updateDaysFromNative);

        // utility to set trigger text and aria-selected
        function updateTrigger(custom, text) {
          if (!custom) return;
          const trigger = custom.trigger;
          trigger.textContent = text || (custom.native && custom.native.querySelector('option')?.textContent) || '';
        }

        // Attach interactions for custom selects
        ['birthdayYear','birthdayMonth','birthdayDay'].forEach(field => {
          const custom = getCustom(field);
          if (!custom) return;

          // initialize trigger display from native select if any
          const nativeEl = document.getElementById(field);
          if (nativeEl && nativeEl.value) {
            const selectedOpt = nativeEl.querySelector(`option[value="${nativeEl.value}"]`);
            if (selectedOpt) updateTrigger(custom, selectedOpt.textContent);
          }

          // open/close on trigger click
          custom.trigger.addEventListener('click', (ev) => {
            ev.stopPropagation();
            const isOpen = custom.wrapper.classList.contains('open');
            // close others
            document.querySelectorAll('.custom-select.open').forEach(w => {
              if (w !== custom.wrapper) {
                w.classList.remove('open');
                const t = w.querySelector('.custom-select-trigger');
                if (t) t.setAttribute('aria-expanded','false');
              }
            });
            if (!isOpen) {
              custom.wrapper.classList.add('open');
              custom.trigger.setAttribute('aria-expanded','true');
              // focus first option
              const first = custom.optionsContainer.querySelector('.custom-option');
              if (first) first.focus();
            } else {
              custom.wrapper.classList.remove('open');
              custom.trigger.setAttribute('aria-expanded','false');
            }
          });

          // option click
          custom.optionsContainer.addEventListener('click', (ev) => {
            const opt = ev.target.closest('.custom-option');
            if (!opt) return;
            const val = opt.dataset.value;
            // set native value
            const native = document.getElementById(field);
            if (native) {
              native.value = val;
              // update trigger display
              updateTrigger(custom, opt.textContent);
              native.dispatchEvent(new Event('change', { bubbles: true }));
            }
            // mark selection visually
            custom.optionsContainer.querySelectorAll('.custom-option').forEach(o => o.removeAttribute('aria-selected'));
            opt.setAttribute('aria-selected','true');
            // close
            custom.wrapper.classList.remove('open');
            custom.trigger.setAttribute('aria-expanded','false');
            custom.trigger.focus();
          });

          // keyboard navigation inside options container
          custom.optionsContainer.addEventListener('keydown', (ev) => {
            const items = Array.from(custom.optionsContainer.querySelectorAll('.custom-option'));
            const idx = items.indexOf(document.activeElement);
            if (ev.key === 'ArrowDown') {
              ev.preventDefault();
              const next = idx < items.length - 1 ? items[idx+1] : items[0];
              if (next) next.focus();
            } else if (ev.key === 'ArrowUp') {
              ev.preventDefault();
              const prev = idx > 0 ? items[idx-1] : items[items.length-1];
              if (prev) prev.focus();
            } else if (ev.key === 'Enter' || ev.key === ' ') {
              ev.preventDefault();
              if (document.activeElement && document.activeElement.classList.contains('custom-option')) {
                document.activeElement.click();
              }
            } else if (ev.key === 'Escape') {
              custom.wrapper.classList.remove('open');
              custom.trigger.setAttribute('aria-expanded','false');
              custom.trigger.focus();
            }
          });

        });

        // close on outside click
        document.addEventListener('click', (e) => {
          if (!e.target.closest('.custom-select')) {
            document.querySelectorAll('.custom-select.open').forEach(w => {
              w.classList.remove('open');
              const t = w.querySelector('.custom-select-trigger');
              if (t) t.setAttribute('aria-expanded','false');
            });
          }
        });

    })();

    if (!signupForm) {
        console.error('Signup form not found.');
        return;
    }

    // Show/Hide Password Toggle
    togglePassword.addEventListener('click', () => {
        const isPassword = passwordField.type === 'password';
        passwordField.type = isPassword ? 'text' : 'password';
        togglePassword.innerHTML = isPassword
            ? '<i class="fa-solid fa-eye-slash"></i>'
            : '<i class="fa-solid fa-eye"></i>';
    });

    // Submit Form (regular signup without ID image/AI checks)
    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = signupForm.querySelector('input[name="username"]').value.trim();
        const email = signupForm.querySelector('input[name="email"]').value.trim();
        const password = signupForm.querySelector('input[name="password"]').value;

        // Build birthday from native selects (they are kept updated by custom UI)
        const year = yearSelect.value;
        const month = monthSelect.value;
        const day = daySelect.value;
        const birthday = (year && month && day) ? `${year}-${month}-${day}` : '';

        if (!username || !email || !password || !birthday) {
            Swal.fire({ icon: 'error', title: 'Missing Fields', text: 'Please fill all required fields.' });
            return;
        }

        // Show loading alert
        Swal.fire({
            title: 'Registering...',
            text: 'Please wait while we process your registration.',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        try {
            const payload = { username, email, password, birthday };
            const response = await fetch('http://localhost:5000/api/users', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            Swal.close(); // Close loading alert

            const data = await response.json().catch(() => null);

            if (response.ok) {
                Swal.fire({ icon: 'success', title: 'Registration Successful!', text: 'You can now log in.', timer: 1000, showConfirmButton: false })
                    .then(() => window.location.href = '/Frontend/html/user/login.html');
            } else {
                let alertText = (data && (data.message || data.error)) || 'Please try again.';
                if (data && data.code === 'email_exists') alertText = 'This email is already registered.';
                if (data && data.code === 'username_exists') alertText = 'This username is already taken.';
                Swal.fire({ icon: 'error', title: 'Registration Failed', text: alertText });
            }

        } catch (error) {
            Swal.close(); // Close loading alert if fetch fails
            console.error('Fetch Error:', error);
            Swal.fire({ icon: 'error', title: 'Network Error', text: 'An error occurred during registration.' });
        }
    });

    // Remove flatpickr usage — birthday is now non-typable selects.
    // (If flatpickr script still loads it will not affect anything.)
});