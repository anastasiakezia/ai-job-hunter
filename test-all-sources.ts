import { fetchAllJobSources } from "./src/social-scraper";

async function main() {
  console.log("=== MEMULAI TEST SCRAPING DARI SEMUA PORTAL JOB ===");
  const jobs = await fetchAllJobSources();
  console.log(`\n=================================`);
  console.log(`TOTAL JOBS COCOK DIPEROLEH: ${jobs.length}`);
  console.log(`=================================`);
  
  jobs.forEach((job, index) => {
    console.log(`\n[${index + 1}] ${job.position} | Company: ${job.company}`);
    console.log(`    Location: ${job.location}`);
    console.log(`    Date: ${job.date}`);
    console.log(`    URL: ${job.url}`);
  });
}

main();
