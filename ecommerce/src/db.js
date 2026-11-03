const Database = require('better-sqlite3');
const bcrypt = require('bcryptjs');
const path = require('path');

const db = new Database(path.join(__dirname, 'shop.db'));
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// ---------- 建表 ----------
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password TEXT NOT NULL,
  role TEXT NOT NULL CHECK(role IN ('customer','merchant')),
  shop_name TEXT,
  balance REAL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS products (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  merchant_id INTEGER NOT NULL REFERENCES users(id),
  name TEXT NOT NULL,
  category TEXT DEFAULT '其他',
  price REAL NOT NULL CHECK(price >= 0),
  stock INTEGER NOT NULL DEFAULT 0 CHECK(stock >= 0),
  description TEXT DEFAULT '',
  emoji TEXT DEFAULT '📦',
  status TEXT DEFAULT 'on' CHECK(status IN ('on','off')),
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL REFERENCES users(id),
  total REAL NOT NULL,
  status TEXT DEFAULT '已完成' ,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

CREATE TABLE IF NOT EXISTS order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL REFERENCES orders(id),
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name TEXT NOT NULL,
  price REAL NOT NULL,
  quantity INTEGER NOT NULL
);
`);

// ---------- 种子数据 ----------
const userCount = db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
if (userCount === 0) {
  const insUser = db.prepare('INSERT INTO users (username,password,role,shop_name,balance) VALUES (?,?,?,?,?)');
  const insProd = db.prepare('INSERT INTO products (merchant_id,name,category,price,stock,description,emoji) VALUES (?,?,?,?,?,?,?)');

  const m1 = insUser.run('merchant1', bcrypt.hashSync('123456', 10), 'merchant', '优选数码店', 0).lastInsertRowid;
  const m2 = insUser.run('merchant2', bcrypt.hashSync('123456', 10), 'merchant', '生活家居馆', 0).lastInsertRowid;
  insUser.run('customer1', bcrypt.hashSync('123456', 10), 'customer', null, 1000);
  insUser.run('alice',    bcrypt.hashSync('123456', 10), 'customer', null, 500);

  const prods = [
    [m1, '无线蓝牙耳机 Pro', '数码', 299.00, 50, '主动降噪，续航30小时，Hi-Fi音质', '🎧'],
    [m1, '智能手表 S9', '数码', 899.00, 30, '心率血氧监测，GPS定位，50米防水', '⌚'],
    [m1, '便携充电宝 20000mAh', '数码', 129.00, 100, '22.5W快充，双向充电', '🔋'],
    [m1, '机械键盘 RGB', '数码', 459.00, 25, '青轴手感，全键无冲，RGB背光', '⌨️'],
    [m2, '北欧风陶瓷马克杯', '家居', 39.90, 200, '400ml大容量，微波炉可用', '☕'],
    [m2, '记忆棉枕头', '家居', 159.00, 80, '护颈慢回弹，可水洗枕套', '🛏️'],
    [m2, '香薰加湿器', '家居', 199.00, 45, '静音大雾量，7色氛围灯', '💨'],
    [m2, '多功能收纳箱', '家居', 69.00, 120, '加厚PP材质，折叠设计', '📦'],
  ];
  for (const p of prods) insProd.run(...p);
  console.log('✅ 已初始化演示账号与商品数据');
}

module.exports = db;
