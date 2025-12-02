// kkprofile.js
const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
  ? window.API_BASE
  : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:5000'
    : 'https://sk-insight.online';

(function() {
  if (!sessionStorage.getItem("token")) {
    const channel = new BroadcastChannel("skinsight-auth");
    channel.onmessage = (ev) => {
      if (ev.data && ev.data.token) {
        sessionStorage.setItem("token", ev.data.token);
        channel.close();
        location.reload();
      }
    };
    setTimeout(() => channel.close(), 3000);
  }
})();
  // 🔹 Redirect to login if no token or token expired
  (function() {
    const token = sessionStorage.getItem("token"); // Only sessionStorage!
    function sessionExpired() {
      Swal.fire({
        icon: 'warning',
        title: 'Session Expired',
        text: 'Please login again.',
        confirmButtonColor: '#0A2C59',
        allowOutsideClick: false,
        allowEscapeKey: false,
      }).then(() => {
        window.location.href = "./admin-log.html";
      });
    }
    if (!token) {
      sessionExpired();
      return;
    }
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.exp && Date.now() >= payload.exp * 1000) {
        sessionStorage.removeItem("token");
        sessionExpired();
      }
    } catch (e) {
      sessionStorage.removeItem("token");
      sessionExpired();
    }
  })();

  let allProfiles = [];

  document.addEventListener("DOMContentLoaded", () => {

    const tableBody = document.querySelector(".tables tbody");
    const yearDropdown = document.getElementById("yearDropdown");
    const yearButton = yearDropdown.querySelector(".dropdown-button");
    const yearContent = yearDropdown.querySelector(".dropdown-content");
    const cycleDropdown = document.getElementById("cycleDropdown");
    const cycleButton = cycleDropdown.querySelector(".dropdown-button");
    const cycleContent = cycleDropdown.querySelector(".dropdown-content");
    const filterBtn = document.getElementById("filterBtn");
    const searchInput = document.getElementById("searchInput");
    const classificationDropdown = document.getElementById("classificationDropdown");
    const classificationButton = classificationDropdown.querySelector(".dropdown-button");
    const classificationContent = classificationDropdown.querySelector(".dropdown-content");

    let yearMap = {};
    let sortedYears = [];
    let currentFilters = {};

    // Fetch cycles and populate year dropdown
    async function fetchCycles() {
      try {
        const res = await fetch(`${API_BASE}/api/formcycle/kk`, {
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        });
        if (!res.ok) throw new Error("Failed to fetch cycles");
        const cycles = await res.json();

        // Group cycles by year
        yearMap = {};
        cycles.forEach((c) => {
          if (!yearMap[c.year]) yearMap[c.year] = [];
          yearMap[c.year].push(c.cycleNumber);
        });

        sortedYears = Object.keys(yearMap).sort((a, b) => b - a);

        // Populate year dropdown
        yearContent.innerHTML = "";
        sortedYears.forEach(year => {
          const yearOption = document.createElement("a");
          yearOption.href = "#";
          yearOption.className = "dropdown-option";
          yearOption.textContent = year;
          yearOption.addEventListener("click", (e) => {
            e.preventDefault();
            yearButton.textContent = year;
            currentFilters.year = year;

            // Reset cycle/classification
            cycleButton.textContent = "Cycle";
            currentFilters.cycle = undefined;
            cycleButton.disabled = false;
            classificationButton.textContent = "Classification";
            classificationButton.disabled = true;

            // Populate cycle dropdown for selected year
            populateCycleDropdown(yearMap[year]);
            yearContent.style.display = "none";
          });
          yearContent.appendChild(yearOption);
        });

        // Reset buttons on load
        yearButton.textContent = "Year";
        cycleButton.textContent = "Cycle";
        cycleButton.disabled = true;
        classificationButton.textContent = "Classification";
        classificationButton.disabled = true;
      } catch (err) {
        console.error("Error fetching cycles:", err);
      }
    }

    // Populate cycle dropdown for selected year
    function populateCycleDropdown(cycles) {
      cycleContent.innerHTML = "";
      cycles.forEach(cycle => {
        const cycleOption = document.createElement("a");
        cycleOption.href = "#";
        cycleOption.className = "dropdown-option";
        cycleOption.textContent = `Cycle ${cycle}`;
        cycleOption.addEventListener("click", (e) => {
          e.preventDefault();
          cycleButton.textContent = `Cycle ${cycle}`;
          currentFilters.cycle = cycle;

          // Enable classification dropdown
          classificationButton.disabled = false;
          cycleContent.style.display = "none";
        });
        cycleContent.appendChild(cycleOption);
      });
    }

    // Dropdown open/close logic
    yearButton.addEventListener("click", (e) => {
      e.stopPropagation();
      yearContent.style.display = yearContent.style.display === "block" ? "none" : "block";
      cycleContent.style.display = "none";
      classificationContent.style.display = "none";
    });
    cycleButton.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!cycleButton.disabled) {
        cycleContent.style.display = cycleContent.style.display === "block" ? "none" : "block";
        yearContent.style.display = "none";
        classificationContent.style.display = "none";
      }
    });
    classificationButton.addEventListener("click", (e) => {
      e.stopPropagation();
      if (!classificationButton.disabled) {
        classificationContent.style.display = classificationContent.style.display === "block" ? "none" : "block";
        yearContent.style.display = "none";
        cycleContent.style.display = "none";
      }
    });
    window.addEventListener("click", () => {
      yearContent.style.display = "none";
      cycleContent.style.display = "none";
      classificationContent.style.display = "none";
    });

    // 🔹 Fetch profiles with filters
    async function fetchProfiles(params = {}) {
      try {
        // Build query string properly
        const query = new URLSearchParams(params).toString();
        const url = query
          ? `${API_BASE}/api/kkprofiling?${query}`
          : `${API_BASE}/api/kkprofiling`;


        const res = await fetch(url, {
          headers: {
            Authorization: `Bearer ${sessionStorage.getItem("token")}`, // use sessionStorage only
          },
        });

        if (!res.ok) throw new Error(`Error ${res.status}`);
        const data = await res.json();
        // Filter out deleted profiles and sort newest -> oldest
        const visibleProfiles = (Array.isArray(data) ? data : [])
          .filter(p => !p.isDeleted)
          .sort((a, b) => {
            const ta = getProfileTimestamp(a);
            const tb = getProfileTimestamp(b);
            return tb - ta; // newest first
          });
        allProfiles = visibleProfiles;
        renderProfiles(visibleProfiles); // render table
      } catch (err) {
        console.error("❌ Error fetching profiles:", err);
      }
    }
    // Helper: determine most reliable timestamp for a profile
    function getProfileTimestamp(p) {
      // prefer explicit submittedAt or createdAt, fall back to ObjectId timestamp
      const t = p?.submittedAt || p?.createdAt || p?.user?.submittedAt || null;
      if (t) {
        const d = new Date(t);
        if (!isNaN(d)) return d.getTime();
      }
      // fallback: derive timestamp from Mongo ObjectId
      try {
        if (p && p._id && typeof p._id === "string" && p._id.length >= 8) {
          return parseInt(p._id.substring(0, 8), 16) * 1000;
        }
      } catch (e) {}
      return 0;
    }

    function capitalize(str) {
      if (!str) return "";
      return str.charAt(0).toUpperCase() + str.slice(1);
    }

    const PROFILES_PER_PAGE = 30;
    let currentPage = 1;

    // Replace your renderProfiles function with this paginated version:
    function renderProfiles(profiles) {
      const totalPages = Math.ceil(profiles.length / PROFILES_PER_PAGE);
      const startIdx = (currentPage - 1) * PROFILES_PER_PAGE;
      const endIdx = startIdx + PROFILES_PER_PAGE;
      const pageProfiles = profiles.slice(startIdx, endIdx);

      tableBody.innerHTML = "";
      if (!pageProfiles.length) {
        tableBody.innerHTML = `<tr><td colspan="8">No profiles found</td></tr>`;
        renderPagination(profiles.length, totalPages);
        return;
      }

      pageProfiles.forEach((p, i) => {
        const lastname = p.lastname ? capitalize(p.lastname.trim()) : "";
        const firstname = p.firstname ? capitalize(p.firstname.trim()) : "";
        const middlename = p.middlename && p.middlename.trim() !== ""
          ? p.middlename.trim()[0].toUpperCase() + "."
          : "";
        const suffix = p.suffix && p.suffix.toLowerCase() !== "n/a" ? p.suffix : "";
        const fullName = (lastname || firstname)
          ? `${lastname}, ${firstname} ${middlename} ${suffix}`.replace(/\s+/g, " ").trim()
          : "N/A";

        const gender = p.gender || "-";
        const ageVal = getAgeFromProfile(p);
        const ageDisplay = (ageVal === null || ageVal === undefined) ? "N/A" : String(ageVal);
        const purok = p.purok ? `Purok ${p.purok}` : "-";
        const civilStatus = p.civilStatus || "-";
        const workStatus = p.workStatus || "-";

        const row = document.createElement("tr");
        row.className = p.isRead ? 'row-read' : 'row-unread';
        row.setAttribute('data-id', p._id);
        row.innerHTML = `
          <td>${startIdx + i + 1}</td>
          <td>${fullName}</td>
          <td>${gender}</td>
          <td>${ageDisplay}</td>
          <td>${purok}</td>
          <td>${civilStatus}</td>
          <td>${workStatus}</td>
          <td>
            <button class="view-btn" data-id="${p._id}">
              <i class="fa-solid fa-eye"></i>
            </button>
          </td>
        `;
        tableBody.appendChild(row);
      });

      renderPagination(profiles.length, totalPages);

      // Attach modal openers
      document.querySelectorAll(".view-btn").forEach((btn) =>
        btn.addEventListener("click", async () => {
          const res = await fetch(
            `${API_BASE}/api/kkprofiling/${btn.dataset.id}`,
            {
              headers: {
                Authorization: `Bearer ${sessionStorage.getItem("token")}`,
              },
            }
          );
          const profile = await res.json();
          showProfileModal(profile);
        })
      );

      document.querySelectorAll(".delete-btn").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.dataset.id;
          const result = await Swal.fire({
            title: "Are you sure?",
            text: "Do you really want to delete this form?",
            icon: "warning",
            showCancelButton: true,
            confirmButtonColor: "#0A2C59",
            cancelButtonColor: "#d33",
            confirmButtonText: "Yes",
            cancelButtonText: "No"
          });
          if (result.isConfirmed) {
            const res = await fetch(`${API_BASE}/api/kkprofiling/${id}`, {
              method: "DELETE",
              headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
            });
            if (res.ok) {
              Swal.fire("Deleted!", "Profile moved to recycle bin.", "success");
              fetchProfiles(); // Refresh table
            }
          }
        });
      });
    }

    // Add this function for pagination controls:
    function renderPagination(totalProfiles, totalPages) {
      const pagination = document.getElementById("pagination");
      pagination.innerHTML = "";

      if (totalPages <= 1) return;

      // Previous button
      const prevBtn = document.createElement("button");
      prevBtn.className = "pagination-btn";
      prevBtn.textContent = "Prev";
      prevBtn.disabled = currentPage === 1;
      prevBtn.onclick = () => {
        if (currentPage > 1) {
          currentPage--;
          renderProfiles(allProfiles);
        }
      };
      pagination.appendChild(prevBtn);

      // Page numbers (show max 5 pages at a time)
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, startPage + 4);
      if (endPage - startPage < 4) startPage = Math.max(1, endPage - 4);

      for (let i = startPage; i <= endPage; i++) {
        const pageBtn = document.createElement("button");
        pageBtn.className = "pagination-btn" + (i === currentPage ? " active" : "");
        pageBtn.textContent = i;
        pageBtn.onclick = () => {
          currentPage = i;
          renderProfiles(allProfiles);
        };
        pagination.appendChild(pageBtn);
      }

      // Next button
      const nextBtn = document.createElement("button");
      nextBtn.className = "pagination-btn";
      nextBtn.textContent = "Next";
      nextBtn.disabled = currentPage === totalPages;
      nextBtn.onclick = () => {
        if (currentPage < totalPages) {
          currentPage++;
          renderProfiles(allProfiles);
        }
      };
      pagination.appendChild(nextBtn);
    }

    let currentProfileId = null; // Track the current profile ID

    // Modify showProfileModal to set currentProfileId and update download button
  function showProfileModal(p) {
    currentProfileId = p._id;

    const modal = document.getElementById("profileModal");
    const header = document.getElementById("profileHeader");
    const details = document.getElementById("profileDetails");

    const mi = p.middlename ? p.middlename[0].toUpperCase() + "." : "";
    const suffix = p.suffix && p.suffix.toLowerCase() !== "n/a" ? p.suffix : "";
    const fullName = `${p.lastname}, ${p.firstname} ${mi} ${suffix}`.trim();

    // Use profileImage from API, fallback to default if missing
    const profileImgUrl = p.profileImage && p.profileImage.startsWith("http")
      ? p.profileImage
      : "/Frontend/assets/default-profile.png";

    // Use signatureImagePath from API, fallback to default if missing
    const signatureImgUrl = p.signatureImagePath && p.signatureImagePath.startsWith("http")
      ? p.signatureImagePath
      : "/Frontend/assets/default-signature.png";

    header.innerHTML = `
      <img src="${profileImgUrl}" alt="Profile Image" />
      <div class="profile-name">${fullName}</div>
    `;

    const modalAge = getAgeFromProfile(p);
    // ✅ Fill in modal details (use modalAge)
    details.innerHTML = `
      <div class="profile-details-modal">
        <div class="profile-details-row full">
          <div class="profile-detail">
            <span class="label">Address</span>
            <span class="value">
              ${p.purok ? `Purok ${p.purok}` : ""}${p.barangay ? `, ${p.barangay}` : ""}${p.municipality ? `, ${p.municipality}` : ""}
            </span>
          </div>
        </div>
        <div class="profile-details-row">
          <div class="profile-detail">
            <span class="label">Age</span>
            <span class="value">${modalAge !== null && modalAge !== undefined ? modalAge : "N/A"}</span>
          </div>
          <div class="profile-detail">
            <span class="label">Gender</span>
            <span class="value">${p.gender}</span>
          </div>
          <div class="profile-detail">
            <span class="label">Birthday</span>
            <span class="value">${p.user?.birthday ? new Date(p.user.birthday).toLocaleDateString() : "-"}</span>
          </div>
        </div>
        <div class="profile-details-row">
          <div class="profile-detail">
            <span class="label">Email</span>
            <span class="value">${p.email || "-"}</span>
          </div>
          <div class="profile-detail">
            <span class="label">Contact</span>
            <span class="value">${p.contactNumber || "-"}</span>
          </div>
        </div>
        <div class="profile-details-row">
          <div class="profile-detail">
            <span class="label">Civil Status</span>
            <span class="value">${p.civilStatus || "-"}</span>
          </div>
          <div class="profile-detail">
            <span class="label">Youth Age Group</span>
            <span class="value">${p.youthAgeGroup || "-"}</span>
          </div>
          <div class="profile-detail">
            <span class="label" style="font-size: 14px">Youth Classification</span>
            <span class="value" style="font-size: 14px">${p.youthClassification || "-"}</span>
          </div>
          ${p.youthClassification === "Youth with Specific Needs" ? `
            <div class="profile-detail">
              <span class="label" style="font-size: 14px">Specific Needs Type</span>
              <span class="value" style="font-size: 14px">${p.specificNeedType || "-"}</span>
            </div>
          ` : ""}
        </div>
        <div class="profile-details-row">
          <div class="profile-detail">
            <span class="label">Education</span>
            <span class="value" style="font-size: 15px">${p.educationalBackground || "-"}</span>
          </div>
          <div class="profile-detail">
            <span class="label">Work Status</span>
            <span class="value">${p.workStatus || "-"}</span>
          </div>
          <div class="profile-detail">
            <span class="label">SK Voter</span>
            <span class="value">${p.registeredSKVoter ? "Yes" : "No"}</span>
          </div>
          <div class="profile-detail">
            <span class="label">National Voter</span>
            <span class="value">${p.registeredNationalVoter ? "Yes" : "No"}</span>
          </div>
        </div>
        <div class="profile-details-row">
          <div class="profile-detail">
            <span class="label">Attended KK Assembly</span>
            <span class="value">${p.attendedKKAssembly ? "Yes" : "No"}</span>
          </div>
          ${
            p.attendedKKAssembly
              ? `<div class="profile-detail">
                  <span class="label">Times Attended</span>
                  <span class="value">${p.attendanceCount || "-"}</span>
                </div>`
              : `<div class="profile-detail">
                  <span class="label">Reason for Not Attending</span>
                  <span class="value">${p.reasonDidNotAttend || "-"}</span>
                </div>`
          }
        </div>
        <div class="profile-details-rows">
          <div class="profile-details">
            <span class="label">Signature</span>
            <img id="signatureImageModal" src="${signatureImgUrl}" alt="Signature" style="max-width: 50%; max-height: 50%; cursor: pointer; border-radius: 8px; transition: transform 0.2s;" />
          </div>
        </div>
        <div class="profile-details-row">
          <button id="deleteProfileBtn" class="modal-delete-btn" data-id="${p._id}">Delete Profile</button>
        </div>
      </div>
    `;

    // Add click handler for signature image to open lightbox
    const signatureImg = document.getElementById('signatureImageModal');
    if (signatureImg) {
      signatureImg.addEventListener('click', () => {
        openImageLightbox(signatureImgUrl);
      });
      // Add hover effect
      signatureImg.addEventListener('mouseenter', function() {
        this.style.transform = 'scale(1.05)';
        this.style.boxShadow = '0 4px 12px rgba(0,0,0,0.2)';
      });
      signatureImg.addEventListener('mouseleave', function() {
        this.style.transform = 'scale(1)';
        this.style.boxShadow = 'none';
      });
    }

    // Set modal data attribute and download button data-id so download uses the modal owner
    modal.dataset.currentProfile = p._id;
    window.currentProfileId = p._id;
    const downloadBtnEl = document.getElementById("downloadBtn");
    if (downloadBtnEl) downloadBtnEl.dataset.id = p._id;

    // Use p._id directly for modal delete
    const deleteBtn = document.getElementById("deleteProfileBtn");
    deleteBtn.addEventListener("click", async () => {
      const result = await Swal.fire({
        title: "Are you sure?",
        text: "Do you really want to delete this profile?",
        icon: "warning",
        showCancelButton: true,
        confirmButtonColor: "#0A2C59",
        cancelButtonColor: "#d33",
        confirmButtonText: "Yes",
        cancelButtonText: "No",
      });
      if (result.isConfirmed) {
        const res = await fetch(`${API_BASE}/api/kkprofiling/${currentProfileId}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` },
        });
        if (res.ok) {
          Swal.fire("Deleted!", "Profile moved to recycle bin.", "success");
          fetchProfiles(); // Refresh table
          modal.style.display = "none"; // Close modal
        } else {
          Swal.fire("Error", "Failed to delete profile.", "error");
        }
      }
    });

    modal.style.display = "flex";
    document.body.classList.add("modal-open");
    document.querySelector(".close-btn").onclick = () => {
      modal.style.display = "none";
      document.body.classList.remove("modal-open");
    };

    // After modal is opened and profile is fetched:
    const row = document.querySelector(`tr[data-id="${p._id}"]`);
    if (row) {
      row.classList.remove("row-unread");
      row.classList.add("row-read");
    }
  }


    // ------------------ improved download logic (replace previous block) ------------------
(function setupDownloadHandler(){
  async function downloadProfileDocx(profileId) {
    if (!profileId) return Swal.fire('Error','No profile selected to download.','error');
    const token = sessionStorage.getItem('token') || '';
    if (!token) return Swal.fire('Not authenticated','Please sign in to download.','warning');

    Swal.fire({
      title: 'Preparing download...',
      didOpen: () => Swal.showLoading(),
      allowOutsideClick: false
    });

    try {
      const res = await fetch(`${API_BASE}/api/kkprofiling/export/${profileId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Accept': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document, application/json'
        }
      });

      const contentType = res.headers.get('content-type') || '';

      if (!res.ok) {
        if (contentType.includes('application/json')) {
          const err = await res.json().catch(()=>({ message: `Status ${res.status}` }));
          Swal.close();
          console.error('Export error response:', err);
          return Swal.fire('Export Failed', err.message || err.error || `Status ${res.status}`, 'error');
        } else {
          const text = await res.text().catch(()=>`Status ${res.status}`);
          Swal.close();
          console.error('Export failed:', text);
          return Swal.fire('Export Failed', `Status ${res.status}: ${text}`, 'error');
        }
      }

      if (contentType.includes('application/json')) {
        const payload = await res.json().catch(()=>null);
        Swal.close();
        console.error('Unexpected JSON response for file download:', payload);
        return Swal.fire('Export Failed', (payload && (payload.message||payload.error)) || 'Server returned JSON instead of file', 'error');
      }

      const blob = await res.blob();
      let filename = `KKProfile.docx`;
      const disposition = res.headers.get('Content-Disposition') || '';
      if (disposition && disposition.indexOf('filename=') !== -1) {
        filename = disposition.split('filename=')[1].trim().replace(/["']/g,'');
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(()=> window.URL.revokeObjectURL(url), 2000);

      Swal.close();
    } catch (err) {
      Swal.close();
      console.error('Download exception:', err);
      Swal.fire('Error', 'Could not download file. Check console for details.', 'error');
    }
  }

  // Delegate click so button created/removed in modal still works
  document.addEventListener('click', (ev) => {
    const btn = ev.target.closest('#downloadBtn, .modern-modal-download');
    if (!btn) return;

    // Priority for determining which profile to download:
    // 1) If a modal is open and has data-current-profile -> use that
    // 2) Else use window.currentProfileId if set
    // 3) Else use data-id on the clicked button
    let profileId = null;
    const modal = document.getElementById('profileModal');
    if (modal && modal.style.display && modal.style.display !== 'none') {
      profileId = modal.dataset.currentProfile || null;
    }
    if (!profileId && window.currentProfileId) profileId = window.currentProfileId;
    if (!profileId) profileId = btn.dataset.id || btn.getAttribute('data-id') || null;

    downloadProfileDocx(profileId);
  });
})();
  
    // 🔹 Cycle filter (year + cycle)
    filterBtn.addEventListener("click", () => {
      // Require year and cycle for any filter
      if (!currentFilters.year || !currentFilters.cycle) {
        Swal.fire({
          icon: 'warning',
          title: 'Missing selection',
          text: 'Please select both year and cycle before filtering.',
          confirmButtonColor: '#0A2C59',
        });
        return;
      }
      fetchProfiles(currentFilters);
    });

    // 🔹 Search filter
    searchInput.addEventListener("keyup", () => {
      const searchTerm = searchInput.value.trim().toLowerCase();

      const filteredProfiles = allProfiles.filter(p => {
        return (
          (p.firstname && p.firstname.toLowerCase().includes(searchTerm)) ||
          (p.middlename && p.middlename.toLowerCase().includes(searchTerm)) ||
          (p.lastname && p.lastname.toLowerCase().includes(searchTerm)) ||
          (p.barangay && p.barangay.toLowerCase().includes(searchTerm)) ||
          (p.purok && p.purok.toLowerCase().includes(searchTerm))
        );
      });

      renderProfiles(filteredProfiles);
    });

    // Helper to format date/time (used only for profile modal birthday)
    function formatDateTime(dt) {
      if (!dt) return "";
      const date = new Date(dt);

      const year = date.getFullYear();
      const month = date.toLocaleString('en-US', { month: 'long' });
      const day = date.getDate();

      let hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, "0");

      const ampm = hours >= 12 ? "PM" : "AM";
      hours = hours % 12 || 12;

      return `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`;
    }

    // 🔹 Available filter options
    const filterOptions = {
      "Work Status": ["Employed", "Unemployed", "Self-Employed", "Currently looking for a Job", "Not interested in looking for a Job"],
      "Youth Age Group": ["Child Youth", "Core Youth", "Young Youth"],
      "Educational Background": ["Elementary Undergraduate", "Elementary Graduate", "High School Undergraduate", "High School Graduate", "Vocational Graduate", "College Undergraduate", "College Graduate", "Masters Graduate", "Doctorate Level", "Doctorate Graduate"],
      "Civil Status": ["Single", "Live-in", "Married", "Unknown", "Separated", "Annulled", "Divorced", "Widowed"],
      "Youth Classification": ["In School Youth","Out of School Youth","Working Youth","Youth with Specific Needs"],
      "Purok": ["1","2","3","4","5","6","7","8","9","10"],
      "Registered SK Voter": ["true", "false"],
      "Registered National Voter": ["true", "false"],
      "Voted Last SK Election": ["true", "false"],
    };

    // Classification logic (keep your existing submenu logic)
    // Only allow one classification filter at a time
    Object.keys(filterOptions).forEach((cat) => {
      filterOptions[cat].forEach((opt) => {
        setTimeout(() => {
          const links = Array.from(classificationDropdown.querySelectorAll(".submenu-content a"));
          links.forEach(link => {
            if (link.textContent === opt) {
              link.addEventListener("click", () => {
                // Clear all classification filters before setting a new one
                delete currentFilters.workStatus;
                delete currentFilters.youthAgeGroup;
                delete currentFilters.educationalBackground;
                delete currentFilters.civilStatus;
                delete currentFilters.youthClassification;
                delete currentFilters.purok;
                delete currentFilters.registeredSKVoter;
                delete currentFilters.registeredNationalVoter;
                delete currentFilters.votedLastSKElection;

                // Set only the selected classification filter
                if (cat === "Work Status") currentFilters.workStatus = opt;
                if (cat === "Youth Age Group") currentFilters.youthAgeGroup = opt;
                if (cat === "Educational Background") currentFilters.educationalBackground = opt;
                if (cat === "Civil Status") currentFilters.civilStatus = opt;
                if (cat === "Youth Classification") currentFilters.youthClassification = opt;
                if (cat === "Purok") currentFilters.purok = opt;
                if (cat === "Registered SK Voter") currentFilters.registeredSKVoter = opt;
                if (cat === "Registered National Voter") currentFilters.registeredNationalVoter = opt;
                if (cat === "Voted Last SK Election") currentFilters.votedLastSKElection = opt;

                // Change button text to selected classification
                classificationButton.textContent = opt;

                classificationContent.style.display = "none";
              });
            }
          });
        }, 500);
      });
    });

    // Build classification dropdown (submenu structure)
    classificationContent.innerHTML = ""; // Clear first
    Object.keys(filterOptions).forEach((cat) => {
      // Parent container
      const parent = document.createElement("div");
      parent.classList.add("submenu");

      // Top-level item (category)
      const catItem = document.createElement("a");
      catItem.textContent = cat;
      catItem.href = "#";
      parent.appendChild(catItem);

      // Submenu container
      const subMenu = document.createElement("div");
      subMenu.classList.add("submenu-content");

      // Build groups inside submenu
      filterOptions[cat].forEach((opt) => {
        const g = document.createElement("a");
        g.textContent = opt;
        g.href = "#";
        g.className = "dropdown-option";
        subMenu.appendChild(g);
      });

      parent.appendChild(subMenu);
      classificationContent.appendChild(parent);
    });

    // Only run filter when filter button is clicked
    filterBtn.addEventListener("click", () => {
      // Require year and cycle for any filter
      if (!currentFilters.year || !currentFilters.cycle) {
        Swal.fire({
          icon: 'warning',
          title: 'Missing selection',
          text: 'Please select both year and cycle before filtering.',
          confirmButtonColor: '#0A2C59',
        });
        return;
      }
      fetchProfiles(currentFilters);
    });

    // Clear filter resets everything
    document.getElementById("clearFilterBtn").addEventListener("click", () => {
      yearButton.textContent = "Year";
      cycleButton.textContent = "Cycle";
      cycleButton.disabled = true;
      classificationButton.disabled = true;
      classificationButton.textContent = "Classification";
      yearContent.style.display = "none";
      cycleContent.style.display = "none";
      classificationContent.style.display = "none";

      // Reset filters
      currentFilters = {};

      // Fetch all profiles (no filters)
      fetchProfiles({});
    });

    // 🔹 Initial load
    fetchCycles(); // load year + cycle dropdowns
    fetchProfiles(); // load profiles

    // Disable year and cycle selects initially
    yearDropdown.disabled = true;
    cycleDropdown.disabled = true;



    yearDropdown.disabled = false; // Year is a lways enabled
    cycleDropdown.disabled = true;
    classificationDropdown.querySelector('.dropdown-button').disabled = true;

    // Enable cycle after year is selected
    yearDropdown.addEventListener("change", () => {
      if (yearDropdown.value) {
        cycleDropdown.disabled = false;
        cycleDropdown.value = "";
        classificationDropdown.querySelector('.dropdown-button').disabled = true;

        // Repopulate cycle options for selected year ONLY
        const selectedYear = yearDropdown.value;
        cycleDropdown.querySelector(".dropdown-content").innerHTML = `<option value="">Select Cycle</option>`;
        if (selectedYear && yearMap[selectedYear]) {
          yearMap[selectedYear].forEach((cy) => {
            const opt = document.createElement("option");
            opt.value = cy;
            opt.textContent = `Cycle ${cy}`;
            cycleDropdown.querySelector(".dropdown-content").appendChild(opt);
          });
        }
      } else {
        cycleDropdown.disabled = true;
        cycleDropdown.value = "";
        classificationDropdown.querySelector('.dropdown-button').disabled = true;
      }
    });

    // Enable classification after cycle is selected
    cycleDropdown.addEventListener("change", () => {
      if (cycleDropdown.value) {
        classificationDropdown.querySelector('.dropdown-button').disabled = false;
      } else {
        classificationDropdown.querySelector('.dropdown-button').disabled = true;
      }
    });

    // Notification Bell Logic
    const notifBell = document.getElementById('notifBell');
    const notifDropdown = document.getElementById('notifDropdown');
    const notifTabs = notifDropdown.querySelectorAll('.notif-tab');
    const notifListNew = document.getElementById('notifListNew');
    const notifListUnread = document.getElementById('notifListUnread');

    notifBell.addEventListener('click', () => {
      notifDropdown.style.display = notifDropdown.style.display === 'none' ? 'block' : 'none';
      fetchNotifications();
    });

    notifTabs.forEach(tab => {
      tab.addEventListener('click', function() {
        notifTabs.forEach(t => t.classList.remove('active'));
        this.classList.add('active');
        notifListNew.style.display = this.dataset.tab === 'new' ? 'block' : 'none';
        notifListUnread.style.display = this.dataset.tab === 'unread' ? 'block' : 'none';
      });
    });

    async function fetchNotifications() {
      const token = sessionStorage.getItem("token");
      // Fetch new profiles (within 24 hours)
      const newRes = await fetch(`${API_BASE}/api/notifications/kk/new`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const newNotifs = await newRes.json();

      // Fetch unread profiles (older than 24 hours, still unread)
      const unreadRes = await fetch(`${API_BASE}/api/notifications/kk/unread`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const unreadNotifs = await unreadRes.json();

      // Filter out already-read notifications from both lists
      const newNotifsFilt = Array.isArray(newNotifs) ? newNotifs.filter(n => !n.isRead) : [];
      const unreadNotifsFilt = Array.isArray(unreadNotifs) ? unreadNotifs.filter(n => !n.isRead) : [];

      renderNotifList(notifListNew, newNotifsFilt, false);
      renderNotifList(notifListUnread, unreadNotifsFilt, true);
    }

    function renderNotifList(container, notifs, isUnread) {
      container.innerHTML = '';
      if (!Array.isArray(notifs) || notifs.length === 0) {
        container.innerHTML = `<div class="notif-item">No notifications.</div>`;
        return;
      }
      notifs.forEach(n => {
        // Format name: Last, First M.
        const name = n.referenceId
          ? `${n.referenceId.lastname || ""}, ${n.referenceId.firstname || ""} ${n.referenceId.middlename ? n.referenceId.middlename[0].toUpperCase() + "." : ""}`.trim()
          : "Unknown";
        // Format date and time: [Month name] [date], [year] [hour]:[minute] AM/PM
        let dateStr = "";
        if (n.referenceId?.submittedAt) {
          const dateObj = new Date(n.referenceId.submittedAt);
          const options = { year: 'numeric', month: 'long', day: 'numeric' };
          const datePart = dateObj.toLocaleDateString(undefined, options);
          let hours = dateObj.getHours();
          const minutes = dateObj.getMinutes().toString().padStart(2, "0");
          const ampm = hours >= 12 ? "PM" : "AM";
          hours = hours % 12 || 12;
          const timePart = `${hours}:${minutes} ${ampm}`;
          dateStr = `${datePart} ${timePart}`;
        }
        // Status
        const status = n.referenceId && n.referenceId.isRead ? "Read" : "Unread";
        container.innerHTML += `
          <div class="notif-item" data-id="${n._id}">
            <div><b>${name}</b></div>
            <div class="notif-date">${dateStr}</div>
            <div class="notif-status">${status}</div>
          </div>
        `;
      });

      // Make notifications clickable (view profile and mark as read
    }

    // Hide dropdown when clicking outside
    document.addEventListener('click', function(e) {
      if (!notifDropdown.contains(e.target) && !notifBell.contains(e.target)) {
        notifDropdown.style.display = 'none';
      }
    });

    // Always show the unread notification badge on page load
    updateNotifBadge();
    const socket = io(API_BASE, { transports: ["websocket"] });


    // Move socket event handlers inside DOMContentLoaded
    socket.on("kk-profile:newSubmission", () => {
      updateNotifBadge();
      fetchNotifications(); // Now accessible
      fetchProfiles({});
    });

    socket.on("kk-profile:read", () => {
      updateNotifBadge();
      fetchNotifications(); // Now accessible
      fetchProfiles({});
    });

    socket.on("kk-profile:deleted", () => {
      updateNotifBadge();
      fetchNotifications(); // Now accessible
      fetchProfiles({});
    });

    socket.on("educational-assistance:deleted", () => {
      updateNotifBadge();
      fetchApplicants();
      fetchNotifications(); // Now accessible
    });
    socket.on("educational-assistance:newSubmission", () => {
    updateNotifBadge();
    Swal.fire({
      icon: 'info',
      title: 'New Educational Assistance Application',
      text: 'A new application has arrived!',
      timer: 8000,
      showConfirmButton: false,
      toast: true,
      position: 'top-end'
    });
    fetchApplicants();
  });

  socket.on("educational-assistance:statusChanged", () => {
    updateNotifBadge();
  });

    const params = new URLSearchParams(window.location.search);
  const id = params.get("id");
  if (id && typeof showProfileModal === "function") {
    fetch(`${API_BASE}/api/kkprofiling/${id}`, {
      headers: { Authorization: `Bearer ${sessionStorage.getItem("token")}` }
    })
    .then(res => res.json())
    .then(profile => {
      if (profile && profile._id) showProfileModal(profile);
    });
  }

  }); // <-- This closes the DOMContentLoaded handler

async function updateNotifBadge() {
  const token = sessionStorage.getItem("token");
    try {
    const res = await fetch(`${API_BASE}/api/notifications/kk/unread/count`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const count = data.count || 0;
    const badge = document.getElementById('notifBadge');
    const sidebarBadge = document.getElementById('sidebarNotifBadge');
    if (badge && sidebarBadge) {
      if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
        sidebarBadge.textContent = count;
        sidebarBadge.style.display = 'inline-block';
      } else {
        badge.style.display = 'none';
        sidebarBadge.style.display = 'none';
      }
    }
  } catch (err) {
    const badge = document.getElementById('notifBadge');
    const sidebarBadge = document.getElementById('sidebarNotifBadge');
    if (badge) badge.style.display = 'none';
    if (sidebarBadge) sidebarBadge.style.display = 'none';
  }
}

// Always show the unread notification badge on page load
updateNotifBadge();



// helper: get age from profile (multiple locations)
function getAgeFromProfile(p) {
  if (!p) return null;
  if (p.age !== undefined && p.age !== null) return p.age;
  if (p.user && p.user.age !== undefined && p.user.age !== null) return p.user.age;
  return null;
}

// Lightbox function for viewing images
function openImageLightbox(imageUrl) {
  const lightbox = document.createElement('div');
  lightbox.id = 'imageLightbox';
  lightbox.style.cssText = `
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 10000;
    padding: 20px;
  `;

  const img = document.createElement('img');
  img.src = imageUrl;
  img.style.cssText = `
    max-width: 90%;
    max-height: 90%;
    object-fit: contain;
    border-radius: 8px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  `;

  const closeBtn = document.createElement('button');
  closeBtn.innerHTML = '&times;';
  closeBtn.style.cssText = `
    position: absolute;
    top: 20px;
    right: 30px;
    background: none;
    border: none;
    color: white;
    font-size: 40px;
    cursor: pointer;
    transition: color 0.2s;
  `;
  closeBtn.onmouseover = () => closeBtn.style.color = '#ff6b6b';
  closeBtn.onmouseout = () => closeBtn.style.color = 'white';

  closeBtn.addEventListener('click', () => {
    document.body.removeChild(lightbox);
  });

  lightbox.addEventListener('click', (e) => {
    if (e.target === lightbox) {
      document.body.removeChild(lightbox);
    }
  });

  lightbox.appendChild(img);
  lightbox.appendChild(closeBtn);
  document.body.appendChild(lightbox);
}
