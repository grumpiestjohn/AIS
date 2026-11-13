const detailEl = document.getElementById('detailModal');
const contribEl = document.getElementById('contribModal');
const detailModal = new bootstrap.Modal(detailEl);
const contribModal = new bootstrap.Modal(contribEl);
const contribForm = document.getElementById('contrib-form');
const contribError = document.getElementById('contrib-error');
const detailError = document.getElementById('d-error');
const btnContribute = document.getElementById('btn-contribute');
const btnCloseProject = document.getElementById('btn-close-project');
const btnRemove = document.getElementById('btn-remove');
const badges = {
    pending:  { text: 'На розгляді', cls: 'bg-warning text-dark' },
    active:   { text: 'Активний',    cls: 'bg-success' },
    closed:   { text: 'Закритий',    cls: 'bg-secondary' },
    rejected: { text: 'Відхилено',   cls: 'bg-danger' },
    removed:  { text: 'Вилучено',    cls: 'bg-dark' }
};
function fmtDate(text) {
    return new Date(text.replace(' ', 'T') + 'Z').toLocaleDateString('uk-UA');
}
function fmtDateTime(text) {
    return new Date(text.replace(' ', 'T') + 'Z').toLocaleString('uk-UA', {dateStyle: 'short', timeStyle: 'short'});
}
let current = null;
let me = null;
document.addEventListener('click', (event) => {
    const card = event.target.closest('[data-project-id]');
    if (card) openProject(card.dataset.projectId);
});
async function openProject(id) {
    detailError.classList.add('d-none');
    const response = await fetch(`/api/projects/${id}`);
    if (!response.ok) {
        const data = await response.json();
        alert(data.error);
        return;
    }
    const p = await response.json();
    const meResponse = await fetch('/api/me');
    me = meResponse.ok ? await meResponse.json() : null;
    const isOwner = me !== null && me.id === p.creator_id;
    const isModerator = me !== null && me.role === 'moderator';
    const percent = Math.min(100, Math.round(p.curr_amount / p.goal_amount * 100));
    document.getElementById('d-status').textContent = badges[p.status].text;
    document.getElementById('d-status').className = 'badge mb-1 ' + badges[p.status].cls;
    document.getElementById('d-title').textContent = p.title;
    document.getElementById('d-author').textContent = 'Автор: ' + p.author;
    document.getElementById('d-description').textContent = p.description;
    document.getElementById('d-bar').style.width = percent + '%';
    document.getElementById('d-amounts').textContent =
        `${p.curr_amount} / ${p.goal_amount} грн (${percent}%)`;
    document.getElementById('d-end').textContent =
        p.status === 'active' ? 'Збір до ' + fmtDate(p.end_date)
        : p.status === 'closed' ? 'Збір завершено'
        : '';
    document.getElementById('d-count').textContent = 'Внесків: ' + p.contributions_count;
    const contribList = document.getElementById('d-contribs');
    contribList.innerHTML = '';
    if (p.contributions.length === 0) {
        const li = document.createElement('li');
        li.className = 'text-muted';
        li.textContent = 'Поки що немає внесків.';
        contribList.appendChild(li);
    }
    for (const c of p.contributions) {
        const li = document.createElement('li');
        li.textContent =
            `${fmtDateTime(c.contr_date)}: ${c.username ?? 'Анонімний користувач'} - ${c.amount} грн`;
        contribList.appendChild(li);
    }
    btnContribute.classList.toggle('d-none', !(p.status === 'active' && !isOwner));
    btnCloseProject.classList.toggle('d-none', !(p.status === 'active' && isOwner));
    btnRemove.classList.toggle('d-none',
        !(isModerator && (p.status === 'active' || p.status === 'closed')));
    current = p;
    detailModal.show();
}
btnContribute.addEventListener('click', () => {
    if (!me) {
        window.location.href = '/auth.html';   // гість спершу входить
        return;
    }
    contribForm.reset();
    contribError.classList.add('d-none');
    detailEl.addEventListener('hidden.bs.modal', () => contribModal.show(), { once: true });
    detailModal.hide();
});
contribEl.addEventListener('hidden.bs.modal', () => {
    if (current) detailModal.show();
});
contribForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    contribError.classList.add('d-none');
    const response = await fetch(`/api/projects/${current.id}/contributions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            amount: Number(contribForm.elements.amount.value),
            is_anon: contribForm.elements.is_anon.checked
        })
    });
    const data = await response.json();
    if (!response.ok) {
        contribError.textContent = data.error;
        contribError.classList.remove('d-none');
        return;
    }
    alert('Дякуємо за внесок!');
    window.location.reload();
});
async function runAction(url) {
    const response = await fetch(url, {method: 'POST'});
    const data = await response.json();
    if (!response.ok) {
        detailError.textContent = data.error;
        detailError.classList.remove('d-none');
        return;
    }
    window.location.reload();
}
btnCloseProject.addEventListener('click', () => {
    if (confirm('Закрити збір достроково? Це не можна скасувати.')) {
        runAction(`/api/projects/${current.id}/close`);
    }
});
btnRemove.addEventListener('click', () => {
    if (confirm('Вилучити проєкт і видалити всі його внески? Це не можна скасувати.')) {
        runAction(`/api/projects/${current.id}/remove`);
    }
});