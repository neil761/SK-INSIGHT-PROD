document.addEventListener('DOMContentLoaded', function() {
  // Restore youth step data if available
  const saved = JSON.parse(localStorage.getItem('kkProfileStep3') || '{}');
  document.getElementById('youthAgeGroup').value = saved.youthAgeGroup || '';
  document.getElementById('youthClassification').value = saved.youthClassification || '';
  document.getElementById('educationalBackground').value = saved.educationalBackground || '';
  document.getElementById('workStatus').value = saved.workStatus || '';
  document.getElementById('registeredSKVoter').checked = !!saved.registeredSKVoter;
  document.getElementById('registeredNationalVoter').checked = !!saved.registeredNationalVoter;
  document.getElementById('votedLastSKElection').checked = !!saved.votedLastSKElection;
  document.getElementById('attendedKKAssembly').checked = !!saved.attendedKKAssembly;
  document.getElementById('attendanceCount').value = saved.attendanceCount || '';
  document.getElementById('reasonDidNotAttend').value = saved.reasonDidNotAttend || '';

  const imagePreview = document.getElementById('imagePreview');
  const profileImage = document.getElementById('profileImage');

  // ✅ Restore saved image if exists
  if (saved.profileImage) {
    renderImage(saved.profileImage);
  }

  // Attendance logic
  const attendedKKAssembly = document.getElementById('attendedKKAssembly');
  const attendanceCountGroup = document.getElementById('attendanceCountGroup');
  const reasonGroup = document.getElementById('reasonGroup');
  attendedKKAssembly.addEventListener('change', () => {
    if (attendedKKAssembly.checked) {
      attendanceCountGroup.style.display = 'block';
      reasonGroup.style.display = 'none';
    } else {
      attendanceCountGroup.style.display = 'none';
      reasonGroup.style.display = 'block';
    }
  });

  // Image preview + save to localStorage as Base64
  profileImage.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        const base64Image = e.target.result;

        // Render preview with X button
        renderImage(base64Image);

        // Save to localStorage
        const current = JSON.parse(localStorage.getItem('kkProfileStep3') || '{}');
        current.profileImage = base64Image;
        localStorage.setItem('kkProfileStep3', JSON.stringify(current));
      };
      reader.readAsDataURL(file);
    }
    saveStep3(); // autosave on image change too
  });

  function renderImage(base64Image) {
    imagePreview.innerHTML = `
      <div style="position: relative; display: inline-block; max-width: 220px;">
        <img src="${base64Image}" alt="Profile Preview" style="width:100%; border-radius:10px;">
        <button id="removeImageBtn" style="
          position:absolute;
          top:5px;
          right:5px;
          background:red;
          color:white;
          border:none;
          border-radius:50%;
          width:24px;
          height:24px;
          cursor:pointer;
        ">×</button>
      </div>
    `;

    // Handle remove button click
    document.getElementById('removeImageBtn').addEventListener('click', () => {
      imagePreview.innerHTML = "";
      profileImage.value = ""; // clear file input
      const current = JSON.parse(localStorage.getItem('kkProfileStep3') || '{}');
      delete current.profileImage;
      localStorage.setItem('kkProfileStep3', JSON.stringify(current));
    });
  }

  const youthForm = document.getElementById('youthForm');

  // 🔹 Autosave on any input change
  youthForm.addEventListener('input', saveStep3);

  function saveStep3() {
    const step3Data = {
      youthAgeGroup: youthForm.youthAgeGroup.value,
      youthClassification: youthForm.youthClassification.value,
      educationalBackground: youthForm.educationalBackground.value,
      workStatus: youthForm.workStatus.value,
      registeredSKVoter: youthForm.registeredSKVoter.checked,
      registeredNationalVoter: youthForm.registeredNationalVoter.checked,
      votedLastSKElection: youthForm.votedLastSKElection.checked,
      attendedKKAssembly: youthForm.attendedKKAssembly.checked,
      attendanceCount: youthForm.attendanceCount.value,
      reasonDidNotAttend: youthForm.reasonDidNotAttend.value
    };

    // Keep existing saved image
    const existing = JSON.parse(localStorage.getItem('kkProfileStep3') || '{}');
    if (existing.profileImage) {
      step3Data.profileImage = existing.profileImage;
    }

    localStorage.setItem('kkProfileStep3', JSON.stringify(step3Data));
  }

  // 🔹 Helper: Convert Base64 -> File
  function base64ToFile(base64, filename) {
    const arr = base64.split(',');
    const mime = arr[0].match(/:(.*?);/)[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
  }

  // Final submit
  youthForm.addEventListener('submit', async function(e) {
    e.preventDefault();

    // Always save before confirmation
    saveStep3();

    // SweetAlert confirmation
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "Do you want to submit your KKProfile?",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "Yes",
      cancelButtonText: "Cancel"
    });

    if (!result.isConfirmed) return;

    // Collect all data from localStorage and this page
    const step1 = JSON.parse(localStorage.getItem('kkProfileStep1') || '{}');
    const step2 = JSON.parse(localStorage.getItem('kkProfileStep2') || '{}');
    const step3 = JSON.parse(localStorage.getItem('kkProfileStep3') || '{}');

    // Validate image presence
    if (
      youthForm.profileImage.files.length === 0 &&
      !step3.profileImage
    ) {
      await Swal.fire("Missing Image", "Please upload a profile image before submitting.", "warning");
      return;
    }

    const formData = new FormData();

    // Step 1
    Object.entries(step1).forEach(([k, v]) => formData.append(k, v));
    // Step 2
    Object.entries(step2).forEach(([k, v]) => formData.append(k, v));
    // Step 3 (excluding profileImage)
    Object.entries(step3).forEach(([k, v]) => {
      if (k !== 'profileImage') {
        formData.append(k, v);
      }
    });

    // ✅ Add actual image file if selected
    if (youthForm.profileImage.files.length > 0) {
      formData.append('profileImage', youthForm.profileImage.files[0]);
    } else if (step3.profileImage) {
      // ✅ Fallback: convert Base64 from localStorage into a File
      const file = base64ToFile(step3.profileImage, "profile.png");
      formData.append('profileImage', file);
    }

    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const response = await fetch('http://localhost:5000/api/kkprofiling', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` }, // don't set Content-Type manually
        body: formData
      });
      if (response.ok) {
        await Swal.fire("Submitted!", "Form submitted successfully!", "success");
        localStorage.removeItem('kkProfileStep1');
        localStorage.removeItem('kkProfileStep2');
        localStorage.removeItem('kkProfileStep3');
        window.location.href = '../../html/user/confirmation/html/kkcofirmation.html';
      } else if (response.status === 409) {
        Swal.fire("Already Submitted", "You already submitted a KKProfile for this cycle.", "error");
        return;
      } else {
        let error;
        try {
          error = await response.json();
        } catch {
          error = { message: await response.text() };
        }
        Swal.fire("Error", error.message || 'Something went wrong', "error");
      }
    } catch (error) {
      Swal.fire("Error", "Failed to submit form", "error");
    }
  });

  const hamburger = document.getElementById('navbarHamburger');
  const mobileMenu = document.getElementById('navbarMobileMenu');
  if (hamburger && mobileMenu) {
    hamburger.addEventListener('click', function(e) {
      e.stopPropagation();
      mobileMenu.classList.toggle('active');
    });
    document.addEventListener('click', function(e) {
      if (!hamburger.contains(e.target) && !mobileMenu.contains(e.target)) {
        mobileMenu.classList.remove('active');
      }
    });
  }

  function setupImageUpload(inputId, labelId, fileNameId, viewId, deleteId, previewId = "imagePreview") {
    const input = document.getElementById(inputId);
    const label = document.getElementById(labelId);
    const fileNameSpan = document.getElementById(fileNameId);
    const viewIcon = document.getElementById(viewId);
    const deleteIcon = document.getElementById(deleteId);
    const imagePreview = document.getElementById(previewId);

    function updateIcons() {
      const hasFile = input && input.files && input.files.length > 0;
      if (viewIcon) {
        viewIcon.classList.toggle('enabled', hasFile);
        viewIcon.style.pointerEvents = hasFile ? 'auto' : 'none';
        viewIcon.style.opacity = hasFile ? '1' : '0.5';
      }
      if (deleteIcon) {
        deleteIcon.classList.toggle('enabled', hasFile);
        deleteIcon.style.pointerEvents = hasFile ? 'auto' : 'none';
        deleteIcon.style.opacity = hasFile ? '1' : '0.5';
      }
    }

    if (input && label && fileNameSpan) {
      input.addEventListener('change', function() {
        if (input.files && input.files.length > 0) {
          label.style.display = 'none';
          fileNameSpan.textContent = input.files[0].name;
          fileNameSpan.style.display = 'inline-block';
        } else {
          label.style.display = 'inline-flex';
          fileNameSpan.textContent = '';
          fileNameSpan.style.display = 'none';
        }
        updateIcons();
      });
      updateIcons(); // Initial state
    }

    // View image
    if (viewIcon) {
      viewIcon.addEventListener('click', function() {
        if (input.files && input.files.length > 0) {
          const file = input.files[0];
          const url = URL.createObjectURL(file);
          imagePreview.innerHTML = `<img src="${url}" alt="Preview" style="width:100%;max-width:220px;border-radius:10px;">`;
          imagePreview.style.display = 'block';
          imagePreview.onclick = function() {
            imagePreview.innerHTML = '';
            imagePreview.style.display = '';
            URL.revokeObjectURL(url);
          };
        }
      });
    }

    // Delete image
    if (deleteIcon) {
      deleteIcon.addEventListener('click', function() {
        input.value = '';
        label.style.display = 'inline-flex';
        fileNameSpan.textContent = '';
        fileNameSpan.style.display = 'none';
        imagePreview.innerHTML = '';
        updateIcons();
      });
    }
  }

  setupImageUpload('profileImage', 'profileImageLabel', 'profileImageFileName', 'viewProfileImage', 'deleteProfileImage');
  setupImageUpload('idImage', 'idImageLabel', 'idImageFileName', 'viewIdImage', 'deleteIdImage');
  setupImageUpload('signatureImage', 'signatureImageLabel', 'signatureImageFileName', 'viewSignatureImage', 'deleteSignatureImage');
});
