// Common functions
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
}

function capitalizeFirst(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Theme Toggling Logic
document.addEventListener('DOMContentLoaded', () => {
  const themeToggle = document.getElementById('themeToggle');
  const html = document.documentElement;

  // Check local storage or system preference
  const savedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

  // Default to dark if no preference, or respect saved/system
  const initialTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');

  // Apply theme
  html.setAttribute('data-theme', initialTheme);
  updateThemeIcon(initialTheme);

  if (themeToggle) {
    themeToggle.addEventListener('click', (e) => {
      e.preventDefault();
      const currentTheme = html.getAttribute('data-theme');
      const newTheme = currentTheme === 'light' ? 'dark' : 'light';

      html.setAttribute('data-theme', newTheme);
      localStorage.setItem('theme', newTheme);
      updateThemeIcon(newTheme);
    });
  }
});

function updateThemeIcon(theme) {
  const themeToggle = document.getElementById('themeToggle');
  if (!themeToggle) return;

  const icon = themeToggle.querySelector('i');
  if (theme === 'dark') {
    icon.className = 'fas fa-sun';
    icon.style.color = '#ffd700'; // Gold sun
  } else {
    icon.className = 'fas fa-moon';
    icon.style.color = '#ffffff'; // White moon
  }
}

// Logout functionality
const logoutBtn = document.getElementById('logoutBtn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await fetch('/api/auth/logout');
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  });
}

// Check authentication
async function checkAuth() {
  try {
    const response = await fetch('/api/auth/current');
    if (!response.ok) {
      window.location.href = '/login';
    }
    return await response.json();
  } catch (error) {
    window.location.href = '/login';
  }
}