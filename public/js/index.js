async function loadProjects() {
    const resp = await fetch('/api/projects');
    const projects = await resp.json();
    const container = document.getElementById('projects');
    const empty = document.getElementById('empty');
    empty.classList.toggle('d-none', projects.length > 0);
    for (const p of projects) {
        const percent = Math.min(100, Math.round(p.curr_amount / p.goal_amount * 100));
        const col = document.createElement('div');
        col.className = 'col-md-4';
        col.innerHTML = `
        <div class="card h-100" data-project-id="${p.id}" style="cursor: pointer;">
            <div class="card-body">
                <h5 class="card-title"></h5>
                <p class="card-text text-truncate"></p>
                <div class="progress mb-2">
                    <div class="progress-bar" style="width: ${percent}%"></div>
                </div>
                <small>${p.curr_amount} / ${p.goal_amount} грн (${percent}%)</small><br>
                <small class="text-muted">Збір до ${formatDate(p.end_date)}</small>
            </div>
        </div>`;
        col.querySelector('.card-title').textContent = p.title;
        col.querySelector('.card-text').textContent = p.description;
        container.appendChild(col);
    }
}
loadProjects();



const statusInfo = {
    pending:  {text: 'На розгляді', cls: 'bg-warning text-dark'},
    active:   {text: 'Активний',    cls: 'bg-success'},
    closed:   {text: 'Закритий',    cls: 'bg-secondary'},
    rejected: {text: 'Відхилено',   cls: 'bg-danger'},
    removed:  {text: 'Вилучено',    cls: 'bg-dark'}
};
function formatDate(text) {
    return new Date(text.replace(' ', 'T') + 'Z').toLocaleDateString('uk-UA');
}
async function loadMyProjects() {
    const response = await fetch('/api/me/projects');
    if (!response.ok) return;
    const projects = await response.json();
    const section = document.getElementById('my-section');
    const container = document.getElementById('my-projects');
    const empty = document.getElementById('my-empty');
    section.classList.remove('d-none');
    empty.classList.toggle('d-none', projects.length > 0);
    container.innerHTML = '';
    for (const p of projects) {
        const st = statusInfo[p.status];
        const percent = Math.min(100, Math.round(p.curr_amount / p.goal_amount * 100));
        let extra = '';
        if (p.status === 'pending') {
            extra = '<small class="text-muted">Очікує рішення модератора.</small>';
        } else if (p.status === 'rejected') {
            extra = `<div class="alert alert-danger py-2 mb-0">
                       <small><strong>Причина:</strong> <span class="reason"></span></small>
                     </div>`;
        } else if (p.status === 'active' || p.status === 'closed') {
            const dateText = p.status === 'active' ? 'Збір до ' + formatDate(p.end_date) : 'Збір завершено';
            extra = `<div class="progress mb-2">
                       <div class="progress-bar" style="width: ${percent}%"></div>
                     </div>
                     <small>${p.curr_amount} / ${p.goal_amount} грн (${percent}%)</small><br>
                     <small class="text-muted">${dateText}</small>`;
        } else {
            extra = '<small class="text-muted">Проєкт вилучено.</small>';
        }
        const col = document.createElement('div');
        col.className = 'col-md-4';
        col.innerHTML = `
          <div class="card h-100" data-project-id="${p.id}" style="cursor: pointer;">
            <div class="card-body">
              <span class="badge ${st.cls} mb-2">${st.text}</span>
              <h5 class="card-title"></h5>
              <p class="card-text text-truncate"></p>
              ${extra}
            </div>
          </div>`;
        col.querySelector('.card-title').textContent = p.title;
        col.querySelector('.card-text').textContent = p.description;
        const reason = col.querySelector('.reason');
        if (reason) reason.textContent = p.reject_reason;
        container.appendChild(col);
    }
}
loadMyProjects();