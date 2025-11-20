// Load sidebar into pages
function loadSidebar() {
  fetch('sidebar.html')
    .then(response => response.text())
    .then(data => {
      document.body.insertAdjacentHTML('afterbegin', data);
      highlightCurrentPage();
      setupSidebarToggle();
    })
    .catch(error => console.error('Error loading sidebar:', error));
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

// Setup sidebar toggle functionality
function setupSidebarToggle() {
  const sidebar = document.querySelector('.sidebar');
  const sidebarClose = document.getElementById('sidebar-close');
  const mobileToggle = document.getElementById('mobile-menu-toggle');
  const mainContent = document.querySelector('.main-content');
  
  // Close sidebar (desktop)
  if (sidebarClose) {
    sidebarClose.addEventListener('click', function() {
      document.body.classList.toggle('sidebar-closed');
    });
  }
  
  // Mobile toggle
  if (mobileToggle) {
    mobileToggle.addEventListener('click', function() {
      sidebar.classList.toggle('mobile-open');
    });
  }
  
  // Close sidebar when clicking on a link (mobile)
  const navLinks = document.querySelectorAll('.nav-link');
  navLinks.forEach(link => {
    link.addEventListener('click', function() {
      if (window.innerWidth <= 768) {
        sidebar.classList.remove('mobile-open');
      }
    });
  });
}

// Load sidebar when page loads
document.addEventListener('DOMContentLoaded', loadSidebar);