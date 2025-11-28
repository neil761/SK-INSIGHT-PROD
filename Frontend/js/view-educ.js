document.addEventListener('DOMContentLoaded', async function() {
  const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
    ? window.API_BASE
    : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
      ? 'http://localhost:5000'
      : 'https://sk-insight.online';
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
    document.getElementById('year').value = data.year || '';
    document.getElementById('benefittype').value = data.typeOfBenefit || '';
    document.getElementById('fathername').value = data.fatherName || '';
    document.getElementById('fathercontact').value = data.fatherPhone || '';
    document.getElementById('mothername').value = data.motherName || '';
    document.getElementById('mothercontact').value = data.motherPhone || '';

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

// All nav button event listeners removed; navigation is now handled by navbar.js

// All nav handler implementations removed; navigation is now handled by navbar.js

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

