import express from "express";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Спробуємо підключити dotenv (потрібен тільки локально)
try {
  const m = await import("dotenv");
  m.default.config();
} catch (_) {}

const __filename = fileURLToPath(import.meta.url);
const __dirname  = path.dirname(__filename);

const PORT            = Number(process.env.PORT) || 3000;
const BOT_TOKEN       = process.env.BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const SITE_NAME       = process.env.SITE_NAME || "Квітковий Рай";
const ADMIN_SECRET    = process.env.ADMIN_SECRET || "";
const STATIC_DIR      = path.join(__dirname, "fixed");
const LOG_PATH        = path.join(__dirname, "orders.log");

process.on("uncaughtException",  (e) => console.error("UNCAUGHT", e));
process.on("unhandledRejection", (e) => console.error("UNHANDLED", e));

console.log("=== SERVER STARTING ===");
console.log("PORT:", PORT);
console.log("BOT_TOKEN set:", !!BOT_TOKEN);
console.log("CHAT_ID set:",   !!TELEGRAM_CHAT_ID);
console.log("STATIC_DIR:",    STATIC_DIR);

const app = express();
app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(STATIC_DIR));

// ── helpers ──────────────────────────────────────────

function clean(val, max = 300) {
  return String(val || "").replace(/[<>]/g, "").replace(/\s+/g, " ").trim().slice(0, max);
}

function validate(raw) {
  const o = {
    bouquet:      clean(raw.bouquet,      120),
    price:        clean(raw.price,         20),
    name:         clean(raw.name,          80),
    phone:        clean(raw.phone,         25).replace(/[\s\-()]/g, ""),
    deliveryDate: clean(raw.deliveryDate,  20),
    deliveryTime: clean(raw.deliveryTime,  10),
    address:      clean(raw.address,      180),
    cardText:     clean(raw.cardText,     180),
    comment:      clean(raw.comment,      300),
    company:      clean(raw.company,      100),
  };
  if (o.company)                          throw new Error("Запит не пройшов перевірку.");
  if (!o.bouquet)                         throw new Error("Не вдалося визначити букет.");
  if (!o.name || o.name.length < 2)       throw new Error("Вкажіть ім'я.");
  if (!/^\+?[0-9]{10,15}$/.test(o.phone))throw new Error("Невірний номер телефону.");
  // Поля доставки необов'язкові — флорист уточнить при дзвінку
  return o;
}

function logOrder(order, req) {
  try {
    const entry = { at: new Date().toISOString(), ip: req.ip, ...order };
    fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + "\n", "utf-8");
  } catch (_) {}
}

function tgMessage(o) {
  return [
    "🌷 <b>Нове замовлення</b>", "",
    `<b>Букет:</b> ${o.bouquet}`,
    o.price ? `<b>Ціна:</b> ${o.price} грн` : null,
    `<b>Клієнт:</b> ${o.name}`,
    `<b>Телефон:</b> <code>${o.phone}</code>`,
    `<b>Дата:</b> ${o.deliveryDate}  <b>Час:</b> ${o.deliveryTime}`,
    `<b>Адреса:</b> ${o.address}`,
    `<b>Листівка:</b> ${o.cardText || "—"}`,
    `<b>Коментар:</b> ${o.comment || "—"}`,
    "", `<b>Сайт:</b> ${SITE_NAME}`,
  ].filter(v => v !== null).join("\n");
}

async function sendTg(text) {
  if (!BOT_TOKEN || !TELEGRAM_CHAT_ID) throw new Error("BOT_TOKEN або TELEGRAM_CHAT_ID не вказані.");
  const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  const d = await r.json();
  if (!r.ok || !d.ok) throw new Error(d.description || "Telegram помилка.");
}

// ── routes ───────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, time: new Date().toISOString() });
});

app.post("/api/order", async (req, res) => {
  try {
    const order = validate(req.body || {});
    logOrder(order, req);
    await sendTg(tgMessage(order));
    res.json({ ok: true, message: "Замовлення прийнято! Флорист скоро зателефонує." });
  } catch (e) {
    console.error("ORDER_ERROR:", e.message);
    res.status(400).json({ ok: false, message: e.message });
  }
});

app.post("/api/test-telegram", async (req, res) => {
  if (req.headers["x-admin-secret"] !== ADMIN_SECRET)
    return res.status(403).json({ ok: false, message: "Немає доступу." });
  try {
    await sendTg("✅ <b>Тест</b>\nБот працює!");
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ ok: false, message: e.message });
  }
});

app.get(["/catalog", "/catalog.html"], (_req, res) =>
  res.sendFile(path.join(STATIC_DIR, "catalog.html"))
);
app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  res.sendFile(path.join(STATIC_DIR, "index.html"));
});

// ── start ─────────────────────────────────────────────

app.listen(PORT, "0.0.0.0", () => {
  console.log(`=== SERVER READY on 0.0.0.0:${PORT} ===`);
});
