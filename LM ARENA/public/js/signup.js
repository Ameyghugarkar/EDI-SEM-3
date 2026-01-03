// Show/hide role-specific fields
document.getElementById('role').addEventListener('change', function () {
  const role = this.value;
  const employeeFields = document.getElementById('employeeFields');
  const managerFields = document.getElementById('managerFields');
  const adminFields = document.getElementById('adminFields');

  if (role === 'employee') {
    employeeFields.style.display = 'block';
    managerFields.style.display = 'none';
    adminFields.style.display = 'none';
    // Make employee fields required
    document.getElementById('department').required = true;
  } else if (role === 'manager') {
    employeeFields.style.display = 'none';
    managerFields.style.display = 'block';
    adminFields.style.display = 'none';
    // Remove employee field requirements
    document.getElementById('department').required = false;
    document.getElementById('managerDepartment').required = true;
  } else if (role === 'admin') {
    employeeFields.style.display = 'none';
    managerFields.style.display = 'none';
    adminFields.style.display = 'block';
    // Remove all role-specific requirements
    document.getElementById('department').required = false;
    if (document.getElementById('managerDepartment')) {
      document.getElementById('managerDepartment').required = false;
    }
  } else {
    employeeFields.style.display = 'none';
    managerFields.style.display = 'none';
    adminFields.style.display = 'none';
  }
});

// Email validation on blur
document.getElementById('email').addEventListener('blur', async function () {
  const email = this.value;
  if (!email) return;

  try {
    const response = await fetch('/api/auth/check-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email })
    });

    const data = await response.json();
    if (data.exists) {
      showAlert('This email is already registered. Please use a different email or <a href="/login">login</a>.', 'error');
    }
  } catch (error) {
    console.error('Error checking email:', error);
  }
});

// Password match validation
document.getElementById('confirmPassword').addEventListener('input', function () {
  const password = document.getElementById('password').value;
  const confirmPassword = this.value;

  if (confirmPassword && password !== confirmPassword) {
    this.setCustomValidity('Passwords do not match');
  } else {
    this.setCustomValidity('');
  }
});

// Form submission
document.getElementById('signupForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    showAlert('Passwords do not match!', 'error');
    return;
  }

  if (password.length < 6) {
    showAlert('Password must be at least 6 characters long!', 'error');
    return;
  }

  const role = document.getElementById('role').value;
  const formData = {
    name: document.getElementById('name').value,
    email: document.getElementById('email').value,
    phone: document.getElementById('phone').value,
    password: password,
    role: role
  };

  // Add role-specific fields
  if (role === 'employee') {
    formData.employeeId = document.getElementById('employeeId').value;
    formData.department = document.getElementById('department').value;
    formData.position = document.getElementById('position').value;
    formData.dateOfJoining = document.getElementById('dateOfJoining').value;
  } else if (role === 'manager') {
    formData.department = document.getElementById('managerDepartment').value;
  }
  // Admin doesn't need additional fields

  // Show loading
  const submitBtn = e.target.querySelector('button[type="submit"]');
  const originalText = submitBtn.innerHTML;
  submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Creating Account...';
  submitBtn.disabled = true;

  try {
    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (response.ok) {
      showAlert('Account created successfully! Redirecting to login...', 'success');
      setTimeout(() => {
        window.location.href = '/login';
      }, 2000);
    } else {
      showAlert(data.message || 'Registration failed. Please try again.', 'error');
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
    }
  } catch (error) {
    console.error('Error:', error);
    showAlert('An error occurred. Please try again.', 'error');
    submitBtn.innerHTML = originalText;
    submitBtn.disabled = false;
  }
});

function showAlert(message, type) {
  const alertContainer = document.getElementById('alertContainer');
  alertContainer.innerHTML = `
    <div class="alert alert-${type}">
      <i class="fas fa-${type === 'error' ? 'exclamation-circle' : type === 'success' ? 'check-circle' : 'info-circle'}"></i>
      ${message}
    </div>
  `;

  // Auto-remove success alerts after 5 seconds
  if (type === 'success') {
    setTimeout(() => {
      alertContainer.innerHTML = '';
    }, 5000);
  }
}