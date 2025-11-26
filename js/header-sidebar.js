// Load header and sidebar into pages
function loadHeaderSidebar() {
  fetch('../header-sidebar.html')
    .then(response => response.text())
    .then(data => {
      // Insert at the beginning of body
      document.body.insertAdjacentHTML('afterbegin', data);
      // Initialize functionality
      setupSidebar();
    })
    .catch(error => console.error('Error loading header/sidebar:', error));
}

// Setup sidebar functionality
function setupSidebar() {
  const sidebar = document.getElementById('sidebar');
  const sidebarToggle = document.getElementById('sidebar-toggle');
  const sidebarClose = document.getElementById('sidebar-close');
  const sidebarOverlay = document.getElementById('sidebar-overlay');
  
  // Check saved state
  const isSidebarOpen = localStorage.getItem('sidebarOpen') === 'true';
  if (isSidebarOpen) {
    openSidebar();
  }
  
  // Toggle sidebar
  if (sidebarToggle) {
    sidebarToggle.addEventListener('click', function() {
      if (sidebar.classList.contains('open')) {
        closeSidebar();
      } else {
        openSidebar();
      }
    });
  }
  
  // Close sidebar
  if (sidebarClose) {
    sidebarClose.addEventListener('click', closeSidebar);
  }
  
  // Close sidebar when clicking overlay
  if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
  }
  
  // Close sidebar when clicking on a link
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', closeSidebar);
  });
  
  function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
    localStorage.setItem('sidebarOpen', 'true');
  }
  
  function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
    localStorage.setItem('sidebarOpen', 'false');
  }
  
  highlightCurrentPage();
}

// Highlight current page in sidebar
function highlightCurrentPage() {
  const currentPage = window.location.pathname.split('/').pop();
  const navLinks = document.querySelectorAll('.nav-link');
  
  navLinks.forEach(link => {
    if (link.getAttribute('href') === currentPage) {
      link.classList.add('active');
    }
  });
}

// Initialize when page loads
document.addEventListener('DOMContentLoaded', loadHeaderSidebar);