import { renderDashboard } from './pages/dashboard.js';
import { renderInitiatives } from './pages/initiatives.js';

const routes = {
    'dashboard': renderDashboard,
    'initiatives': renderInitiatives
};

const DEFAULT_PAGE = 'dashboard';

function init() {
    window.addEventListener('hashchange', handleRoute);

    // Initial route
    handleRoute();
}

function handleRoute() {
    let hash = window.location.hash.slice(1); // Remove #

    if (!hash) {
        window.location.hash = DEFAULT_PAGE;
        return;
    }

    const page = hash.split('/')[0] || DEFAULT_PAGE;

    // Update Sidebar
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.toggle('active', link.dataset.page === page);
    });

    // Render
    const container = document.getElementById('page-container');
    const title = document.getElementById('page-title');
    const headerActions = document.getElementById('header-actions');

    // Clear previous content
    container.innerHTML = '<div class="loading-spinner">Loading...</div>';
    headerActions.innerHTML = '';

    if (routes[page]) {
        title.textContent = capitalize(page);
        routes[page](container, headerActions);
    } else {
        container.innerHTML = '<h1>404 - Page Not Found</h1>';
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

init();
