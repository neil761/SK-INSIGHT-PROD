// =========================
// ANNOUNCEMENT SECTION
// =========================

document.addEventListener("DOMContentLoaded", () => {
  const tableBody = document.querySelector(".announcement-table tbody");
  const tableHead = document.querySelector(".announcement-table thead tr");
  const modal = document.getElementById("announcementModal");
  const modalTitle = modal.querySelector(".modal-header h3");
  const modalEventDate = modal.querySelector(".event-date");
  const modalCreatedDate = modal.querySelector(".created-date");
  const modalDescription = modal.querySelector(".description-box");
  const closeModalBtn = modal.querySelector(".close-modal");

  let cardsContainer = document.querySelector(".announcement-cards");
  if (!cardsContainer) {
    cardsContainer = document.createElement("div");
    cardsContainer.className = "announcement-cards";
    const tableEl = document.querySelector(".announcement-table");
    if (tableEl && tableEl.parentNode) {
      tableEl.parentNode.insertBefore(cardsContainer, tableEl);
    }
  }

  let lastAnnouncements = [];
  let generalAnnouncements = [];
  let expiredAnnouncements = [];
  let forYouAnnouncements = [];

  const tabBtns = document.querySelectorAll('.tab-btn');
  let currentTab = 'general';

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentTab = btn.dataset.tab;
      updateTableHeader();
      renderTabAnnouncements();
    });
  });

  function updateTableHeader() {
    if (!tableHead) return;
    // Change the second column header based on tab
    const ths = tableHead.querySelectorAll("th");
    if (ths.length >= 2) {
      if (currentTab === "foryou") {
        ths[1].textContent = "Created At";
      } else {
        ths[1].textContent = "Event Date";
      }
    }
  }

  async function fetchGeneralAndExpired() {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const res = await fetch("http://localhost:5000/api/announcements", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    const all = data.announcements || [];
    // Only general announcements (recipient: null)
    generalAnnouncements = all.filter(a => a.isActive === true && a.recipient === null);
    expiredAnnouncements = all.filter(a => a.isActive === false && a.recipient === null);
  }

  async function fetchForYou() {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");
    const res = await fetch("http://localhost:5000/api/announcements/myannouncements", {
      headers: { Authorization: `Bearer ${token}` }
    });
    const data = await res.json();
    forYouAnnouncements = data.announcements || [];
    // Log for debugging
    console.log("For You Announcements:", forYouAnnouncements);
  }

  async function renderTabAnnouncements() {
    if (currentTab === 'general' || currentTab === 'expired') {
      await fetchGeneralAndExpired();
    }
    if (currentTab === 'foryou') {
      await fetchForYou();
    }
    let announcements = [];
    if (currentTab === 'general') {
      announcements = generalAnnouncements;
    } else if (currentTab === 'foryou') {
      announcements = forYouAnnouncements;
    } else if (currentTab === 'expired') {
      announcements = expiredAnnouncements;
    }
    lastAnnouncements = announcements;
    renderAnnouncementsResponsive(announcements);
  }

  function renderAnnouncementsResponsive(announcements) {
    const isMobile = window.matchMedia('(max-width: 600px)').matches;
    if (isMobile) {
      document.querySelector('.announcement-table')?.classList.add('hidden');
      renderAnnouncementsCards(announcements);
    } else {
      document.querySelector('.announcement-table')?.classList.remove('hidden');
      renderAnnouncementsTable(announcements);
    }
  }

  function renderAnnouncementsTable(announcements) {
    tableBody.innerHTML = "";

    let displayAnnouncements = announcements;
    const now = new Date();

    if (currentTab === 'general') {
      displayAnnouncements = announcements.filter(a => {
        const exp = new Date(a.expiresAt);
        return exp >= now;
      });
      // Sort by nearest eventDate (soonest first)
      displayAnnouncements.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
    }
    else if (currentTab === 'expired') {
      displayAnnouncements = announcements.filter(a => {
        const exp = new Date(a.expiresAt);
        return exp < now;
      });
      // Sort so latest expired (most recent expiresAt) is on top
      displayAnnouncements.sort((a, b) => new Date(b.expiresAt) - new Date(a.expiresAt));
    }
    else if (currentTab === 'foryou') {
      displayAnnouncements = announcements.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const limitedAnnouncements = displayAnnouncements.slice(0, 8);

    limitedAnnouncements.forEach(a => {
      let status, dateCol;
      if (currentTab === 'foryou') {
        status = "No Expiry";
        dateCol = a.createdAt ? formatDateTime(a.createdAt) : "-";
      } else {
        status = getAnnouncementStatus(a.expiresAt);
        dateCol = a.eventDate ? formatDateTime(a.eventDate) : "-";
      }
      const tr = document.createElement("tr");
      if (a.isPinned) {
        tr.classList.add("pinned-row");
      }
      // Add status hue for For You tab
if (currentTab === 'foryou') {
  const title = (a.title || "").toLowerCase();
  if (title.includes("rejected") || title.includes("deleted")) {
    tr.classList.add("announcement-row-rejected");
  } else if (title.includes("approved") || title.includes("restored")) {
    tr.classList.add("announcement-row-approved");
  }
}
      tr.innerHTML = `
        <td>
          <div class="announcement-title">
            ${a.isPinned ? '<i class="fa-solid fa-location-pin" style="color: #d4af37; margin-right: 8px;"></i>' : ''}
            <i class="fa-solid fa-bullhorn"></i>
            ${a.title}
          </div>
        </td>
        <td>${dateCol}</td>
        <td><span class="status-badge ${status.toLowerCase().replace(/\s/g, '')}">${status}</span></td>
        <td>
          <button class="view-btn" data-id="${a._id}">
            <i class="fas fa-eye"></i>
          </button>
        </td>
      `;
      tableBody.appendChild(tr);
    });

    for (let i = limitedAnnouncements.length; i < 8; i++) {
      const tr = document.createElement("tr");
      tr.innerHTML = ``;
      tableBody.appendChild(tr);
    }
  }

  function renderAnnouncementsCards(announcements) {
    if (!cardsContainer) return;
    cardsContainer.innerHTML = "";
    if (tableBody) tableBody.innerHTML = "";

    let displayAnnouncements = announcements;
    const now = new Date();

    if (currentTab === 'general') {
      displayAnnouncements = (announcements || []).filter(a => {
        const exp = new Date(a.expiresAt);
        return exp >= now;
      });
      displayAnnouncements.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
    }
    else if (currentTab === 'expired') {
      displayAnnouncements = (announcements || []).filter(a => {
        const exp = new Date(a.expiresAt);
        return exp < now;
      });
      displayAnnouncements.sort((a, b) => new Date(a.eventDate) - new Date(b.eventDate));
    }
    else if (currentTab === 'foryou') {
      displayAnnouncements = announcements.slice().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }

    const limitedAnnouncements = displayAnnouncements.slice(0, 8);

    limitedAnnouncements.forEach(a => {
      let status, dateCol;
      if (currentTab === 'foryou') {
        status = "No Expiry";
        dateCol = a.createdAt ? formatDateTime(a.createdAt) : "-";
      } else {
        status = getAnnouncementStatus(a.expiresAt);
        dateCol = a.eventDate ? formatDateTime(a.eventDate) : "-";
      }
      const card = document.createElement('div');
      card.className = 'announcement-card';
      // Add status hue for For You tab
if (currentTab === 'foryou') {
  const title = (a.title || "").toLowerCase();
  if (title.includes("rejected") || title.includes("deleted")) {
    card.classList.add("announcement-card-rejected");
  } else if (title.includes("approved") || title.includes("restored")) {
    card.classList.add("announcement-card-approved");
  }
}
      card.innerHTML = `
        <div class="card-header">
          <div class="title">
            ${a.isPinned ? '<i class="fa-solid fa-location-pin" style="color: #d4af37; margin-right: 8px;"></i>' : ''}
            <i class="fa-solid fa-bullhorn"></i>
            <span>${a.title}</span>
            <span class="status-badge ${status.toLowerCase().replace(/\s/g, '')}">${status}</span>
          </div>
        </div>
        <div class="card-meta">
          <div class="meta-row"><i class="fa-regular fa-calendar"></i> ${dateCol}</div>
          <div class="meta-row"><i class="fa-regular fa-clock"></i> Posted: ${a.createdAt ? formatDateTime(a.createdAt) : '-'}</div>
        </div>
      `;

      card.addEventListener('click', async () => {
        if (!validateTokenAndRedirect("announcement details")) {
          return;
        }
        try {
          const token = localStorage.getItem("token") || sessionStorage.getItem("token");
          const res = await fetch(`http://localhost:5000/api/announcements/${a._id}`, {
            headers: { "Authorization": `Bearer ${token}` }
          });
          if (!res.ok) throw new Error("Announcement not found");
          const { announcement } = await res.json();
          modalTitle.textContent = announcement.title;
          // For "foryou" tab, hide event date in modal
          if (currentTab === 'foryou') {
            modalEventDate.style.display = "none";
          } else {
            modalEventDate.style.display = "";
            modalEventDate.textContent = formatDateTime(announcement.eventDate);
          }
          modalCreatedDate.textContent = `Posted: ${formatDateTime(announcement.createdAt)}`;
          modalDescription.textContent = announcement.content;
          modal.classList.add("active");
        } catch (err) {
          console.error("Error fetching announcement:", err);
          alert("Failed to load announcement details");
        }
      });

      cardsContainer.appendChild(card);
    });

    cardsContainer.style.display = 'block';
    const tableEl = document.querySelector('.announcement-table');
    if (tableEl) tableEl.style.display = 'none';
  }

  // Modal view for table (desktop)
  document.addEventListener("click", async (e) => {
    if (e.target.closest(".view-btn")) {
      if (!validateTokenAndRedirect("announcement details")) {
        return;
      }
      const id = e.target.closest(".view-btn").dataset.id;
      try {
        const token = localStorage.getItem("token") || sessionStorage.getItem("token");
        const res = await fetch(`http://localhost:5000/api/announcements/${id}`, {
          headers: { "Authorization": `Bearer ${token}` }
        });
        if (!res.ok) throw new Error("Announcement not found");
        const { announcement } = await res.json();
        modalTitle.textContent = announcement.title;
        // For "foryou" tab, hide event date in modal
        if (currentTab === 'foryou') {
          modalEventDate.style.display = "none";
        } else {
          modalEventDate.style.display = "";
          modalEventDate.textContent = formatDateTime(announcement.eventDate);
        }
        modalCreatedDate.textContent = `Posted: ${formatDateTime(announcement.createdAt)}`;
        modalDescription.textContent = announcement.content;
        modal.classList.add("active");
      } catch (err) {
        console.error("Error fetching announcement:", err);
        alert("Failed to load announcement details");
      }
    }
  });

  closeModalBtn.addEventListener("click", () => {
    modal.classList.remove("active");
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.classList.remove("active");
  });

  function formatDateTime(dt) {
    if (!dt) return "";
    return new Date(dt).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  }

  function getAnnouncementStatus(expiresAt) {
    if (!expiresAt) return "Unknown";
    const now = new Date();
    const exp = new Date(expiresAt);
    return exp >= now ? "Upcoming" : "Expired";
  }

  // Initial load: show general tab and update header
  updateTableHeader();
  renderTabAnnouncements();

  // WebSocket updates (optional, keep your logic here)
  const socket = io("http://localhost:5000", { transports: ["websocket"] });
  socket.on("announcement:created", renderTabAnnouncements);
  socket.on("announcement:updated", renderTabAnnouncements);
  socket.on("announcement:deleted", renderTabAnnouncements);
  socket.on("announcement:pinned", renderTabAnnouncements);
  socket.on("announcement:unpinned", renderTabAnnouncements);
});

// =========================
// NAVBAR & KK PROFILING SECTION
// =========================
document.addEventListener('DOMContentLoaded', function() {
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
        showCancelButton: true, // Show the "No" button
        confirmButtonText: "Go to form", // Text for the "Go to Form" button
        cancelButtonText: "No", // Text for the "No" button
      }).then(result => {
        if (result.isConfirmed) {
          // Redirect to the form page when "Go to Form" is clicked
          window.location.href = "kkform-personal.html";
        } else if (result.dismiss === Swal.DismissReason.cancel) {
        }
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
        showCancelButton: true, // Show the "No" button
        confirmButtonText: "Go to form", // Text for the "Go to Form" button
        cancelButtonText: "No", // Text for the "No" button
      }).then(result => {
        if (result.isConfirmed) {
          // Redirect to the form page when "Go to Form" is clicked
          window.location.href = "lgbtqform.html";
        } else if (result.dismiss === Swal.DismissReason.cancel) {
        }
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
        title: `No profile found`,
        text: `You don't have a profile yet. Please fill out the form to create one.`,
        showCancelButton: true, // Show the "No" button
        confirmButtonText: "Go to form", // Text for the "Go to Form" button
        cancelButtonText: "No", // Text for the "No" button
      }).then(result => {
        if (result.isConfirmed) {
          // Redirect to the form page when "Go to Form" is clicked
          window.location.href = "Educational-assistance-user.html";
        } else if (result.dismiss === Swal.DismissReason.cancel) {
        }
      });
      return;
    }
    })
    .catch(() => window.location.href = "Educational-assistance-user.html");
  }
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

document.addEventListener('DOMContentLoaded', function () {
  const token = sessionStorage.getItem('token') || localStorage.getItem('token');
  const verificationStrip = document.getElementById('verification-strip');

  if (token) {
    fetch('http://localhost:5000/api/users/me', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(response => response.json())
      .then(user => {
        if (!user.isVerified) {
          // Show verification strip for unverified accounts
          if (verificationStrip) {
            verificationStrip.style.display = 'flex';
          }

          // Disable navigation buttons
          const navSelectors = [
            '#kkProfileNavBtnDesktop',
            '#kkProfileNavBtnMobile',
            '#lgbtqProfileNavBtnDesktop',
            '#lgbtqProfileNavBtnMobile',
            '#educAssistanceNavBtnDesktop',
            '#educAssistanceNavBtnMobile',
            '.announcement-btn'
          ];
          navSelectors.forEach(selector => {
            document.querySelectorAll(selector).forEach(btn => {
              btn.classList.add('disabled');
              btn.setAttribute('tabindex', '-1');
              btn.setAttribute('aria-disabled', 'true');
              btn.addEventListener('click', function (e) {
                e.preventDefault();
                Swal.fire({
                  icon: 'warning',
                  title: 'Account Verification Required',
                  text: 'Please verify your account to access this feature.',
                  confirmButtonText: 'OK'
                });
              });
            });
          });
        }
      })
      .catch(() => {
        console.error('Failed to fetch user verification status.');
      });
  }
});

document.addEventListener("DOMContentLoaded", function () {
  const announcementTableBody = document.querySelector(".announcement-table tbody");

  if (announcementTableBody) {
    const rows = announcementTableBody.querySelectorAll("tr");
    if (rows.length <= 5) {
      // If there are 5 or fewer announcements, remove scrolling
      announcementTableBody.style.display = 'block';
      announcementTableBody.style.overflowY = "visible";
    } else {
      // If there are more than 5 announcements, enable scrolling
      announcementTableBody.style.maxHeight = "400px"; // Adjust height as needed
      announcementTableBody.style.overflowY = "auto";
    }
  }
});