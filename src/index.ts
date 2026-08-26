import { CANDIDATE_PROFILE, ENV, MATCH_THRESHOLD, MAX_JOB_AGE_HOURS } from './config';
import { fetchJobs, JobPosting } from './fetcher';
import { fetchAllJobSources } from './social-scraper';
import { analyzeJobPosting, AIAnalysisResult } from './ai';
import { sendTelegramNotification } from './notifier';
import { isJobAlreadySent } from './sent-jobs-store';

/**
 * Filter jobs by recency (posted within last N hours - default 24h)
 */
function filterRecentJobs(jobs: JobPosting[], maxHours: number = MAX_JOB_AGE_HOURS): JobPosting[] {
  return jobs.filter(job => {
    try {
      const posted = new Date(job.date);
      const now = new Date();
      const diffMs = now.getTime() - posted.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      
      return diffHours >= 0 && diffHours <= maxHours;
    } catch {
      // If date parsing fails, reject to avoid old/unknown postings
      return false;
    }
  });
}

async function main() {
  console.log('===========================================================');
  console.log('🤖 AI JOB HUNTER & RESUME TAILOR AUTOMATION');
  console.log(`👤 Candidate: ${CANDIDATE_PROFILE.name} (${CANDIDATE_PROFILE.roleTitle})`);
  console.log(`🕒 Job Filter: STRICTLY LAST ${MAX_JOB_AGE_HOURS} HOURS (24 Hours Only)`);
  console.log(`📍 Location Rules: Remote (Worldwide/Lokal) OR WFO (Jogja/Magelang); reject heavy spoken-English roles`);
  console.log(`💰 Salary Expectations: Min Rp 3.5jt (Remote) / Rp 4jt (WFO)`);
  console.log(`🇮🇩 Sources: Glints, JobStreet, RemoteOK, WWR, Remotive, Instagram/Threads, Kalibrr, Dealls, TechInAsia, Karir, Loker.id`);
  console.log('===========================================================\n');

  // Check Environment Configuration
  const missingEnvVars: string[] = [];
  if (!ENV.OPENAI_API_KEY && !ENV.GEMINI_API_KEY && process.env.DEMO_MODE !== 'true') {
    missingEnvVars.push('OPENAI_API_KEY or GEMINI_API_KEY');
  }
  if (!ENV.TELEGRAM_BOT_TOKEN) missingEnvVars.push('TELEGRAM_BOT_TOKEN');
  if (!ENV.TELEGRAM_CHAT_ID) missingEnvVars.push('TELEGRAM_CHAT_ID');

  if (missingEnvVars.length > 0) {
    console.warn('⚠️  ENVIRONMENT NOTICE:');
    console.warn(`The following variables are missing: ${missingEnvVars.join(', ')}`);
    console.warn('   -> Using available providers or DEMO_MODE\n');
  }

  // 1. Fetch jobs from multiple sources
  console.log('📡 FETCHING JOBS FROM ALL SOURCES (LOKAL & INTERNASIONAL)...\n');
  
  const [remoteOkJobs, socialMediaJobs] = await Promise.all([
    fetchJobs().catch((err) => {
      console.error('❌ RemoteOK fetch failed:', err.message);
      return [];
    }),
    fetchAllJobSources().catch((err) => {
      console.error('❌ All sources fetch failed:', err.message);
      return [];
    })
  ]);

  // Combine all jobs
  const allJobs = [...remoteOkJobs, ...socialMediaJobs];
  
  // Remove duplicates by URL
  const uniqueJobs = Array.from(
    new Map(allJobs.map(job => [(job.url || job.id), job])).values()
  );

  // Filter strictly by 24 hours
  const recentJobs = filterRecentJobs(uniqueJobs, MAX_JOB_AGE_HOURS);

  console.log(`\n📊 JOB COLLECTION SUMMARY:`);
  console.log(`   - Total jobs fetched: ${allJobs.length}`);
  console.log(`   - Unique jobs: ${uniqueJobs.length}`);
  console.log(`   - FRESH JOBS (≤${MAX_JOB_AGE_HOURS}h): ${recentJobs.length}`);
  console.log(`   - RemoteOK API: ${remoteOkJobs.length}`);
  console.log(`   - Glints/JobStreet/Other Sources: ${socialMediaJobs.length}\n`);

  if (recentJobs.length === 0) {
    console.log(`ℹ️ No jobs found posted in the last ${MAX_JOB_AGE_HOURS} hours matching criteria.`);
    console.log('💡 Tip: Strict 24-hour filter ensures you only get the freshest job postings!');
    return;
  }

  // Sort by date (newest first)
  const sortedJobs = recentJobs.sort((a, b) => {
    const dateA = new Date(a.date || 0).getTime();
    const dateB = new Date(b.date || 0).getTime();
    return dateB - dateA;
  });

  // Filter out jobs that were already evaluated & sent in previous runs
  const unsentJobs = sortedJobs.filter(job => !isJobAlreadySent(job.company || 'unknown', job.position, job.url));

  if (unsentJobs.length === 0) {
    console.log(`ℹ️ All fresh jobs (${sortedJobs.length}) have already been processed in previous runs.`);
    return;
  }

  // Limit processing batch size
  const MAX_JOBS_TO_ANALYZE = 20;
  const jobsToAnalyze = unsentJobs.slice(0, MAX_JOBS_TO_ANALYZE);

  console.log(`🧠 Starting AI Analysis for top ${jobsToAnalyze.length} newest UNPROCESSED jobs (posted within 24h)...\n`);

  let matchedCount = 0;
  let evaluatedCount = 0;

  function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  for (let i = 0; i < jobsToAnalyze.length; i++) {
    if (i > 0) {
      await sleep(1500);
    }
    const job = jobsToAnalyze[i];
    
    // Calculate job age in hours
    const postedDate = new Date(job.date);
    const ageHours = Math.floor((Date.now() - postedDate.getTime()) / (1000 * 60 * 60));
    const ageDisplay = `${ageHours}h ago`;
    
    console.log(`[${i + 1}/${jobsToAnalyze.length}] Analyzing: "${job.position}" at "${job.company}" (${ageDisplay})...`);

    const analysis: AIAnalysisResult | null = await analyzeJobPosting(job);

    if (!analysis) {
      console.log(`   ⏭️ Skipped AI analysis (request failed).`);
      continue;
    }

    evaluatedCount++;
    console.log(`   📊 Match Score: ${analysis.matchScore}% | Mode: ${analysis.workMode}`);

    if (analysis.matchScore >= MATCH_THRESHOLD) {
      console.log(`   🎯 MATCH FOUND (Score >= ${MATCH_THRESHOLD}%)! Sending Telegram notification...`);
      matchedCount++;
      await sendTelegramNotification(job, analysis);
    } else {
      console.log(`   ❌ Score below threshold (${analysis.matchScore}% < ${MATCH_THRESHOLD}%). Skipping.`);
    }

    console.log('---');
  }

  console.log('\n===========================================================');
  console.log('📊 EXECUTION SUMMARY');
  console.log(`• Total jobs collected: ${uniqueJobs.length}`);
  console.log(`• Fresh jobs (≤24h): ${recentJobs.length}`);
  console.log(`• Jobs evaluated by AI: ${evaluatedCount}`);
  console.log(`• High-match jobs found (≥${MATCH_THRESHOLD}%): ${matchedCount}`);
  console.log('===========================================================');

  if (matchedCount > 0) {
    console.log(`\n✅ ${matchedCount} matching job(s) sent to Telegram & saved locally!`);
    console.log(`📁 Check folder: job-matches/`);
  } else {
    console.log(`\n💡 No high-match jobs found in last 24h. Will check again tomorrow at 09:00 AM!`);
  }
}

main().catch((err) => {
  console.error('💥 Fatal error in execution main():', err);
  process.exit(1);
});




