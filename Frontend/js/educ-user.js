document.addEventListener('DOMContentLoaded', async function() {
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
      }
    } catch (err) {
      console.error('Failed to fetch birthday:', err);
    }
  }

  form.addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = new FormData();

    // Map form fields to backend model fields
    formData.append('surname', document.getElementById('surname').value);
    formData.append('firstname', document.getElementById('firstName').value);
    formData.append('middlename', document.getElementById('middleName').value);
    formData.append('birthday', document.getElementById('birthday').value); // This is now auto-filled
    formData.append('sex', document.getElementById('gender').value);
    formData.append('civilStatus', document.getElementById('civilstatus').value);
    formData.append('religion', document.getElementById('religion').value);
    formData.append('school', document.getElementById('schoolname').value);
    formData.append('schoolAddress', document.getElementById('schooladdress').value);
    formData.append('year', document.getElementById('year').value);
    formData.append('fatherName', document.getElementById('fathername').value);
    formData.append('fatherPhone', document.getElementById('fathercontact').value);
    formData.append('motherName', document.getElementById('mothername').value);
    formData.append('motherPhone', document.getElementById('mothercontact').value);
    formData.append('placeOfBirth', document.getElementById('placeOfBirth').value);
    formData.append('age', document.getElementById('age').value);
    formData.append('contactNumber', document.getElementById('contact').value);
    formData.append('email', document.getElementById('email').value);
    // ...add other fields as needed...

    // Siblings (collect from input fields)
    const siblings = [];
    document.querySelectorAll('#siblingsTableBody tr').forEach(row => {
      siblings.push({
        name: row.querySelector('.sibling-name').value,
        gender: row.querySelector('.sibling-gender').value,
        age: Number(row.querySelector('.sibling-age').value)
      });
    });
    formData.append('siblings', JSON.stringify(siblings));

    // Expenses (collect from input fields)
    const expenses = [];
    document.querySelectorAll('#expensesTableBody tr').forEach(row => {
      expenses.push({
        item: row.querySelector('.expense-item').value,
        expectedCost: Number(row.querySelector('.expense-cost').value)
      });
    });
    formData.append('expenses', JSON.stringify(expenses));

    // Signature file (if you have a file input for signature)
    const signatureInput = document.querySelector('input[type="file"][name="signature"]');
    if (signatureInput && signatureInput.files.length > 0) {
      formData.append('signature', signatureInput.files[0]);
    }

    // Sedula image
    const sedulaInput = document.getElementById('sedulaImage');
    if (sedulaInput && sedulaInput.files.length > 0) {
      formData.append('sedulaImage', sedulaInput.files[0]);
    }
    const coeInput = document.getElementById('coeImage');
    if (coeInput && coeInput.files.length > 0) {
      formData.append('coeImage', coeInput.files[0]);
    }
    const schoolIdInput = document.getElementById('schoolIdImage');
    if (schoolIdInput && schoolIdInput.files.length > 0) {
      formData.append('schoolIdImage', schoolIdInput.files[0]);
    }

    // Send to backend
    try {
      const res = await fetch('http://localhost:5000/api/educational-assistance', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData
      });
      const data = await res.json();
      if (res.ok) {
        Swal.fire("✅ Success", "Form submitted successfully!", "success");
        form.reset();
      } else {
        Swal.fire("❌ Error", data.message || "Submission failed.", "error");
      }
    } catch (err) {
      console.error("🚨 Fetch error:", err);
      Swal.fire("Error", "Something went wrong. Try again later.", "error");
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
  });

  // Siblings: Remove Row
  document.getElementById('siblingsTableBody').addEventListener('click', function(e) {
    if (e.target.classList.contains('removeSiblingBtn')) {
      e.target.closest('tr').remove();
    }
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
  });

  // Expenses: Remove Row
  document.getElementById('expensesTableBody').addEventListener('click', function(e) {
    if (e.target.classList.contains('removeExpenseBtn')) {
      e.target.closest('tr').remove();
    }
  });
});