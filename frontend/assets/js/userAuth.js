const landingEmail = new URLSearchParams(window.location.search).get('email');
if (landingEmail && document.getElementById('email')) {
    document.getElementById('email').value = landingEmail;
}
import { api } from './services/api.js';

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const alertBox = document.getElementById('errorAlert');
        alertBox.classList.add('d-none');

        const submitButton = e.currentTarget.querySelector('[type=submit]');
        if (submitButton.disabled) return;
        submitButton.disabled = true;
        const payload = {
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value
        };

        try {
            const res = await api.post('/auth/login', payload);
            if (res.data.user.role === 'admin') {
                window.location.href = 'admin/index.html';
            } else {
                window.location.replace('products.html');
            }
        } catch (error) {
            const fieldErrors = error.data?.errors;
            alertBox.textContent = fieldErrors ? Object.values(fieldErrors).join(' ') : error.message;
            alertBox.classList.remove('d-none');
        } finally {
            submitButton.disabled = false;
        }
    });
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const alertBox = document.getElementById('errorAlert');
        alertBox.classList.add('d-none');

        const submitButton = e.currentTarget.querySelector('[type=submit]');
        if (submitButton.disabled) return;
        submitButton.disabled = true;
        const payload = {
            name: document.getElementById('name').value.trim(),
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value,
            confirm_password: document.getElementById('confirmPassword').value,
            phone: document.getElementById('phone').value.trim(),
            gender: document.getElementById('gender').value,
            address: document.getElementById('address').value.trim()
        };

        try {
            const result = await api.post('/auth/register', payload);
            if (!result?.data?.user) throw new Error('Account created but the session could not be confirmed. Please log in.');
            window.location.replace('products.html');
        } catch (error) {
            const fieldErrors = error.data?.errors;
            alertBox.textContent = fieldErrors ? Object.values(fieldErrors).join(' ') : error.message;
            alertBox.classList.remove('d-none');
        } finally {
            submitButton.disabled = false;
        }
    });
}

const googleBtn = document.getElementById('googleSignInBtn');
if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
        if (googleBtn.disabled) return;
        googleBtn.disabled = true;
        try {
            const res = await api.get('/auth/google/url');
            const destination = res.data?.url;
            if (typeof destination !== 'string' || !destination.startsWith('https://accounts.google.com/')) {
                throw new Error('Invalid Google authentication URL.');
            }
            window.location.assign(destination);
        } catch (error) {
            googleBtn.disabled = false;
            const box = document.getElementById('errorAlert');
            if (box) { box.textContent = error.message; box.classList.remove('d-none'); }
        }
    });
}

const completeProfileForm = document.getElementById('completeProfileForm');
if (completeProfileForm) {
    completeProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const alertBox = document.getElementById('errorAlert');
        alertBox.classList.add('d-none');

        const payload = {
            phone: document.getElementById('phone').value.trim(),
            gender: document.getElementById('gender').value,
            address: document.getElementById('address').value.trim()
        };

        try {
            await api.post('/auth/complete-profile', payload);
            window.location.replace('products.html');
        } catch (error) {
            const fieldErrors = error.data?.errors;
            alertBox.textContent = fieldErrors ? Object.values(fieldErrors).join(' ') : error.message;
            alertBox.classList.remove('d-none');
        }
    });
}