const authBtn = document.getElementById('authbutton');
const usernameText = document.getElementById('username');
const modBtn = document.getElementById('modbutton');
async function updateNav() {
    const response = await fetch('/api/me');
    if (!response.ok) return;
    const user = await response.json();
    authBtn.textContent = 'Вийти';
    usernameText.textContent = `Вітаємо, ${user.username}!`;
    if (user.role === 'admin') {
        modBtn.classList.remove('d-none');
    }
    authBtn.addEventListener('click', async (event) => {
        event.preventDefault();
        await fetch('/api/logout', {method: 'POST'});
        window.location.href = '/';
    });
}
updateNav();