let currentUser = null;
let employees = [];
let teamStats = null;

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const authData = await checkAuth();
  currentUser = authData.user;

  if (currentUser.role !== 'manager' && currentUser.role !== 'admin') {
    window.location.href = '/login';
    return;
  }

  document.getElementById('userName').textContent = currentUser.name;
  document.getElementById('userEmail').textContent = currentUser.email;

  await loadEmployees();
  await loadTeamStats();
  loadViolations();
});

async function loadEmployees() {
  try {
    const response = await fetch('/api/manager/employees');
    const data = await response.json();
    employees = data.employees;

    const select = document.getElementById('employeeSelect');
    const assignSelect = document.getElementById('assignEmployeeSelect');
    
    const optionsHTML = '<option value="">-- Select Employee --</option>' +
      employees.map(emp => `
        <option value="${emp._id}">${emp.name} (${emp.employeeId || emp.email})</option>
      `).join('');
    
    if (select) select.innerHTML = optionsHTML;
    if (assignSelect) assignSelect.innerHTML = optionsHTML;
  } catch (error) {
    console.error('Error loading employees:', error);
  }
}

async function loadTeamStats() {
  try {
    const response = await fetch('/api/manager/team-stats');
    const data = await response.json();
    teamStats = data;

    // Update team overview stats
    document.getElementById('teamSize').textContent = data.teamSize || 0;
    document.getElementById('teamViolations').textContent = data.totalViolations || 0;
    document.getElementById('teamSafetyScore').textContent = (data.avgSafetyScore || 0).toFixed(1);
    document.getElementById('pendingActions').textContent = data.pendingViolations || 0;

    // Create trend chart if data available
    if (data.violationTrend && data.violationTrend.length > 0) {
      createTrendChart(data.violationTrend);
    }
  } catch (error) {
    console.error('Error loading team stats:', error);
  }
}

function createTrendChart(trendData) {
  const ctx = document.getElementById('trendChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: trendData.map(d => d.date),
      datasets: [{
        label: 'Violations',
        data: trendData.map(d => d.count),
        borderColor: '#ef4444',
        backgroundColor: 'rgba(239, 68, 68, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            stepSize: 1
          }
        }
      }
    }
  });
}

async function loadViolations() {
  try {
    const showResolved = document.getElementById('showResolvedToggle')?.checked || false;
    const response = await fetch(`/api/manager/violations?showAll=${showResolved}`);
    const data = await response.json();

    const tbody = document.getElementById('violationsTableBody');
    
    // Check for highlight param
    const urlParams = new URLSearchParams(window.location.search);
    const highlightId = urlParams.get('highlight');
    
    if (data.violations.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center">No violations found</td></tr>';
      return;
    }

    tbody.innerHTML = data.violations.map(violation => {
      const isUnknown = violation.employeeName.includes('Unknown') || violation.employeeName.includes('Detected');
      const isHighlighted = highlightId && violation._id === highlightId;
      const rowStyle = isHighlighted ? 'style="background-color: #fff3cd; border: 2px solid #ffc107;"' : '';
      
      if (isHighlighted) {
        // Scroll to highlighted row after render
        setTimeout(() => {
          const row = document.getElementById(`violation-${violation._id}`);
          if (row) row.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 500);
      }

      return `
      <tr id="violation-${violation._id}" ${rowStyle}>
        <td>${formatDate(violation.createdAt)}</td>
        <td>${violation.employeeName}</td>
        <td><span class="badge">${violation.violationType.replace('_', ' ')}</span></td>
        <td>${violation.location.address || 'N/A'}</td>
        <td><span class="badge ${violation.severity}">${capitalizeFirst(violation.severity)}</span></td>
        <td><span class="badge ${violation.status}">${capitalizeFirst(violation.status)}</span></td>
        <td>
          ${isUnknown ? 
            `<button class="btn btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.875rem; margin-right: 0.25rem;" onclick="openAssignModal('${violation._id}')">Assign</button>` : 
            ''
          }
          ${violation.status !== 'resolved' ?
            `<button class="btn btn-success" style="padding: 0.25rem 0.75rem; font-size: 0.875rem;" onclick="updateViolationStatus('${violation._id}', 'resolved')">Resolve</button>` :
            '<span>Completed</span>'
          }
        </td>
      </tr>
    `;
    }).join('');
  } catch (error) {
    console.error('Error loading violations:', error);
  }
}

function viewTeamStats() {
  if (teamStats) {
    alert(`Team Statistics:\n\nTeam Size: ${teamStats.teamSize}\nTotal Violations: ${teamStats.totalViolations}\nAverage Safety Score: ${teamStats.avgSafetyScore.toFixed(1)}\nPending Actions: ${teamStats.pendingViolations}`);
  }
}

async function viewEmployees() {
  const section = document.getElementById('teamMembersSection');
  section.style.display = 'block';

  try {
    const response = await fetch('/api/manager/team-members');
    const data = await response.json();

    const tbody = document.getElementById('teamMembersBody');
    if (data.members.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No team members found</td></tr>';
      return;
    }

    tbody.innerHTML = data.members.map(member => {
      const safetyScore = member.performanceRating?.safetyScore || 100;
      const scoreClass = safetyScore >= 80 ? 'success' : safetyScore >= 60 ? 'warning' : 'danger';

      return `
        <tr>
          <td><strong>${member.userId?.name || 'Unknown'}</strong></td>
          <td>${member.employeeId}</td>
          <td>${member.position}</td>
          <td><span class="badge ${scoreClass}">${safetyScore.toFixed(0)}</span></td>
          <td><span class="badge danger">${member.violationStats?.totalViolations || 0}</span></td>
          <td><span class="badge ${member.isActive ? 'success' : 'danger'}">${member.isActive ? 'Active' : 'Inactive'}</span></td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading team members:', error);
  }
}

function hideEmployees() {
  document.getElementById('teamMembersSection').style.display = 'none';
}

function openRecordModal() {
  document.getElementById('recordModal').style.display = 'block';
}

function closeRecordModal() {
  document.getElementById('recordModal').style.display = 'none';
  document.getElementById('recordForm').reset();
  document.getElementById('alertContainer').innerHTML = '';
}

function getCurrentLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        document.getElementById('latitude').value = position.coords.latitude;
        document.getElementById('longitude').value = position.coords.longitude;

        // Reverse geocoding (optional - you can use a service like OpenStreetMap)
        const address = `Lat: ${position.coords.latitude.toFixed(4)}, Lng: ${position.coords.longitude.toFixed(4)}`;
        document.getElementById('location').value = address;

        showAlert('Location captured successfully', 'success');
      },
      (error) => {
        showAlert('Error getting location: ' + error.message, 'error');
      }
    );
  } else {
    showAlert('Geolocation is not supported by your browser', 'error');
  }
}

document.getElementById('recordForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const formData = {
    employeeId: document.getElementById('employeeSelect').value,
    violationType: document.getElementById('violationType').value,
    severity: document.getElementById('severity').value,
    latitude: document.getElementById('latitude').value || 0,
    longitude: document.getElementById('longitude').value || 0,
    address: document.getElementById('location').value,
    description: document.getElementById('description').value
  };

  if (!formData.latitude || !formData.longitude) {
    showAlert('Please get current location first', 'error');
    return;
  }

  try {
    const response = await fetch('/api/manager/violations', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(formData)
    });

    const data = await response.json();

    if (response.ok) {
      showAlert('Violation recorded successfully', 'success');
      setTimeout(() => {
        closeRecordModal();
        loadViolations();
        loadTeamStats(); // Refresh team stats
      }, 1500);
    } else {
      showAlert(data.message, 'error');
    }
  } catch (error) {
    showAlert('Error recording violation', 'error');
  }
});

async function updateViolationStatus(violationId, status) {
  try {
    const response = await fetch(`/api/manager/violations/${violationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ status })
    });

    if (response.ok) {
      alert('Violation status updated successfully');
      loadViolations();
      loadTeamStats(); // Refresh team stats
    } else {
      const error = await response.json();
      alert('Failed to update violation status: ' + (error.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error:', error);
    alert('Error updating violation status');
  }
}

function openAssignModal(violationId) {
  document.getElementById('assignViolationId').value = violationId;
  document.getElementById('assignModal').style.display = 'block';
}

function closeAssignModal() {
  document.getElementById('assignModal').style.display = 'none';
  document.getElementById('assignViolationId').value = '';
  document.getElementById('assignEmployeeSelect').value = '';
}

async function assignViolation() {
  const violationId = document.getElementById('assignViolationId').value;
  const employeeId = document.getElementById('assignEmployeeSelect').value;
  
  if (!employeeId) {
    alert('Please select an employee');
    return;
  }

  try {
    const employee = employees.find(emp => emp._id === employeeId);
    if (!employee) {
      alert('Employee not found');
      return;
    }

    const response = await fetch(`/api/manager/violations/${violationId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        employeeId: employeeId,
        employeeName: employee.name
      })
    });

    if (response.ok) {
      alert('Violation assigned to employee successfully');
      closeAssignModal();
      loadViolations();
      loadTeamStats();
    } else {
      const error = await response.json();
      alert('Failed to assign violation: ' + (error.message || 'Unknown error'));
    }
  } catch (error) {
    console.error('Error assigning violation:', error);
    alert('Error assigning violation');
  }
}

function showAlert(message, type) {
  const alertContainer = document.getElementById('alertContainer');
  alertContainer.innerHTML = `
    <div class="alert alert-${type}">
      <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
      ${message}
    </div>
  `;
}

// Close modal when clicking outside
window.onclick = function (event) {
  const modal = document.getElementById('recordModal');
  if (event.target == modal) {
    closeRecordModal();
  }
}