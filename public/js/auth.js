const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');

document.getElementById('show-register').addEventListener('click', () => {
    loginForm.classList.add('d-none');
    registerForm.classList.remove('d-none');
});
document.getElementById('show-login').addEventListener('click', () => {
    registerForm.classList.add('d-none');
    loginForm.classList.remove('d-none');
});
loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = loginForm.elements.username.value;
    const password = loginForm.elements.password.value;
    const response = await fetch('/api/login', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ username, password })
    });
    const data = await response.json();
    if (!response.ok) {
        alert(data.error);
        return;
    }
    window.location.href = '/';
});
registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const username = registerForm.elements.username.value;
    const password = registerForm.elements.password.value;
    const password2 = registerForm.elements.password2.value;
    if (password !== password2) {
        alert('Паролі не збігаються.');
        return;
    }
    const response = await fetch('/api/register', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({username, password})
    });
    const data = await response.json();
    if (!response.ok) {
        alert(data.error);
        return;
    }
    alert('Акаунт створено. Тепер увійдіть.');
    registerForm.classList.add('d-none');
    loginForm.classList.remove('d-none');
});