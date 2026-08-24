const axios = require("axios");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const CHAT_ID = process.env.TELEGRAM_CHAT_ID;

async function sendManual() {
  if (!BOT_TOKEN || !CHAT_ID) {
    console.error("? TOKEN atau CHAT_ID tidak ditemukan di .env");
    return;
  }

  const matchFile = "2026-08-24T14-58-31-998Z-Loker_id.txt";
  const filePath = path.join("D:/ai-job-hunter/job-matches", matchFile);

  if (!fs.existsSync(filePath)) {
    console.error("? File tidak ditemukan:", filePath);
    return;
  }

  const text = fs.readFileSync(filePath, "utf-8");
  console.log("?? Mengirim file ke Telegram...");

  try {
    const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
    await axios.post(url, {
      chat_id: CHAT_ID,
      text: text,
      parse_mode: "Markdown"
    });
    console.log("? Pesan berhasil dikirim!");
  } catch (e: any) {
    console.error("? Gagal kirim ke Telegram:", e.response?.data || e.message);
  }
}

sendManual();
