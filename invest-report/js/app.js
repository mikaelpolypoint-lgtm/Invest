import { renderDashboard } from './pages/dashboard.js';
import { renderInitiatives } from './pages/initiatives.js';
import { renderLogin } from './pages/login.js';
import { AuthService } from './services/auth.js';

const routes = {
    'dashboard': renderDashboard,
    'initiatives': renderInitiatives,
    'login': renderLogin // Add login to routes for potential direct access, though auth check will override
};

const DEFAULT_PAGE = 'dashboard';
let currentUser = null;

// Initialize App
document.addEventListener('DOMContentLoaded', () => {
    // Listen for Auth State
    AuthService.onAuthStateChanged((user) => {
        currentUser = user;
        handleRoute();
        updateNavigation();
    });

    // Handle Navigation
    window.addEventListener('hashchange', handleRoute);
});

function handleRoute() {
    const container = document.getElementById('page-container');
    const headerActions = document.getElementById('header-actions');

    // Clear previous content
    container.innerHTML = '';
    headerActions.innerHTML = '';

    // Check Auth
    if (!currentUser) {
        renderLogin(container);
        return;
    }

    // Get Page from Hash
    const hash = window.location.hash.slice(1) || DEFAULT_PAGE;
    const renderFunction = routes[hash] || routes[DEFAULT_PAGE];

    // Update Active Link
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === `#${hash}`) {
            link.classList.add('active');
        }
    });

    // Render Page
    renderFunction(container, headerActions);
}

function updateNavigation() {
    const nav = document.querySelector('.nav-links');
    const userInfo = document.querySelector('.user-info');

    if (currentUser) {
        nav.style.display = 'flex';
        userInfo.innerHTML = `
            <button id="logout-btn" class="btn btn-secondary" style="padding: 4px 12px; font-size: 0.8rem;">Logout</button>
        `;
        document.getElementById('logout-btn').addEventListener('click', () => AuthService.logout());
    } else {
        nav.style.display = 'none';
        userInfo.innerHTML = '';
    }
}

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

init();
