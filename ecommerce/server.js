const express = require('express');
const session = require('express-session');
const path = require('path');

require('./src/db'); // 初始化数据库

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(session({
  secret: 'ecommerce-demo-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 8 }
}));

// API 路由
app.use('/api/auth', require('./src/routes/auth'));
app.use('/api/products', require('./src/routes/products'));
app.use('/api/orders', require('./src/routes/orders'));

// 静态页面
app.use(express.static(path.join(__dirname, 'public')));

// 入口页
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public/index.html')));

app.listen(PORT, () => {
  console.log(`🛒 电商平台已启动: http://localhost:${PORT}`);
  console.log(`   前台(客户): http://localhost:${PORT}/customer/`);
  console.log(`   后台(商户): http://localhost:${PORT}/merchant/`);
});
