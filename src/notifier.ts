import axios from "axios";
import { ENV } from "./config";
import { JobPosting } from "./fetcher";
import { AIAnalysisResult } from "./ai";
import * as fs from "fs";
import * as path from "path";
import { isJobAlreadySent, markAsSent } from "./sent-jobs-store";

export function buildNotificationMessage(job: JobPosting, analysis: AIAnalysisResult): string {
  const reasonsText = analysis.reasons.map((r) => `• ${r.trim()}`).join("\n");
  const applyLink = job.applyUrl || job.url;

  return `🎯 *LOKER RELEVAN DITEMUKAN!*

💼 *Posisi*: ${job.position}
🏢 *Perusahaan*: ${job.company}
📍 *Mode Kerja*: ${analysis.workMode}
📊 *Match Score*: ${analysis.matchScore}%
🔗 *Link Lamaran*: ${applyLink}

✨ *Alasan Cocok*:
${reasonsText}

📝 *Draf Cover Letter*:
${analysis.coverLetter}

💬 *Template Chat Pertama ke Recruiter*:
${analysis.quickChatTemplate}
`;
}

function saveToLocalFile(job: JobPosting, analysis: AIAnalysisResult): void {
  try {
    const logsDir = path.join(process.cwd(), "job-matches");
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const filename = `${timestamp}-${job.company.replace(/[^a-z0-9]/gi, "_")}.txt`;
    const filepath = path.join(logsDir, filename);

    const message = buildNotificationMessage(job, analysis);
    fs.writeFileSync(filepath, message, "utf-8");

    console.log(`   💾 Saved to file: job-matches/${filename}`);
  } catch (error: any) {
    console.error(`   ⚠️ Failed to save to file:`, error.message);
  }
}

export async function sendTelegramNotification(
  job: JobPosting,
  analysis: AIAnalysisResult
): Promise<boolean> {
  if (isJobAlreadySent(job.company || "unknown", job.position, job.url)) {
    console.log(`   ⏭️ Skip duplikat: ${job.company} - ${job.position}`);
    return false;
  }

  const message = buildNotificationMessage(job, analysis);

  saveToLocalFile(job, analysis);

  if (!ENV.TELEGRAM_BOT_TOKEN || !ENV.TELEGRAM_CHAT_ID) {
    console.log("\n======================================================");
    console.log("📢 [CONSOLE OUTPUT - TELEGRAM NOT CONFIGURED]");
    console.log("======================================================");
    console.log(message);
    console.log("======================================================\n");
    markAsSent(job.company || "unknown", job.position, job.url);
    return false;
  }

  const telegramUrl = `https://api.telegram.org/bot${ENV.TELEGRAM_BOT_TOKEN}/sendMessage`;

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const response = await axios.post(
        telegramUrl,
        {
          chat_id: ENV.TELEGRAM_CHAT_ID,
          text: message,
          parse_mode: "Markdown",
          disable_web_page_preview: false,
        },
        {
          timeout: 10000,
          validateStatus: (status) => status < 500,
        }
      );

      if (response.status === 200 && response.data.ok) {
        console.log(`   ✅ Telegram notification sent successfully!`);
        markAsSent(job.company || "unknown", job.position, job.url);
        return true;
      } else {
        console.error(`   ⚠️ Telegram API returned error:`, response.data);
      }
    } catch (error: any) {
      if (attempt === 2) {
        console.error(`   ❌ Failed to send Telegram after ${attempt} attempts:`, error.message);
        console.log("   📧 Check Telegram bot token and chat ID in .env file");
      } else {
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
  }

  console.log("\n======================================================");
  console.log("📢 [FALLBACK - PRINTED TO CONSOLE]");
  console.log("======================================================");
  console.log(message);
  console.log("======================================================\n");

  markAsSent(job.company || "unknown", job.position, job.url);
  return false;
}
