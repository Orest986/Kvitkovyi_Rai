import express from "express";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

const PORT = Number(process.env.PORT || 3000);
const BOT_TOKEN = process.env.BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;
const SITE_NAME = process.env.SITE_NAME || "Квітковий Рай";
const ADMIN_SECRET = process.env.ADMIN_SECRET || "";
const LOG_PATH = path.join(__dirname, "orders.log");
const STATIC_DIR = path.join(__dirname, "fixed");

app.use(express.json({ limit: "100kb" }));
app.use(express.urlencoded({ extended: false }));
app.use(express.static(STATIC_DIR));

function cleanText(value, maxLength = 300) {
  return String(value || "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function validateOrder(raw) {
  const order = {
    bouquet: cleanText(raw.bouquet, 120),
    price: cleanText(raw.price, 20),
    name: cleanText(raw.name, 80),
    phone: cleanText(raw.phone, 25).replace(/[\s\-()]/g, ""),
    deliveryDate: cleanText(raw.deliveryDate, 20),
    deliveryTime: cleanText(raw.deliveryTime, 10),
    address: cleanText(raw.address, 180),
    cardText: cleanText(raw.cardText, 180),
    comment: cleanText(raw.comment, 300),
    company: cleanText(raw.company, 100),
  };

  if (order.company) {
    throw new Error("Запит не пройшов перевірку.");
  }
  if (!order.bouquet) {
    throw new Error("Не вдалося визначити вибраний букет.");
  }
  if (!order.name || order.name.length < 2) {
    throw new Error("Вкажіть ім'я клієнта.");
  }
  if (!/^\+?[0-9]{10,15}$/.test(order.phone)) {
    throw new Error("Вкажіть коректний номер телефону.");
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(order.deliveryDate)) {
    throw new Error("Вкажіть дату доставки.");
  }
  if (!/^\d{2}:\d{2}$/.test(order.deliveryTime)) {
    throw new Error("Вкажіть час доставки.");
  }
  if (!order.address || order.address.length < 8) {
    throw new Error("Вкажіть повну адресу доставки.");
  }

  return order;
}

function appendOrderLog(order, req) {
  const entry = {
    createdAt: new Date().toISOString(),
    ip: req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown",
    userAgent: req.headers["user-agent"] || "unknown",
    ...order,
  };
  fs.appendFileSync(LOG_PATH, JSON.stringify(entry) + "
", "utf-8");
}

function formatTelegramMessage(order) {
  return [
    "🌷 <b>Нове замовлення</b>",
    "",
    `<b>Букет:</b> ${order.bouquet}`,
    order.price ? `<b>Ціна:</b> ${order.price} грн` : null,
    `<b>Клієнт:</b> ${order.name}`,
    `<b>Телефон:</b> <code>${order.phone}</code>`,
    `<b>Дата доставки:</b> ${order.deliveryDate}`,
    `<b>Час доставки:</b> ${order.deliveryTime}`,
    `<b>Адреса:</b> ${order.address}`,
    `<b>Листівка:</b> ${order.cardText || "—"}`,
    `<b>Коментар:</b> ${order.comment || "—"}`,
    "",
    `<b>Сайт:</b> ${SITE_NAME}`,
  ].filter(Boolean).join("
");
}

async function sendTelegramMessage(text) {
  if (!BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    throw new Error("Не заповнені BOT_TOKEN або TELEGRAM_CHAT_ID у .env");
  }

  const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    }),
  });

  const data = await response.json();
  if (!response.ok || !data.ok) {
    throw new Error(data.description || "Telegram не прийняв повідомлення.");
  }
  return data;
}

app.post("/api/order", async (req, res) => {
  try {
    const order = validateOrder(req.body || {});
    appendOrderLog(order, req);
    await sendTelegramMessage(formatTelegramMessage(order));

    res.json({ ok: true, message: "Дякуємо! Ваше замовлення прийнято. Флорист скоро його побачить." });
  } catch (error) {
    console.error("ORDER_ERROR", error);
    res.status(400).json({ ok: false, message: error.message || "Не вдалося обробити замовлення." });
  }
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "flower-orders", time: new Date().toISOString() });
});

app.post("/api/test-telegram", async (req, res) => {
  try {
    const secret = req.headers["x-admin-secret"];
    if (!ADMIN_SECRET || secret !== ADMIN_SECRET) {
      return res.status(403).json({ ok: false, message: "Немає доступу." });
    }
    await sendTelegramMessage("✅ <b>Тестове повідомлення</b>
Бот підключено успішно.");
    res.json({ ok: true, message: "Тестове повідомлення відправлено." });
  } catch (error) {
    console.error("TELEGRAM_TEST_ERROR", error);
    res.status(400).json({ ok: false, message: error.message || "Не вдалося відправити тест." });
  }
});

app.get("*", (req, res, next) => {
  if (req.path.startsWith("/api/")) return next();
  if (req.path === "/" || req.path === "/index.html") {
    return res.sendFile(path.join(STATIC_DIR, "index.html"));
  }
  if (req.path === "/catalog" || req.path === "/catalog.html") {
    return res.sendFile(path.join(STATIC_DIR, "catalog.html"));
  }
  return res.status(404).send("Сторінку не знайдено.");
});

app.listen(PORT, () => {
  console.log(`Kvitkovyi Rai server is running on http://localhost:${PORT}`);
});
