const express = require('express');
const db = require('../db');

const router = express.Router();

// 权限中间件
function requireRole(role) {
  return (req, res, next) => {
    const u = req.session.user;
    if (!u) return res.status(401).json({ error: '请先登录' });
    if (u.role !== role) return res.status(403).json({ error: '无权访问' });
    next();
  };
}

// ---------- 前台：商品列表（所有客户可见） ----------
router.get('/', (req, res) => {
  const { keyword, category } = req.query;
  let sql = `SELECT p.*, u.shop_name FROM products p JOIN users u ON u.id = p.merchant_id WHERE p.status = 'on'`;
  const args = [];
  if (keyword) { sql += ' AND p.name LIKE ?'; args.push(`%${keyword}%`); }
  if (category && category !== '全部') { sql += ' AND p.category = ?'; args.push(category); }
  sql += ' ORDER BY p.id DESC';
  res.json(db.prepare(sql).all(...args));
});

// 分类列表
router.get('/categories', (req, res) => {
  res.json(db.prepare("SELECT DISTINCT category FROM products WHERE status='on'").all().map(r => r.category));
});

// ---------- 后台：本商户商品管理 ----------
router.get('/mine', requireRole('merchant'), (req, res) => {
  res.json(db.prepare('SELECT * FROM products WHERE merchant_id = ? ORDER BY id DESC').all(req.session.user.id));
});

// 商品入库（新增）
router.post('/', requireRole('merchant'), (req, res) => {
  const { name, category, price, stock, description, emoji } = req.body || {};
  if (!name || price == null || stock == null) return res.status(400).json({ error: '商品名称、价格、库存必填' });
  const p = Number(price), s = parseInt(stock, 10);
  if (!(p >= 0)) return res.status(400).json({ error: '价格必须为非负数' });
  if (!(s >= 0)) return res.status(400).json({ error: '库存必须为非负整数' });
  const r = db.prepare(
    'INSERT INTO products (merchant_id,name,category,price,stock,description,emoji) VALUES (?,?,?,?,?,?,?)'
  ).run(req.session.user.id, String(name).trim(), category || '其他', p, s, description || '', emoji || '📦');
  res.json({ ok: true, id: r.lastInsertRowid });
});

// 修改商品（改价/补货入库/上下架）
router.put('/:id', requireRole('merchant'), (req, res) => {
  const prod = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if (!prod) return res.status(404).json({ error: '商品不存在' });
  if (prod.merchant_id !== req.session.user.id) return res.status(403).json({ error: '只能修改自己的商品' });
  const { name, category, price, stock, description, emoji, status } = req.body || {};
  db.prepare('UPDATE products SET name=?,category=?,price=?,stock=?,description=?,emoji=?,status=? WHERE id=?').run(
    name ?? prod.name, category ?? prod.category,
    price != null ? Number(price) : prod.price,
    stock != null ? parseInt(stock, 10) : prod.stock,
    description ?? prod.description, emoji ?? prod.emoji,
    status ?? prod.status, prod.id
  );
  res.json({ ok: true });
});

// 上架 / 下架
router.patch('/:id/toggle', requireRole('merchant'), (req, res) => {
  const prod = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if (!prod) return res.status(404).json({ error: '商品不存在' });
  if (prod.merchant_id !== req.session.user.id) return res.status(403).json({ error: '只能操作自己的商品' });
  const ns = prod.status === 'on' ? 'off' : 'on';
  db.prepare('UPDATE products SET status=? WHERE id=?').run(ns, prod.id);
  res.json({ ok: true, status: ns });
});

// 删除商品
router.delete('/:id', requireRole('merchant'), (req, res) => {
  const prod = db.prepare('SELECT * FROM products WHERE id=?').get(req.params.id);
  if (!prod) return res.status(404).json({ error: '商品不存在' });
  if (prod.merchant_id !== req.session.user.id) return res.status(403).json({ error: '只能删除自己的商品' });
  const hasItems = db.prepare('SELECT COUNT(*) c FROM order_items WHERE product_id=?').get(prod.id).c;
  if (hasItems) { // 有历史订单则仅下架
    db.prepare("UPDATE products SET status='off' WHERE id=?").run(prod.id);
    return res.json({ ok: true, offlined: true });
  }
  db.prepare('DELETE FROM products WHERE id=?').run(prod.id);
  res.json({ ok: true });
});

module.exports = router;
