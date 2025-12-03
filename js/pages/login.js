import { AuthService } from '../services/auth.js';

export function renderLogin(container) {
    container.innerHTML = `
        <div style="
            display: flex; 
            justify-content: center; 
            align-items: center; 
            height: 80vh;
            flex-direction: column;
        ">
            <div class="card" style="width: 100%; max-width: 400px; padding: 2rem;">
                <h2 style="text-align: center; margin-bottom: 1.5rem;">Invest Report Access</h2>
                <form id="login-form">
                    <div style="margin-bottom: 1rem;">
                        <label for="password" style="display: block; margin-bottom: 0.5rem; font-weight: 500;">Password</label>
                        <input type="password" id="password" class="form-control" placeholder="Enter site password" required style="width: 100%; padding: 0.75rem; border: 1px solid #e2e8f0; border-radius: 6px;">
                    </div>
                    <button type="submit" class="btn btn-primary" style="width: 100%; justify-content: center;">
                        Login
                    </button>
                    <div id="login-error" style="color: var(--danger); margin-top: 1rem; text-align: center; display: none;">
                        Incorrect password.
                    </div>
                </form>
            </div>
        </div>
    `;

    document.getElementById('login-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('login-error');
        const btn = e.target.querySelector('button');

        try {
            btn.disabled = true;
            btn.innerHTML = 'Verifying...';
            errorDiv.style.display = 'none';

            await AuthService.login(password);
            // Auth state change will trigger redirect in app.js
        } catch (error) {
            btn.disabled = false;
            btn.innerHTML = 'Login';
            errorDiv.textContent = 'Incorrect password (or user not setup).';
            errorDiv.style.display = 'block';
        }
    });
}
