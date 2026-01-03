let currentUser = null;
let employeeProfile = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const authData = await checkAuth();
  currentUser = authData.user;

  if (currentUser.role !== 'employee') {
    window.location.href = '/login';
    return;
  }

  document.getElementById('userName').textContent = currentUser.name;
  document.getElementById('userEmail').textContent = currentUser.email;

  await loadEmployeeProfile();
  await loadViolations();
  await loadTraining();
  await loadEquipment();
});

async function loadEmployeeProfile() {
  try {
    const response = await fetch('/api/employee/profile');
    const data = await response.json();
    employeeProfile = data.profile;

    // Update safety score
    const safetyScore = employeeProfile.performanceRating?.safetyScore || 100;
    document.getElementById('safetyScore').textContent = safetyScore.toFixed(0);

    // Update score message
    let scoreMessage = '';
    if (safetyScore >= 90) {
      scoreMessage = 'Excellent safety record!';
    } else if (safetyScore >= 75) {
      scoreMessage = 'Good safety performance';
    } else if (safetyScore >= 60) {
      scoreMessage = 'Room for improvement';
    } else {
      scoreMessage = 'Needs immediate attention';
    }
    document.getElementById('scoreMessage').textContent = scoreMessage;

    // Update personal info
    document.getElementById('employeeDepartment').textContent = employeeProfile.department || '-';
    document.getElementById('employeePosition').textContent = employeeProfile.position || '-';

    // Calculate days since last violation
    if (employeeProfile.violationStats?.lastViolationDate) {
      const lastViolation = new Date(employeeProfile.violationStats.lastViolationDate);
      const today = new Date();
      const daysSince = Math.floor((today - lastViolation) / (1000 * 60 * 60 * 24));
      document.getElementById('daysSinceViolation').textContent = daysSince + ' days';
    } else {
      document.getElementById('daysSinceViolation').textContent = 'Never';
    }

    // Calculate violation-free streak (simplified)
    const joiningDate = new Date(employeeProfile.dateOfJoining);
    const today = new Date();
    const totalDays = Math.floor((today - joiningDate) / (1000 * 60 * 60 * 24));
    const violationDays = employeeProfile.violationStats?.totalViolations || 0;
    const streakDays = Math.max(0, totalDays - violationDays * 7); // Rough estimate
    document.getElementById('violationFreeStreak').textContent = streakDays + ' days';

  } catch (error) {
    console.error('Error loading profile:', error);
  }
}

async function loadViolations() {
  try {
    const response = await fetch('/api/employee/violations');
    const data = await response.json();

    // Update stats
    document.getElementById('totalViolations').textContent = data.stats.total;
    document.getElementById('pendingViolations').textContent = data.stats.pending;
    document.getElementById('acknowledgedViolations').textContent = data.stats.acknowledged;
    document.getElementById('resolvedViolations').textContent = data.stats.resolved;

    // Populate table
    const tbody = document.getElementById('violationsTableBody');
    if (data.violations.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No violations found</td></tr>';
      return;
    }

    tbody.innerHTML = data.violations.map(violation => `
      <tr>
        <td>${formatDate(violation.createdAt)}</td>
        <td><span class="badge">${violation.violationType.replace('_', ' ')}</span></td>
        <td>${violation.location.address || 'N/A'}</td>
        <td><span class="badge ${violation.severity}">${capitalizeFirst(violation.severity)}</span></td>
        <td><span class="badge ${violation.status}">${capitalizeFirst(violation.status)}</span></td>
        <td>${violation.recordedByName}</td>
        <td>
          ${violation.status === 'pending' ?
        `<button class="btn btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.875rem;" onclick="acknowledgeViolation('${violation._id}')">Acknowledge</button>` :
        '<span>-</span>'
      }
        </td>
      </tr>
    `).join('');
  } catch (error) {
    console.error('Error loading violations:', error);
  }
}

async function loadTraining() {
  try {
    const response = await fetch('/api/employee/training');
    const data = await response.json();

    const tbody = document.getElementById('trainingTableBody');
    if (!data.trainings || data.trainings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center">No training records found</td></tr>';
      return;
    }

    tbody.innerHTML = data.trainings.map(training => {
      const expiryDate = new Date(training.expiryDate);
      const today = new Date();
      const daysUntilExpiry = Math.floor((expiryDate - today) / (1000 * 60 * 60 * 24));

      let status, statusText;
      if (daysUntilExpiry < 0) {
        status = 'danger';
        statusText = 'Expired';
      } else if (daysUntilExpiry <= 30) {
        status = 'warning';
        statusText = 'Expiring Soon';
      } else {
        status = 'success';
        statusText = 'Valid';
      }

      return `
        <tr>
          <td>${training.trainingName}</td>
          <td>${formatDate(training.completedDate)}</td>
          <td>${formatDate(training.expiryDate)}</td>
          <td><span class="badge ${status}">${statusText}</span></td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading training:', error);
    document.getElementById('trainingTableBody').innerHTML = '<tr><td colspan="4" class="text-center">No training records found</td></tr>';
  }
}

async function loadEquipment() {
  try {
    const response = await fetch('/api/employee/equipment');
    const data = await response.json();

    const tbody = document.getElementById('equipmentTableBody');
    if (!data.equipment || data.equipment.length === 0) {
      tbody.innerHTML = '<tr><td colspan="4" class="text-center">No equipment assigned</td></tr>';
      return;
    }

    tbody.innerHTML = data.equipment.map(eq => {
      const statusClass = eq.status === 'issued' ? 'success' : eq.status === 'damaged' ? 'warning' : eq.status === 'lost' ? 'danger' : 'primary';

      return `
        <tr>
          <td>${capitalizeFirst(eq.equipmentType.replace('_', ' '))}</td>
          <td>${eq.equipmentId}</td>
          <td>${formatDate(eq.issuedDate)}</td>
          <td><span class="badge ${statusClass}">${capitalizeFirst(eq.status)}</span></td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading equipment:', error);
    document.getElementById('equipmentTableBody').innerHTML = '<tr><td colspan="4" class="text-center">No equipment assigned</td></tr>';
  }
}

async function acknowledgeViolation(violationId) {
  if (!confirm('Are you sure you want to acknowledge this violation?')) {
    return;
  }

  try {
    const response = await fetch(`/api/employee/violations/${violationId}/acknowledge`, {
      method: 'PUT'
    });

    if (response.ok) {
      alert('Violation acknowledged successfully');
      loadViolations();
      loadEmployeeProfile(); // Refresh safety score
    } else {
      alert('Failed to acknowledge violation');
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error acknowledging violation');
  }
}