import fs from "fs";
import path from "path";
import crypto from "crypto";

const LOG_FILE = path.resolve(process.cwd(), "sent_jobs.log");

function loadSentJobs(): Set<string> {
  const set = new Set<string>();
  if (fs.existsSync(LOG_FILE)) {
    try {
      const content = fs.readFileSync(LOG_FILE, "utf-8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed) set.add(trimmed);
      }
    } catch (err) {
      console.error("Failed to read sent_jobs.log:", err);
    }
  }
  return set;
}

export const sentJobs = loadSentJobs();

export function makeJobId(company: string, position: string, url?: string): string {
  const cleanCompany = (company || "unknown").toLowerCase().trim();
  const cleanPosition = (position || "unknown").toLowerCase().trim();
  const cleanUrl = (url || "").toLowerCase().trim();
  const base = `${cleanCompany}|${cleanPosition}|${cleanUrl}`;
  return crypto.createHash("md5").update(base).digest("hex");
}

export function isJobAlreadySent(company: string, position: string, url?: string): boolean {
  return sentJobs.has(makeJobId(company, position, url));
}

export function markAsSent(company: string, position: string, url?: string): void {
  const jobId = makeJobId(company, position, url);
  if (!fs.existsSync(LOG_FILE)) {
    try {
      fs.writeFileSync(LOG_FILE, "", "utf-8");
    } catch {}
  }
  try {
    fs.appendFileSync(LOG_FILE, `${jobId}\n`, "utf-8");
  } catch (err) {
    console.error("Failed to write to sent_jobs.log:", err);
  }
  sentJobs.add(jobId);
}
