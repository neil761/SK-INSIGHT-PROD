// Frontend helper: check if user's latest Educational Assistance application was rejected
// If rejected, show SweetAlert with option to update and redirect to edit page

(function () {
  // Configure API base for development
  const API_BASE = (typeof window !== 'undefined' && window.API_BASE) ? window.API_BASE : 'http://localhost:5000';

  async function checkRejectedAndRedirect() {
    try {
      const token = sessionStorage.getItem('token') || localStorage.getItem('token');
      const headers = { 'Accept': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      // If there's no token, prompt the user to log in
      if (!token) {
        Swal.fire({
          icon: 'warning',
          title: 'You need to log in first',
          text: 'Please log in to access Educational Assistance.',
          confirmButtonText: 'Log in'
        }).then(() => {
          window.location.href = '/Frontend/html/user/login.html';
        });
        return;
      }

      console.debug('checkRejected: calling API', `${API_BASE}/api/educational-assistance/check-rejected`);

      const resp = await fetch(`${API_BASE}/api/educational-assistance/check-rejected`, {
        method: 'GET',
        credentials: 'include',
        headers
      });

      console.debug('checkRejected: API status', resp.status);
      let data = null;
      try { data = await resp.json(); } catch (e) { console.debug('checkRejected: failed to parse JSON', e); }
      console.debug('checkRejected: response body', data);

      // Debug mode: enabled if ?debug=1 in URL or localStorage flag is set.
      const urlParams = new URLSearchParams(window.location.search);
      const debugMode = urlParams.get('debug') === '1' || localStorage.getItem('CHECK_REJECTED_DEBUG') === '1';

      if (resp.status === 401) {
        Swal.fire({
          icon: 'warning',
          title: 'Session expired',
          text: 'Please log in again to continue.',
          confirmButtonText: 'Log in'
        }).then(() => {
          window.location.href = '/Frontend/html/user/login.html';
        });
        return;
      }

      if (!resp.ok) {
        console.error('checkRejected: network error', resp.status, data);
        Swal.fire({
          icon: 'error',
          title: 'Network error',
          text: 'Could not check application status. Please try again later.',
          confirmButtonText: 'OK'
        });
        return;
      }

      const isRejected = data && (data.rejected === true || data.rejected === 'true' || data.rejected === '1');

      if (isRejected) {
        const reason = data.rejectionReason || 'Your application was rejected by the admin.';
        if (debugMode) {
          Swal.fire({
            title: 'Application Rejected (debug)',
            html: `<pre style="text-align:left;white-space:pre-wrap">${JSON.stringify(data, null, 2)}</pre>`,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Update Response',
            cancelButtonText: 'Dismiss',
            width: 700,
          }).then((result) => {
            if (result.isConfirmed) {
              const target = data.applicationId
                ? `/Frontend/html/user/update-rejected.html?id=${data.applicationId}`
                : '/Frontend/html/user/update-rejected.html';
              console.debug('checkRejected(debug): redirecting to', target);
              window.location.href = target;
            }
          });
        } else {
          Swal.fire({
            title: 'Application Rejected',
            text: reason,
            icon: 'warning',
            showCancelButton: true,
            confirmButtonText: 'Update Response',
            cancelButtonText: 'Dismiss',
          }).then((result) => {
            if (result.isConfirmed) {
              const target = data.applicationId
                ? `/Frontend/html/user/update-rejected.html?id=${data.applicationId}`
                : '/Frontend/html/user/update-rejected.html';
              console.debug('checkRejected: redirecting to', target);
              window.location.href = target;
            }
          });
        }
      } else {
        // Not rejected — show confirmation (so user sees result) before navigating
        const main = '/Frontend/html/user/Educational-assistance-user.html';
        const infoHtml = debugMode ? `<pre style="text-align:left;white-space:pre-wrap">${JSON.stringify(data, null, 2)}</pre>` : undefined;
        Swal.fire({
          title: 'No Rejected Application',
          text: debugMode ? 'Response shown below.' : 'You do not have a rejected application. Do you want to continue to the Educational Assistance page?',
          html: infoHtml,
          icon: 'info',
          showCancelButton: true,
          confirmButtonText: 'Proceed',
          cancelButtonText: 'Stay',
          width: debugMode ? 700 : undefined,
        }).then((r) => {
          if (r.isConfirmed) window.location.href = main;
        });
      }
    } catch (err) {
      console.error('checkRejected error:', err);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'An error occurred. Please try again.',
        confirmButtonText: 'OK'
      });
    }
  }

  function attachHandlers() {
    const desktop = document.getElementById('educAssistanceNavBtnDesktop');
    const mobile = document.getElementById('educAssistanceNavBtnMobile');

    if (desktop) desktop.addEventListener('click', function (e) {
      e.preventDefault();
      checkRejectedAndRedirect();
    });
    if (mobile) mobile.addEventListener('click', function (e) {
      e.preventDefault();
      checkRejectedAndRedirect();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attachHandlers);
  } else {
    attachHandlers();
  }
})();
