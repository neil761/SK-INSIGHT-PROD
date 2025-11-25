function getAppIdFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get("id");
}

async function fetchLatestRejectedId(token) {
  try {
    const res = await fetch("http://localhost:5000/api/educational-assistance/check-rejected", {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json && json.applicationId ? String(json.applicationId) : null;
  } catch (e) {
    console.warn("check-rejected failed", e);
    return null;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  const token = sessionStorage.getItem("token");
  if (!token) {
    Swal.fire({ icon: "warning", title: "Not logged in", text: "Please login to resubmit." });
    return;
  }

  let appId = getAppIdFromUrl();
  if (!appId) {
    appId = await fetchLatestRejectedId(token);
  }
  if (!appId) {
    Swal.fire({ icon: "error", title: "No rejected application", text: "No rejected application found to resubmit." });
    return;
  }

  // Fetch application by id
  // Always fetch the current user's application (populates user.birthday/email etc.)
  // This route returns the latest application in the present cycle for the authenticated user
  let app;
  try {
    const res = await fetch(`http://localhost:5000/api/educational-assistance/me`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!res.ok) throw new Error("not found");
    app = await res.json();
    // If an id was provided in the URL, ensure it matches the fetched application
    if (getAppIdFromUrl() && String(getAppIdFromUrl()) !== String(app._id)) {
      // still allow -- but prefer fetched application
    }
    if (!app || app.status !== "rejected") throw new Error("not rejected");
  } catch (err) {
    Swal.fire({ icon: "error", title: "Application not found or not rejected" });
    return;
  }

  // Track removed files
  const removed = { front: false, back: false, coe: false, voter: false };

  // Keep track of temporary object URLs for newly selected files so view preview works
  const objectUrlMap = { front: null, back: null, coe: null, voter: null };
  
  // Utility to set input values using page input ids
  function setValue(id, val, readonly = false) {
    const el = document.getElementById(id);
    if (!el) return;
    if (el.tagName === "SELECT") {
      el.value = val ?? "";
    } else {
      el.value = val ?? "";
    }
    if (readonly) el.readOnly = true;
  }

  // Prefill basic fields (map backend keys -> frontend ids)
  setValue("surname", app.surname);
  setValue("firstName", app.firstname);
  setValue("middleName", app.middlename);
  setValue("suffix", app.suffix || "");
  // birthday/age might be stored on the populated user object — prefer that
  const birthdayVal = app.birthday ? app.birthday.split("T")[0] : (app.user?.birthday ? app.user.birthday.split("T")[0] : "");
  setValue("birthday", birthdayVal);
  setValue("placeOfBirth", app.placeOfBirth || "");
  const ageVal = (app.age !== undefined && app.age !== null) ? app.age : (app.user?.age ?? "");
  setValue("age", ageVal ?? "");
  setValue("gender", app.sex || "");
  setValue("civilstatus", app.civilStatus || "");
  setValue("religion", app.religion || "");
  setValue("email", app.email || "");
  setValue("contact", app.contactNumber || "");
  setValue("schoolname", app.school || "");
  setValue("schooladdress", app.schoolAddress || "");
  setValue("academicLevel", app.academicLevel || "");
  setValue("year", app.year || "");
  setValue("benefittype", app.typeOfBenefit || "");
  setValue("fathername", app.fatherName || "");
  setValue("fathercontact", app.fatherPhone || "");
  setValue("mothername", app.motherName || "");
  setValue("mothercontact", app.motherPhone || "");

  // Render siblings
  function renderSiblings(siblings = []) {
    const tbody = document.getElementById("siblingsTableBody");
    tbody.innerHTML = "";
    siblings.forEach(sib => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="text" class="sibling-name" value="${sib.name ?? ""}" required></td>
        <td><input type="number" class="sibling-age" value="${sib.age ?? ""}" min="0" required></td>
        <td>
          <select class="sibling-gender" required>
            <option value="">Select</option>
            <option value="Male" ${sib.gender === "Male" ? "selected" : ""}>Male</option>
            <option value="Female" ${sib.gender === "Female" ? "selected" : ""}>Female</option>
          </select>
        </td>
        <td><button type="button" class="removeSiblingBtn">Remove</button></td>
      `;
      tbody.appendChild(tr);
      tr.querySelector(".removeSiblingBtn").addEventListener("click", () => tr.remove());
    });
  }
  renderSiblings(app.siblings || []);

  // Render expenses
  function renderExpenses(expenses = []) {
    const tbody = document.getElementById("expensesTableBody");
    tbody.innerHTML = "";
    expenses.forEach(exp => {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><input type="text" class="expense-item" value="${exp.item ?? ""}" required></td>
        <td>
          <div class="expense-cost-wrapper">
            <span class="peso-prefix">₱</span>
            <input type="number" class="expense-cost" value="${exp.expectedCost ?? ""}" min="0" required>
            <span class="peso-suffix">.00</span>
          </div>
        </td>
        <td><button type="button" class="removeExpenseBtn">Remove</button></td>
      `;
      tbody.appendChild(tr);
      tr.querySelector(".removeExpenseBtn").addEventListener("click", () => tr.remove());
    });
  }
  renderExpenses(app.expenses || []);

  // File UI helpers: show file name + view/delete handlers
  function setFileUI(slot, url) {
    const label = document.getElementById(`${slot}Label`); // the plus label element
    const input = document.getElementById(`${slot}Image`) || document.getElementById(slot);
    const viewBtn = document.getElementById(`view${capitalize(slot)}`);
    const deleteBtn = document.getElementById(`delete${capitalize(slot)}`);
    const fileNameSpan = document.getElementById(`${slot}FileName`);
    const hiddenFieldId = `${slot}Url`;

    // ensure hidden URL field exists to keep server url if user doesn't upload new file
    let hidden = document.getElementById(hiddenFieldId);
    if (!hidden) {
      hidden = document.createElement('input');
      hidden.type = 'hidden';
      hidden.id = hiddenFieldId;
      hidden.name = hiddenFieldId;
      const form = document.getElementById('editEducForm');
      if (form) form.appendChild(hidden);
    }
    hidden.value = url || '';

    function showPlus() {
      if (label) {
        label.style.display = ''; // show the plus label
        label.innerHTML = '<i class="fa-solid fa-plus"></i>';
        label.classList.remove('has-file');
      }
      if (fileNameSpan) {
        fileNameSpan.textContent = '';
        fileNameSpan.style.display = 'none';
      }
    }

    function showFilename(name) {
      if (label) {
        // keep the plus element hidden when filename is shown
        label.style.display = 'none';
        label.classList.add('has-file');
      }
      if (fileNameSpan) {
        fileNameSpan.textContent = name;
        fileNameSpan.title = name;
        fileNameSpan.style.display = 'block';
      }
    }

    // cleanup any previous object URL for this slot
    function revokeObjectUrl() {
      const prev = objectUrlMap[slot];
      if (prev) {
        try { URL.revokeObjectURL(prev); } catch (e) { /* ignore */ }
        objectUrlMap[slot] = null;
      }
    }

    if (url) {
      const fname = getFileNameFromUrl(url);
      showFilename(fname);
      if (viewBtn) {
        viewBtn.style.display = 'inline-block';
        viewBtn.onclick = () => openPreview(url); // server URL preview
      }
      if (deleteBtn) {
        deleteBtn.style.display = 'inline-block';
        deleteBtn.onclick = () => {
          // mark removed and clear server-side url; restore plus
          removed[slot] = true;
          revokeObjectUrl();
          hidden.value = '';
          if (input) input.value = '';
          showPlus();
          if (viewBtn) viewBtn.style.display = 'none';
          if (deleteBtn) deleteBtn.style.display = 'none';
        };
      }
    } else {
      showPlus();
      if (viewBtn) viewBtn.style.display = 'none';
      if (deleteBtn) deleteBtn.style.display = 'none';
    }

    // When user picks a new file, show filename and allow delete and keep view icon to preview local file
    if (input) {
      input.addEventListener('change', () => {
        const f = input.files?.[0];
        // revoke previous object URL if any
        revokeObjectUrl();
        if (f) {
          const objUrl = URL.createObjectURL(f);
          objectUrlMap[slot] = objUrl;
          showFilename(f.name);
          removed[slot] = false;
          hidden.value = ''; // clear server url because user selected a new file
          if (deleteBtn) deleteBtn.style.display = 'inline-block';
          if (viewBtn) {
            viewBtn.style.display = 'inline-block';
            viewBtn.onclick = () => openPreview(objUrl);
          }
        } else {
          showPlus();
          if (viewBtn) viewBtn.style.display = 'none';
        }
      });
    }
  }

  function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
  function getFileNameFromUrl(u) {
    try {
      const parts = u.split("/").pop().split("?")[0];
      return decodeURIComponent(parts);
    } catch { return "file"; }
  }

  function openPreview(url) {
    const modal = document.getElementById("imagePreviewModal");
    const img = document.getElementById("previewImg");
    if (img && modal) {
      img.src = url;
      modal.style.display = "flex";
    }
  }

  // Hook modal close
  document.getElementById("closePreviewBtn")?.addEventListener("click", () => {
    const modal = document.getElementById("imagePreviewModal");
    if (modal) modal.style.display = "none";
  });

  setFileUI("front", app.frontImage || null);
  setFileUI("back", app.backImage || null);
  setFileUI("coe", app.coeImage || null);
  setFileUI("voter", app.voter || null);

  // --- Year select options logic (mirror original form behavior) ---
  function updateYearOptions(selectedLevel, selectedYear) {
    const yearEl = document.getElementById("year");
    if (!yearEl) return;
    let options = [];
    const lvl = (selectedLevel || "").toString().toLowerCase();
    if (lvl.includes("senior")) {
      options = ["Grade 11", "Grade 12"];
    } else if (lvl.includes("junior") || lvl.includes("high") && lvl.includes("junior")) {
      options = ["Grade 7", "Grade 8", "Grade 9", "Grade 10"];
    } else if (lvl.includes("college") || lvl.includes("college")) {
      options = ["1st year", "2nd year", "3rd year", "4th year", "5th year", "6th year"];
    } else {
      // fallback: keep common set and ensure selectedYear is present
      options = ["Grade 11", "Grade 12", "1st year", "2nd year", "3rd year", "4th year"];
    }
    // ensure selectedYear is included
    if (selectedYear && !options.includes(selectedYear)) options.unshift(selectedYear);
    yearEl.innerHTML = options.map(o => `<option value="${o}">${o}</option>`).join("");
    if (selectedYear) yearEl.value = selectedYear;
  }

  // attach handler to academicLevel so changing it updates year options
  const academicEl = document.getElementById("academicLevel");
  if (academicEl) {
    academicEl.addEventListener("change", () => updateYearOptions(academicEl.value, document.getElementById("year")?.value));
    // call once to populate correct year list and select current value
    updateYearOptions(academicEl.value || app.academicLevel, app.year);
  }

  // Add sibling/expense adders (same as original)
  document.getElementById('addSiblingBtn')?.addEventListener('click', function () {
    const tbody = document.getElementById('siblingsTableBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
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
    tbody.appendChild(tr);
    tr.querySelector(".removeSiblingBtn").addEventListener("click", () => tr.remove());
  });

  document.getElementById('addExpenseBtn')?.addEventListener('click', function () {
    const tbody = document.getElementById('expensesTableBody');
    const tr = document.createElement('tr');
    tr.innerHTML = `
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
    tbody.appendChild(tr);
    tr.querySelector(".removeExpenseBtn").addEventListener("click", () => tr.remove());
  });

  // On submit: build FormData mapping front-end ids -> backend keys
  document.getElementById("editEducForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const fd = new FormData();

    // Map inputs (frontend ids -> backend keys)
    const map = {
      surname: "surname",
      firstName: "firstname",
      middleName: "middlename",
      suffix: "suffix",
      birthday: "birthday",
      placeOfBirth: "placeOfBirth",
      age: "age",
      gender: "sex",
      civilstatus: "civilStatus",
      religion: "religion",
      email: "email",
      contact: "contactNumber",
      schoolname: "school",
      schooladdress: "schoolAddress",
      academicLevel: "academicLevel",
      year: "year",
      benefittype: "typeOfBenefit",
      fathername: "fatherName",
      fathercontact: "fatherPhone",
      mothername: "motherName",
      mothercontact: "motherPhone"
    };

    Object.keys(map).forEach(fid => {
      const el = document.getElementById(fid);
      if (!el) return;
      let val = el.value;
      // normalize empty strings to undefined (so backend doesn't treat as change)
      if (val === "") val = undefined;
      if (val !== undefined) fd.append(map[fid], val);
    });

    // Files: append only if user supplied a new file
    const frontFile = document.getElementById("frontImage")?.files?.[0];
    const backFile = document.getElementById("backImage")?.files?.[0];
    const coeFile = document.getElementById("coeImage")?.files?.[0];
    const voterFile = document.getElementById("voter")?.files?.[0];
    if (frontFile) fd.append("frontImage", frontFile);
    if (backFile) fd.append("backImage", backFile);
    if (coeFile) fd.append("coeImage", coeFile);
    if (voterFile) fd.append("voter", voterFile);

    // siblings
    const siblings = [];
    document.querySelectorAll("#siblingsTableBody tr").forEach(row => {
      const name = row.querySelector(".sibling-name")?.value || "";
      const age = row.querySelector(".sibling-age")?.value || "";
      const gender = row.querySelector(".sibling-gender")?.value || "";
      if (name || age || gender) siblings.push({ name, age: age ? Number(age) : undefined, gender });
    });
    fd.append("siblings", JSON.stringify(siblings));

    // expenses
    const expenses = [];
    document.querySelectorAll("#expensesTableBody tr").forEach(row => {
      const item = row.querySelector(".expense-item")?.value || "";
      const expectedCost = row.querySelector(".expense-cost")?.value || "";
      if (item || expectedCost) expenses.push({ item, expectedCost: expectedCost ? Number(expectedCost) : undefined });
    });
    fd.append("expenses", JSON.stringify(expenses));

    // removed files indicator
    fd.append("_removed", JSON.stringify({
      front: removed.front,
      back: removed.back,
      coe: removed.coe,
      voter: removed.voter
    }));

    Swal.fire({ title: "Submitting...", allowOutsideClick: false, didOpen: () => Swal.showLoading() });
    try {
      const res = await fetch(`http://localhost:5000/api/educational-assistance/me/resubmit/${appId}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }, // don't set Content-Type for FormData
        body: fd
      });
      const json = await res.json().catch(() => ({}));
      Swal.close();
      if (res.ok) {
        Swal.fire({ icon: "success", title: "Resubmitted", text: "Your application is now pending." }).then(() => {
          try {
            // remove any temporary drafts that may conflict with the confirmation view
            sessionStorage.removeItem('educationalAssistanceFormData');
            sessionStorage.removeItem('educDraft');
            sessionStorage.removeItem('educationalDraft');
          } catch (e) { /* ignore */ }
          // Redirect to the confirmation page
          window.location.href = "/Frontend/html/user/confirmation/html/educConfirmation.html";
        });
      } else {
        Swal.fire({ icon: "error", title: "Failed", text: json.error || "Resubmission failed." });
      }
    } catch (err) {
      Swal.close();
      Swal.fire({ icon: "error", title: "Error", text: "Network or server error." });
    }
  });
});