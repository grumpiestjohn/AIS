const fab = document.getElementById('fab');
const form = document.getElementById('project-form');
const errorBox = document.getElementById('project-error');
const modalEl = document.getElementById('projectModal');
const me = await fetch('/api/me');
if (me.ok) {
    fab.classList.remove('d-none');
}
form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorBox.classList.add('d-none');
    const body = {
        title: form.elements.title.value,
        description: form.elements.description.value,
        goal_amount: Number(form.elements.goal_amount.value),
        duration_days: Number(form.elements.duration_days.value)
    };
    try {
        const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
        });
        const data = await response.json();
        if (!response.ok) {
            errorBox.textContent = data.error;
            errorBox.classList.remove('d-none');
            return;
        }
        bootstrap.Modal.getInstance(modalEl).hide();
        form.reset();
        alert('Проєкт надіслано на розгляд модератору.');
        window.location.reload();
    } catch (err) {
        errorBox.textContent = err.message;
        errorBox.classList.remove('d-none');
        console.error(err);
    }
});