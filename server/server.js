const express = require('express');
const session = require('express-session');
const db = require('./database/db');
const bcrypt = require('bcrypt');
const app = express();


function requireLogin(req, res, next) {
  if (!req.session.user) {
    return res.status(401).json({error: 'Спершу увійдіть.'});
  }
  next();
}
function requireAdministrator(req, res, next) {
  if (req.session.user.role !== 'admin') {
    return res.status(403).json({ error: 'Недостатньо прав.' });
  }
  next();
}
function closeExpiredProjects() {
  db.prepare(`
    UPDATE projects
    SET status = 'closed'
    WHERE status = 'active' AND datetime(start_date, '+' || duration_days || ' days') < CURRENT_TIMESTAMP
  `).run();
}
app.use(express.json());
app.use(express.static(__dirname + '/../public'));
app.use(session({
  secret: '(£3e0aM_6!45v{mr[<7h:dl2TFHM-]N_[*vp)g>bSFkHZ65Hn>',
  resave: false,
  saveUninitialized: false,
  cookie: {httpOnly: true, maxAge: 86400000}
}));
app.use('/api', (req, res, next) => {
  closeExpiredProjects();
  next();
});
app.get('/api/projects', (req, res) => {
  const projects = db.prepare(`
  SELECT id, title, description, goal_amount, curr_amount,
  datetime(start_date, '+' || duration_days || ' days') AS end_date
  FROM projects
  WHERE status = 'active'
  ORDER BY id DESC
  `).all();
  res.json(projects);
});
app.get('/api/projects/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({error: 'Некоректний код проєкту.'});
  }
  const project = db.prepare(`
    SELECT p.id, p.creator_id, u.username AS author, p.title, p.description,
    p.goal_amount, p.curr_amount, p.status, p.reject_reason,
    datetime(p.start_date, '+' || p.duration_days || ' days') AS end_date,
    (SELECT COUNT(*) FROM contributions c WHERE c.project_id = p.id) AS contributions_count
    FROM projects p
    JOIN users u ON u.id = p.creator_id
    WHERE p.id = ?
  `).get(id);
  const viewer = req.session.user;
  const isOwner = viewer && project && viewer.id === project.creator_id;
  const isModerator = viewer && viewer.role === 'moderator';
  if (!project || (project.status !== 'active' && !isOwner && !isModerator)) {
    return res.status(404).json({error: 'Проєкт не знайдено.'});
  }
  project.contributions = db.prepare(`
    SELECT username, amount, contr_date
    FROM project_contributions
    WHERE project_id = ?
    ORDER BY id DESC
    LIMIT 50
  `).all(id);
  res.json(project);
});
app.get('/api/me', (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({error: 'Профіль відсутній.'});
  }
  res.json(req.session.user);
});
app.get('/api/me/projects', requireLogin, (req, res) => {
  const projects = db.prepare(`
    SELECT id, title, description, goal_amount, curr_amount, duration_days,
          status, reject_reason, start_date,
          datetime(start_date, '+' || duration_days || ' days') AS end_date
    FROM projects
    WHERE creator_id = ?
    ORDER BY id DESC
  `).all(req.session.user.id);
  res.json(projects);
});
app.get('/api/moderation/projects', requireLogin, requireAdministrator, (req, res) => {
  const projects = db.prepare(`
    SELECT p.id, p.title, p.description, p.goal_amount, p.duration_days,
            p.post_date, u.username AS author
      FROM projects p
      JOIN users u ON u.id = p.creator_id
     WHERE p.status = 'pending'
     ORDER BY p.post_date
  `).all();
  res.json(projects);
});
app.post('/api/register', async (req, res) => {
  const {username, password} = req.body;
  if (typeof username !== 'string' || username.trim().length < 3) {
    return res.status(400).json({error: 'Логін має містити щонайменше 3 символи.'});
  }
  if (typeof password !== 'string' || password.length < 6) {
    return res.status(400).json({error: 'Пароль має містити щонайменше 6 символів.'});
  }
  const hash = await bcrypt.hash(password, 10);
  try {
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run(username.trim(), hash);
    res.json({ok: true});
  } catch (err) {
  if (String(err.message).includes('UNIQUE')) {
    return res.status(409).json({error: 'Цей логін вже зайнятий.'});
  }
  console.error(err);
  res.status(500).json({error: 'Помилка сервера.'});
  }
});
app.post('/api/login', async (req, res) => {
  const {username, password} = req.body;
  if (typeof username !== 'string' || typeof password !== 'string') {
    return res.status(400).json({error: 'Введіть логін і пароль.'});
  }
  const user = db.prepare('SELECT id, username, password_hash, role FROM users WHERE username = ?').get(username.trim());
  const ok = user && await bcrypt.compare(password, user.password_hash);
  if (!ok) {
    return res.status(401).json({error: 'Невірний логін або пароль.'});
  }
  req.session.user = {id: user.id, username: user.username, role: user.role};
  res.json({ok: true, username: user.username, role: user.role});
});
app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ok: true});
  });
});
app.post('/api/projects', requireLogin, (req, res) => {
  const {title, description, goal_amount, duration_days} = req.body;
  if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 100) {
    return res.status(400).json({error: 'Назва має містити від 3 до 100 символів.'});
  }
  if (typeof description !== 'string' || description.trim().length === 0) {
    return res.status(400).json({error: 'Додайте опис проєкту.'});
  }
  if (!Number.isInteger(goal_amount) || goal_amount <= 0) {
    return res.status(400).json({error: 'Цільова сума має бути додатним цілим числом.'});
  }
  if (!Number.isInteger(duration_days) || duration_days < 1 || duration_days > 60) {
    return res.status(400).json({error: 'Тривалість збору: від 1 до 60 днів.'});
  }
  try {
    const result = db.prepare(`
      INSERT INTO projects (creator_id, title, description, goal_amount, duration_days, status, post_date)
      VALUES (?, ?, ?, ?, ?, 'pending', CURRENT_TIMESTAMP)
    `).run(req.session.user.id, title.trim(), description.trim(), goal_amount, duration_days);
    res.json({ok: true, id: result.lastInsertRowid});
  } catch (err) {
    console.error(err);
    if (err.message.includes('У вас вже є проєкт на розгляді.')) {
      return res.status(409).json({
        error: 'У вас уже є проєкт на розгляді. Дочекайтеся рішення модератора.'
      });
    }
    res.status(500).json({error: 'Не вдалося створити проєкт.'});
  }
});
app.post('/api/moderation/projects/:id/approve', requireLogin, requireAdministrator, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({error: 'Некоректний код проєкту.'});
  }
  try {
    const result = db.prepare(
      `UPDATE projects SET status = 'active' WHERE id = ? AND status = 'pending'`
    ).run(id);

    if (result.changes === 0) {
      return res.status(404).json({error: 'Заявку не знайдено або вона вже опрацьована.'});
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({error: 'Не вдалося схвалити проєкт.'});
  }
});
app.post('/api/moderation/projects/:id/reject', requireLogin, requireAdministrator, (req, res) => {
  const id = Number(req.params.id);
  const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
  if (!Number.isInteger(id)) {
    return res.status(400).json({error: 'Некоректний код проєкту.'});
  }
  if (reason.length === 0) {
    return res.status(400).json({error: 'Вкажіть причину відхилення.'});
  }
  try {
    const result = db.prepare(
      `UPDATE projects SET status = 'rejected', reject_reason = ? WHERE id = ? AND status = 'pending'`
    ).run(reason, id);

    if (result.changes === 0) {
      return res.status(404).json({error: 'Заявку не знайдено або вона вже опрацьована.'});
    }
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({error: 'Не вдалося відхилити проєкт.'});
  }
});
app.post('/api/projects/:id/contributions', requireLogin, (req, res) => {
  const id = Number(req.params.id);
  const { amount, is_anon } = req.body;
  if (!Number.isInteger(id)) {
    return res.status(400).json({ error: 'Некоректний код проєкту.' });
  }
  if (!Number.isInteger(amount) || amount <= 0) {
    return res.status(400).json({error: 'Сума має бути додатним цілим числом.'});
  }
  try {
    db.prepare(`
      INSERT INTO contributions (user_id, project_id, amount, is_anon)
      VALUES (?, ?, ?, ?)
    `).run(req.session.user.id, id, amount, is_anon === true ? 1 : 0);
    res.json({ ok: true });
  } catch (err) {
    console.error(err);
    if (err.errcode === 1811) {   // це спрацював ваш тригер: показуємо його текст
      return res.status(400).json({ error: err.message });
    }
    res.status(500).json({error: 'Не вдалося зробити внесок.'});
  }
});
app.post('/api/projects/:id/close', requireLogin, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({error: 'Некоректний код проєкту.'});
  }
  const result = db.prepare(`
    UPDATE projects
    SET status = 'closed'
    WHERE id = ? AND creator_id = ? AND status = 'active'
  `).run(id, req.session.user.id);
  if (result.changes === 0) {
    return res.status(404).json({error: 'Проєкт не знайдено, він не ваш або вже не активний.'});
  }
  res.json({ok: true});
});
app.post('/api/projects/:id/remove', requireLogin, requireAdministrator, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    return res.status(400).json({error: 'Некоректний код проєкту.'});
  }
  try {
    db.exec('BEGIN');
    const result = db.prepare(`
      UPDATE projects SET status = 'removed', curr_amount = 0
       WHERE id = ? AND status IN ('active', 'closed')
    `).run(id);
    if (result.changes === 0) {
      db.exec('ROLLBACK');
      return res.status(404).json({error: 'Проєкт не знайдено або його вже вилучено.'});
    }
    db.prepare('DELETE FROM contributions WHERE project_id = ?').run(id);
    db.exec('COMMIT');
    res.json({ok: true});
  } catch (err) {
    db.exec('ROLLBACK');
    console.error(err);
    res.status(500).json({error: 'Не вдалося вилучити проєкт.'});
  }
});
app.listen(3000, () => {
  console.log('Server: http://localhost:3000');
});
