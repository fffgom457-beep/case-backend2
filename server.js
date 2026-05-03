const express = require("express");
const cors = require("cors");
const Database = require("better-sqlite3");

const app = express();
app.use(cors());
app.use(express.json());

const db = new Database("db.sqlite");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  balance INTEGER DEFAULT 1000
);
CREATE TABLE IF NOT EXISTS inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT,
  name TEXT,
  rarity TEXT,
  price INTEGER
);
`);

const ITEMS = [
  { name: "Scared Cat", rarity: "common", chance: 0.5, price: 100 },
  { name: "Peach", rarity: "rare", chance: 0.3, price: 300 },
  { name: "Crystal", rarity: "epic", chance: 0.15, price: 1200 },
  { name: "Crown", rarity: "legendary", chance: 0.05, price: 5000 }
];

function roll() {
  let r = Math.random(), s = 0;
  for (let i of ITEMS) {
    s += i.chance;
    if (r <= s) return i;
  }
}

function getUserId(req) {
  return req.body?.userId || "demo";
}

function ensureUser(id) {
  let u = db.prepare("SELECT * FROM users WHERE id=?").get(id);
  if (!u) db.prepare("INSERT INTO users (id, balance) VALUES (?,1000)").run(id);
}

app.get("/api/user", (req,res)=>{
  let id = "demo";
  ensureUser(id);

  let user = db.prepare("SELECT * FROM users WHERE id=?").get(id);
  let inv = db.prepare("SELECT * FROM inventory WHERE user_id=?").all(id);

  res.json({ balance: user.balance, inventory: inv });
});

app.post("/api/open-case",(req,res)=>{
  let id = getUserId(req);
  ensureUser(id);

  let user = db.prepare("SELECT * FROM users WHERE id=?").get(id);
  if (user.balance < 100) return res.json({error:"нет денег"});

  let item = roll();

  db.prepare("UPDATE users SET balance=balance-100 WHERE id=?").run(id);
  db.prepare("INSERT INTO inventory (user_id,name,rarity,price) VALUES (?,?,?,?)")
    .run(id,item.name,item.rarity,item.price);

  let updated = db.prepare("SELECT balance FROM users WHERE id=?").get(id);

  res.json({item, balance: updated.balance});
});

app.post("/api/sell",(req,res)=>{
  let {itemId} = req.body;
  let id = "demo";

  let item = db.prepare("SELECT * FROM inventory WHERE id=?").get(itemId);
  if (!item) return res.json({error:"нет"});

  db.prepare("DELETE FROM inventory WHERE id=?").run(itemId);
  db.prepare("UPDATE users SET balance=balance+? WHERE id=?").run(item.price,id);

  let updated = db.prepare("SELECT balance FROM users WHERE id=?").get(id);

  res.json({balance: updated.balance});
});

app.listen(process.env.PORT || 3000);
