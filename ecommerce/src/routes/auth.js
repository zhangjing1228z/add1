const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../db');

const router = express.Router();

// 登录（客户 / 商户共用，按角色校验）
router.post('/login', (req, res) => {
  const { username, password, role } = req.body || {};
  if (!username || !password || !role) {
    return res.status(400).json({ error: '请填写完整的登录信息' });
  }
  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);
  if (!user || !bcrypt.compareSync(password, user.password)) {
    return res.status(401).json({ error: '用户名或密码错误' });
  }
  if (user.role !== role) {
    return res.status(403).json({
      error: role === 'merchant' ? '该账号不是商户账号，请从客户入口登录' : '该账号是商户账号，请从商户后台登录'
    });
  }
  req.session.user = { id: user.id, username: user.username, role: user.role, shop_name: user.shop_name };
  res.json({ ok: true, role: user.role });
});

// 客户注册
router.post('/register', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) return res.status(400).json({ error: '请填写用户名和密码' });
  if (String(password).length < 6) return res.status(400).json({ error: '密码至少6位' });
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: '用户名已被占用' });
  const r = db.prepare('INSERT INTO users (username,password,role,balance) VALUES (?,?,?,1000)')
              .run(username, bcrypt.hashSync(password, 10), 'customer');
  req.session.user = { id: r.lastInsertRowid, username, role: 'customer', shop_name: null };
  res.json({ ok: true });
});

// 商户注册（开店）
router.post('/register-merchant', (req, res) => {
  const { username, password, shop_name } = req.body || {};
  if (!username || !password || !shop_name) return res.status(400).json({ error: '请填写用户名、密码和店铺名称' });
  if (String(password).length < 6) return res.status(400).json({ error: '密码至少6位' });
  const exists = db.prepare('SELECT id FROM users WHERE username = ?').get(username);
  if (exists) return res.status(409).json({ error: '用户名已被占用' });
  const r = db.prepare('INSERT INTO users (username,password,role,shop_name) VALUES (?,?,?,?)')
              .run(username, bcrypt.hashSync(password, 10), 'merchant', shop_name);
  req.session.user = { id: r.lastInsertRowid, username, role: 'merchant', shop_name };
  res.json({ ok: true });
});

router.post('/logout', (req, res) => {
  req.session.destroy(() => res.json({ ok: true }));
});

router.get('/me', (req, res) => {
  const u = req.session.user;
  if (!u) return res.json(null);
  const full = db.prepare('SELECT id,username,role,shop_name,balance FROM users WHERE id=?').get(u.id);
  res.json(full || null);
});

module.exports = router;
