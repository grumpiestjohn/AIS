const list = document.getElementById('list');
const empty = document.getElementById('empty');
const rejectModalEl = document.getElementById('rejectModal');
const rejectForm = document.getElementById('reject-form');
const rejectError = document.getElementById('reject-error');
let rejectId = null;
const meResponse = await fetch('/api/me');
const me = meResponse.ok ? await meResponse.json() : null;
if (!me || me.role !== 'admin') {
    window.location.href = '/';
}
async function loadList() {
    const response = await fetch('/api/moderation/projects');
    if (!response.ok) return;
    const projects = await response.json();
    list.innerHTML = '';
    empty.classList.toggle('d-none', projects.length > 0);
    for (const p of projects) {
        const card = document.createElement('div');
        card.className = 'card mb-3';
        card.innerHTML = `
          <div class="card-body">
            <h5 class="card-title"></h5>
            <h6 class="card-subtitle text-muted mb-2"></h6>
            <p class="card-text"></p>
            <p class="mb-3"><small></small></p>
            <button class="btn btn-success btn-sm me-2" data-action="approve">Схвалити</button>
            <button class="btn btn-danger btn-sm" data-action="reject">Відхилити</button>
          </div>`;
        card.querySelector('.card-title').textContent = p.title;
        card.querySelector('.card-subtitle').textContent = 'Автор: ' + p.author;
        card.querySelector('.card-text').textContent = p.description;
        card.querySelector('small').textContent =
            `Ціль: ${p.goal_amount} грн · Тривалість: ${p.duration_days} дн.`;
        card.querySelector('[data-action="approve"]').addEventListener('click', () => approve(p.id));
        card.querySelector('[data-action="reject"]').addEventListener('click', () => openReject(p.id));
        list.appendChild(card);
    }
}
async function approve(id) {
    const response = await fetch(`/api/moderation/projects/${id}/approve`, { method: 'POST' });
    if (!response.ok) {
        const data = await response.json();
        alert(data.error);
    }
    loadList();
}
function openReject(id) {
    rejectId = id;
    rejectForm.reset();
    rejectError.classList.add('d-none');
    bootstrap.Modal.getOrCreateInstance(rejectModalEl).show();
}
rejectForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const response = await fetch(`/api/moderation/projects/${rejectId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectForm.elements.reason.value })
    });
    const data = await response.json();
    if (!response.ok) {
        rejectError.textContent = data.error;
        rejectError.classList.remove('d-none');
        return;
    }
    bootstrap.Modal.getInstance(rejectModalEl).hide();
    loadList();
});
loadList();