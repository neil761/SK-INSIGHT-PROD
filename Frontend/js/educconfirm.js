document.addEventListener('DOMContentLoaded', function() {
  // if (!validateTokenAndRedirect("Educational Assistance Confirmation")) {
  //   return;
  // }
  
  // Navbar and navigation logic is now handled by shared navbar.js
  // All local hamburger/nav button code removed for maintainability.
  // Hide edit button if the form cycle is closed
  (async function(){
    try {
        const API_BASE = (typeof window !== 'undefined' && window.API_BASE)
          ? window.API_BASE
          : (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
            ? 'http://localhost:5000'
            : 'https://sk-insight.online';

        const res = await fetch(`${API_BASE}/api/formcycle/status?formName=Educational%20Assistance`);
      const status = await res.json().catch(()=>null);
      const latest = Array.isArray(status)? status[status.length-1] : status;
      const isOpen = latest?.isOpen ?? false;
      if (!isOpen) {
        document.querySelectorAll('.kk-upload-row .edit').forEach(el => el.remove());
      }
    } catch (e) {
      console.warn('Could not determine form status to hide edit button', e);
    }
  })();

  // Hide edit button and show approved text if the user's application is approved
  (async function(){
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      if (!token) return;
        const profileRes = await fetch(`${API_BASE}/api/educational-assistance/me`, { headers: { Authorization: `Bearer ${token}` } });
      const profile = await profileRes.json().catch(()=>null);
      if (!profile) return;

      const statusVal = (profile && (profile.status || profile.decision || profile.adminDecision || profile.result)) || '';
      const isApproved = Boolean(
        (profile && (profile.approved === true || profile.isApproved === true)) ||
        (typeof statusVal === 'string' && /approve|accepted|approved/i.test(statusVal))
      );

      if (isApproved) {
        // Remove any edit buttons
        document.querySelectorAll('.kk-upload-row .edit').forEach(el => el.remove());

        // Add an approved badge/text with check icon if not already present
        const container = document.querySelector('.kk-upload-row');
        if (container && !container.querySelector('.approved-text')) {
          const span = document.createElement('span');
          span.className = 'approved-text';
          // Use FontAwesome check icon followed by text
          span.innerHTML = '<i class="fa-solid fa-check" aria-hidden="true" style="margin-right:8px;"></i> Approved';
          span.setAttribute('role', 'status');
          span.setAttribute('aria-label', 'Approved');
          // Inline styling to match existing buttons visually
          span.style.display = 'inline-flex';
          span.style.alignItems = 'center';
          span.style.padding = '8px 14px';
          span.style.borderRadius = '6px';
          span.style.color = '#28a745';
          span.style.fontWeight = '600';
          span.style.marginLeft = '8px';
          container.appendChild(span);
        }
      }
    } catch (e) {
      console.warn('Could not determine profile approval status', e);
    }
  })();
});


// All nav button event listeners removed; navigation is now handled by navbar.js