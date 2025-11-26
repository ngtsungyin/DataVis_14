// Load sidebar into pages
function loadSidebar() {
  fetch('sidebar.html')
    .then(response => response.text())
    .then(data => {
      document.body.insertAdjacentHTML('afterbegin', data);
      
      // Check saved state and apply it
      const isSidebarClosed = localStorage.getItem('sidebarClosed') === 'true';
      if (isSidebarClosed) {
        document.body.classList.add('sidebar-closed');
      }
      
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
  const sidebarClose = document.getElementById('sidebar-close');
  
  // Close sidebar with persistence
  if (sidebarClose) {
    sidebarClose.addEventListener('click', function() {
      const isNowClosed = document.body.classList.toggle('sidebar-closed');
      // Save state to localStorage
      localStorage.setItem('sidebarClosed', isNowClosed);
    });
  }
}

// Load sidebar when page loads
document.addEventListener('DOMContentLoaded', loadSidebar);