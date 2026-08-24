import { fetchSocialRssJobs } from "./src/social-scraper";

async function main() {
  console.log("=== MEMULAI TEST SCRAPING THREADS / SOCIAL ONLY ===");
  const jobs = await fetchSocialRssJobs();
  console.log(`\n=================================`);
  console.log(`TOTAL JOBS THREADS/INSTAGRAM DIPEROLEH: ${jobs.length}`);
  console.log(`=================================`);
  
  jobs.slice(0, 20).forEach((job, index) => {
    console.log(`\n[${index + 1}] ${job.position}`);
    console.log(`    Company: ${job.company}`);
    console.log(`    Link: ${job.url}`);
    console.log(`    Date: ${job.date}`);
    console.log(`    Snippet: ${job.description.substring(0, 200)}...`);
  });
}

main();
