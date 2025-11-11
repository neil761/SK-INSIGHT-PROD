const sendEmailOtpBtn = document.getElementById('sendEmailOtpBtn'); // Make sure this is at the top

function updateOtpSendButtons() {
    // Now you can safely use sendEmailOtpBtn here
    sendEmailOtpBtn.disabled = false;
}

function handleOtpSubmit(event) {
    event.preventDefault();
    const otp = document.getElementById('otp').value;
    if (!otp) {
        alert('Please enter an OTP');
        return;
    }
    // ...other code...
}