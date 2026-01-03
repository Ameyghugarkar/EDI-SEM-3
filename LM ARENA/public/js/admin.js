let currentUser = null;
let map = null;
let heatLayer = null;
let currentTab = 'overview';

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
  const authData = await checkAuth();
  currentUser = authData.user;

  if (currentUser.role !== 'admin') {
    window.location.href = '/login';
    return;
  }

  document.getElementById('userName').textContent = currentUser.name;
  document.getElementById('userEmail').textContent = currentUser.email;

  await loadDashboardData();
  initializeMap();
  await loadHeatmapData();
});

// Tab switching
function switchTab(tabName) {
  currentTab = tabName;

  // Update tab buttons
  document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
  event.target.closest('.tab-btn').classList.add('active');

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
  document.getElementById(`${tabName}-tab`).classList.add('active');

  // Load data for the tab
  switch (tabName) {
    case 'overview':
      // Already loaded
      break;
    case 'departments':
      loadDepartmentData();
      break;
    case 'users':
      loadUsers();
      break;
    case 'training':
      loadTrainingData();
      break;
    case 'equipment':
      loadEquipmentData();
      break;
  }
}

async function loadDashboardData() {
  try {
    const response = await fetch('/api/admin/dashboard');
    const data = await response.json();

    // Update stats
    document.getElementById('totalViolations').textContent = data.stats.totalViolations;
    document.getElementById('totalEmployees').textContent = data.stats.totalEmployees;
    document.getElementById('pendingViolations').textContent = data.stats.pendingViolations;
    document.getElementById('resolvedViolations').textContent = data.stats.resolvedViolations;

    // Create charts
    createViolationTypeChart(data.violationsByType);
    createViolationSeverityChart(data.violationsBySeverity);
    createViolationTimeChart(data.violationsOverTime);

    // Populate top violators
    const topViolatorsBody = document.getElementById('topViolatorsBody');
    if (data.topViolators.length === 0) {
      topViolatorsBody.innerHTML = '<tr><td colspan="3" class="text-center">No data available</td></tr>';
    } else {
      topViolatorsBody.innerHTML = data.topViolators.map((violator, index) => `
        <tr>
          <td>${index + 1}</td>
          <td>${violator.employeeName}</td>
          <td><span class="badge danger">${violator.count}</span></td>
        </tr>
      `).join('');
    }

    // Populate recent violations
    const recentViolationsBody = document.getElementById('recentViolationsBody');
    if (data.recentViolations.length === 0) {
      recentViolationsBody.innerHTML = '<tr><td colspan="6" class="text-center">No violations found</td></tr>';
    } else {
      recentViolationsBody.innerHTML = data.recentViolations.map(violation => `
        <tr>
          <td>${formatDate(violation.createdAt)}</td>
          <td>${violation.employeeName}</td>
          <td><span class="badge">${violation.violationType.replace('_', ' ')}</span></td>
          <td><span class="badge ${violation.severity}">${capitalizeFirst(violation.severity)}</span></td>
          <td><span class="badge ${violation.status}">${capitalizeFirst(violation.status)}</span></td>
          <td>${violation.recordedByName}</td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Error loading dashboard data:', error);
  }
}

// Department Data
async function loadDepartmentData() {
  try {
    const response = await fetch('/api/admin/departments/stats');
    const data = await response.json();

    const stats = data.departmentStats;

    // Update department stats
    document.getElementById('totalDepartments').textContent = stats.length;

    if (stats.length > 0) {
      const sorted = [...stats].sort((a, b) => (b.avgSafetyScore || 0) - (a.avgSafetyScore || 0));
      document.getElementById('bestDepartment').textContent = sorted[0]._id || '-';
      document.getElementById('worstDepartment').textContent = sorted[sorted.length - 1]._id || '-';

      const avgScore = stats.reduce((sum, s) => sum + (s.avgSafetyScore || 0), 0) / stats.length;
      document.getElementById('avgSafetyScore').textContent = avgScore.toFixed(1);
    }

    // Create department chart
    createDepartmentChart(stats);

    // Populate department table
    const tbody = document.getElementById('departmentStatsBody');
    if (stats.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" class="text-center">No data available</td></tr>';
    } else {
      tbody.innerHTML = stats.map(dept => {
        const score = dept.avgSafetyScore || 0;
        const status = score >= 80 ? 'success' : score >= 60 ? 'warning' : 'danger';
        const statusText = score >= 80 ? 'Good' : score >= 60 ? 'Fair' : 'Needs Attention';

        return `
          <tr>
            <td><strong>${dept._id}</strong></td>
            <td>${dept.employeeCount}</td>
            <td><span class="badge danger">${dept.totalViolations}</span></td>
            <td><span class="badge primary">${score.toFixed(1)}</span></td>
            <td><span class="badge ${status}">${statusText}</span></td>
          </tr>
        `;
      }).join('');
    }
  } catch (error) {
    console.error('Error loading department data:', error);
  }
}

// User Management
async function loadUsers() {
  try {
    const response = await fetch('/api/admin/users');
    const data = await response.json();

    const tbody = document.getElementById('usersTableBody');
    if (data.users.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No users found</td></tr>';
    } else {
      tbody.innerHTML = data.users.map(user => `
        <tr>
          <td>${user.name}</td>
          <td>${user.email}</td>
          <td><span class="badge ${user.role === 'admin' ? 'danger' : user.role === 'manager' ? 'warning' : 'primary'}">${capitalizeFirst(user.role)}</span></td>
          <td>${user.department || '-'}</td>
          <td><span class="badge ${user.isActive ? 'success' : 'danger'}">${user.isActive ? 'Active' : 'Inactive'}</span></td>
          <td>
            <button class="btn btn-primary" style="padding: 0.25rem 0.75rem; font-size: 0.875rem;" onclick="editUser('${user._id}', '${user.name}', '${user.email}', '${user.role}', ${user.isActive})">
              <i class="fas fa-edit"></i> Edit
            </button>
          </td>
        </tr>
      `).join('');
    }
  } catch (error) {
    console.error('Error loading users:', error);
  }
}

function editUser(id, name, email, role, isActive) {
  document.getElementById('editUserId').value = id;
  document.getElementById('editUserName').value = name;
  document.getElementById('editUserEmail').value = email;
  document.getElementById('editUserRole').value = role;
  document.getElementById('editUserStatus').value = isActive.toString();
  document.getElementById('userEditModal').style.display = 'block';
}

function closeUserModal() {
  document.getElementById('userEditModal').style.display = 'none';
}

// Handle user edit form
document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('userEditForm');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const userId = document.getElementById('editUserId').value;
      const role = document.getElementById('editUserRole').value;
      const isActive = document.getElementById('editUserStatus').value === 'true';

      try {
        const response = await fetch(`/api/admin/users/${userId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role, isActive })
        });

        const data = await response.json();

        if (response.ok) {
          showAlert('userAlertContainer', data.message, 'success');
          setTimeout(() => {
            closeUserModal();
            loadUsers();
          }, 1500);
        } else {
          showAlert('userAlertContainer', data.message, 'error');
        }
      } catch (error) {
        showAlert('userAlertContainer', 'Error updating user', 'error');
      }
    });
  }
});

// Training Data
async function loadTrainingData() {
  try {
    const response = await fetch('/api/admin/training/compliance');
    const data = await response.json();

    // Update training stats
    document.getElementById('totalTrainings').textContent = data.stats.total || 0;
    document.getElementById('expiringTrainings').textContent = data.stats.expiringSoon || 0;
    document.getElementById('expiredTrainings').textContent = data.stats.expired || 0;
    document.getElementById('complianceRate').textContent = (data.stats.complianceRate || 0).toFixed(1) + '%';

    // Populate training table
    const tbody = document.getElementById('trainingTableBody');
    if (data.trainings.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No training data available</td></tr>';
    } else {
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
            <td>${training.employeeName}</td>
            <td>${training.department}</td>
            <td>${training.trainingName}</td>
            <td>${formatDate(training.completedDate)}</td>
            <td>${formatDate(training.expiryDate)}</td>
            <td><span class="badge ${status}">${statusText}</span></td>
          </tr>
        `;
      }).join('');
    }
  } catch (error) {
    console.error('Error loading training data:', error);
    // Show mock data for demonstration
    document.getElementById('totalTrainings').textContent = '0';
    document.getElementById('expiringTrainings').textContent = '0';
    document.getElementById('expiredTrainings').textContent = '0';
    document.getElementById('complianceRate').textContent = '0%';
    document.getElementById('trainingTableBody').innerHTML = '<tr><td colspan="6" class="text-center">No training data available</td></tr>';
  }
}

// Equipment Data
async function loadEquipmentData() {
  try {
    const response = await fetch('/api/admin/equipment/tracking');
    const data = await response.json();

    // Update equipment stats
    document.getElementById('totalEquipment').textContent = data.stats.total || 0;
    document.getElementById('issuedEquipment').textContent = data.stats.issued || 0;
    document.getElementById('damagedEquipment').textContent = data.stats.damaged || 0;
    document.getElementById('lostEquipment').textContent = data.stats.lost || 0;

    // Populate equipment table
    const tbody = document.getElementById('equipmentTableBody');
    if (data.equipment.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" class="text-center">No equipment data available</td></tr>';
    } else {
      tbody.innerHTML = data.equipment.map(eq => {
        const statusClass = eq.status === 'issued' ? 'success' : eq.status === 'damaged' ? 'warning' : eq.status === 'lost' ? 'danger' : 'primary';

        return `
          <tr>
            <td>${eq.employeeName}</td>
            <td>${capitalizeFirst(eq.equipmentType.replace('_', ' '))}</td>
            <td>${eq.equipmentId}</td>
            <td>${formatDate(eq.issuedDate)}</td>
            <td><span class="badge ${statusClass}">${capitalizeFirst(eq.status)}</span></td>
            <td>${eq.returnDate ? formatDate(eq.returnDate) : '-'}</td>
          </tr>
        `;
      }).join('');
    }
  } catch (error) {
    console.error('Error loading equipment data:', error);
    // Show mock data for demonstration
    document.getElementById('totalEquipment').textContent = '0';
    document.getElementById('issuedEquipment').textContent = '0';
    document.getElementById('damagedEquipment').textContent = '0';
    document.getElementById('lostEquipment').textContent = '0';
    document.getElementById('equipmentTableBody').innerHTML = '<tr><td colspan="6" class="text-center">No equipment data available</td></tr>';
  }
}

function createViolationTypeChart(data) {
  const ctx = document.getElementById('violationTypeChart').getContext('2d');
  new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: data.map(d => capitalizeFirst(d._id.replace('_', ' '))),
      datasets: [{
        data: data.map(d => d.count),
        backgroundColor: [
          '#2563eb',
          '#10b981',
          '#f59e0b',
          '#ef4444',
          '#8b5cf6',
          '#ec4899'
        ]
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

function createViolationSeverityChart(data) {
  const ctx = document.getElementById('violationSeverityChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => capitalizeFirst(d._id)),
      datasets: [{
        label: 'Violations',
        data: data.map(d => d.count),
        backgroundColor: [
          '#10b981',
          '#f59e0b',
          '#ef4444',
          '#dc2626'
        ]
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
          beginAtZero: true
        }
      }
    }
  });
}

function createViolationTimeChart(data) {
  const ctx = document.getElementById('violationTimeChart').getContext('2d');
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d._id),
      datasets: [{
        label: 'Violations',
        data: data.map(d => d.count),
        borderColor: '#2563eb',
        backgroundColor: 'rgba(37, 99, 235, 0.1)',
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

function createDepartmentChart(data) {
  const ctx = document.getElementById('departmentChart').getContext('2d');
  new Chart(ctx, {
    type: 'bar',
    data: {
      labels: data.map(d => d._id),
      datasets: [
        {
          label: 'Safety Score',
          data: data.map(d => d.avgSafetyScore || 0),
          backgroundColor: '#10b981',
          yAxisID: 'y'
        },
        {
          label: 'Violations',
          data: data.map(d => d.totalViolations),
          backgroundColor: '#ef4444',
          yAxisID: 'y1'
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      scales: {
        y: {
          type: 'linear',
          display: true,
          position: 'left',
          title: {
            display: true,
            text: 'Safety Score'
          },
          max: 100
        },
        y1: {
          type: 'linear',
          display: true,
          position: 'right',
          title: {
            display: true,
            text: 'Violations'
          },
          grid: {
            drawOnChartArea: false
          }
        }
      }
    }
  });
}

function initializeMap() {
  map = L.map('map').setView([20.5937, 78.9629], 5); // India center

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors'
  }).addTo(map);
}

async function loadHeatmapData() {
  try {
    const response = await fetch('/api/admin/heatmap');
    const data = await response.json();

    if (data.heatmapData.length === 0) {
      return;
    }

    const heatData = data.heatmapData.map(point => [
      point.lat,
      point.lng,
      point.intensity
    ]);

    if (heatLayer) {
      map.removeLayer(heatLayer);
    }

    heatLayer = L.heatLayer(heatData, {
      radius: 25,
      blur: 15,
      maxZoom: 17,
      max: 4,
      gradient: {
        0.0: 'blue',
        0.5: 'yellow',
        1.0: 'red'
      }
    }).addTo(map);

    // Fit map to show all points
    if (data.heatmapData.length > 0) {
      const bounds = L.latLngBounds(data.heatmapData.map(p => [p.lat, p.lng]));
      map.fitBounds(bounds);
    }
  } catch (error) {
    console.error('Error loading heatmap data:', error);
  }
}

// Close modal when clicking outside
window.onclick = function (event) {
  const modal = document.getElementById('userEditModal');
  if (event.target == modal) {
    closeUserModal();
  }
}