import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged } from 'firebase/auth';
import { initializeApp } from 'firebase/app';

// Re-use the app instance from data.js if possible, but for now we'll re-init or just use getAuth
// Since we can't easily export 'app' from data.js without refactoring, we'll assume it's a singleton or re-init safely.
// Actually, it's better to export 'app' from a shared config file.
// For now, I'll duplicate the config to ensure it works standalone, or better:
// Let's refactor data.js to export 'app' or 'db' and we use that.
// But to avoid touching data.js too much, I'll just use the same config here.

const firebaseConfig = {
    apiKey: "AIzaSyAbxy7iOxwaaTt-uKQasKF6cjacS1YK1L0",
    authDomain: "invest-46b33.firebaseapp.com",
    projectId: "invest-46b33",
    storageBucket: "invest-46b33.firebasestorage.app",
    messagingSenderId: "38526331432",
    appId: "1:38526331432:web:8d9dfa663c6dd09ceae31d",
    measurementId: "G-SH34023SNX"
};

// Initialize Firebase (it handles multiple inits gracefully usually, or we check apps.length)
// But since we use ES modules, we should probably have a shared firebase.js.
// For speed, I'll just re-init.
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

export const AuthService = {
    login: async (password) => {
        try {
            // Hardcoded email for the "site password" experience
            const email = 'admin@invest.com';
            await signInWithEmailAndPassword(auth, email, password);
            return true;
        } catch (error) {
            console.error("Login failed:", error);
            throw error;
        }
    },

    logout: async () => {
        await signOut(auth);
    },

    onAuthStateChanged: (callback) => {
        return onAuthStateChanged(auth, callback);
    }
};
