import { api } from './services/api.js';

const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const alertBox = document.getElementById('errorAlert');
        alertBox.classList.add('d-none');

        const payload = {
            email: document.getElementById('email').value.trim(),
            password: document.getElementById('password').value
        };

        try {
            const res = await api.post('/auth/login', payload);
            if (res.data.user.role === 'admin') {
                window.location.href = 'admin-dashboard.html';
            } else {
                window.location.href = 'index.html';
            }
        } catch (error) {
            alertBox.textContent = error.message;
            alertBox.classList.remove('d-none');
        }
    });
}

const registerForm = document.getElementById('registerForm');
if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const alertBox = document.getElementById('errorAlert');
        alertBox.classList.add('d-none');

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
            await api.post('/auth/register', payload);
            window.location.href = 'login.html';
        } catch (error) {
            alertBox.textContent = error.message;
            alertBox.classList.remove('d-none');
        }
    });
}

const googleBtn = document.getElementById('googleSignInBtn');
if (googleBtn) {
    googleBtn.addEventListener('click', async () => {
        try {
            const res = await api.get('/auth/google/url');
            window.location.href = res.data.url;
        } catch (error) {
            console.error(error.message);
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
            window.location.href = 'index.html';
        } catch (error) {
            alertBox.textContent = error.message;
            alertBox.classList.remove('d-none');
        }
    });
}