const express = require('express');
const db = require('../db');

const router = express.Router();

// ---------- 客户下单（购物车结算） ----------
router.post('/', (req, res) => {
  const u = req.session.user;
  if (!u || u.role !== 'customer') return res.status(401).json({ error: '请先以客户身份登录' });

  const { items } = req.body || {}; // [{productId, quantity}]
  if (!Array.isArray(items) || items.length === 0) return res.status(400).json({ error: '购物车为空' });

  const buy = db.transaction(() => {
    // 校验并锁定商品信息
    let total = 0;
    const lines = [];
    for (const it of items) {
      const qty = parseInt(it.quantity, 10);
      if (!(qty > 0)) throw new Error('购买数量必须大于0');
      const p = db.prepare("SELECT * FROM products WHERE id=? AND status='on'").get(it.productId);
      if (!p) throw new Error(`商品不存在或已下架 (ID:${it.productId})`);
      if (p.stock < qty) throw new Error(`「${p.name}」库存不足，仅剩 ${p.stock} 件`);
      total += p.price * qty;
      lines.push({ p, qty });
    }
    // 校验余额
    const bal = db.prepare('SELECT balance FROM users WHERE id=?').get(u.id).balance;
    if (bal < total) throw new Error(`余额不足：需 ¥${total.toFixed(2)}，当前余额 ¥${bal.toFixed(2)}`);

    // 扣款 + 扣库存 + 商户入账
    db.prepare('UPDATE users SET balance = balance - ? WHERE id=?').run(total, u.id);
    for (const { p, qty } of lines) {
      db.prepare('UPDATE products SET stock = stock - ? WHERE id=?').run(qty, p.id);
      db.prepare('UPDATE users SET balance = balance + ? WHERE id=?').run(p.price * qty, p.merchant_id);
    }
    const orderId = db.prepare('INSERT INTO orders (user_id,total) VALUES (?,?)').run(u.id, total).lastInsertRowid;
    const insItem = db.prepare('INSERT INTO order_items (order_id,product_id,product_name,price,quantity) VALUES (?,?,?,?,?)');
    for (const { p, qty } of lines) insItem.run(orderId, p.id, p.name, p.price, qty);
    return orderId;
  });

  try {
    const id = buy();
    res.json({ ok: true, orderId: id });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ---------- 我的订单（客户） ----------
router.get('/mine', (req, res) => {
  const u = req.session.user;
  if (!u || u.role !== 'customer') return res.status(401).json({ error: '请先以客户身份登录' });
  const orders = db.prepare('SELECT * FROM orders WHERE user_id=? ORDER BY id DESC').all(u.id);
  const getItems = db.prepare('SELECT * FROM order_items WHERE order_id=?');
  orders.forEach(o => o.items = getItems.all(o.id));
  res.json(orders);
});

// ---------- 店铺销售统计（商户） ----------
router.get('/shop-stats', (req, res) => {
  const u = req.session.user;
  if (!u || u.role !== 'merchant') return res.status(401).json({ error: '请先以商户身份登录' });
  const row = db.prepare(`
    SELECT IFNULL(SUM(oi.price*oi.quantity),0) AS revenue,
           IFNULL(SUM(oi.quantity),0) AS units,
           COUNT(DISTINCT o.id) AS orders
    FROM order_items oi
    JOIN orders o ON o.id = oi.order_id
    JOIN products p ON p.id = oi.product_id
    WHERE p.merchant_id = ?`).get(u.id);
  const balance = db.prepare('SELECT balance FROM users WHERE id=?').get(u.id).balance;
  res.json({ ...row, balance });
});

module.exports = router;
