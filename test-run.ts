import { fetchAllJobSources } from "./src/social-scraper";

async function main() {
  console.log("=== MEMULAI TEST SCRAPING REAL-TIME ===");
  const jobs = await fetchAllJobSources();
  console.log(`\n=================================`);
  console.log(`TOTAL JOBS DIPEROLEH: ${jobs.length}`);
  console.log(`=================================`);
  
  const socialJobs = jobs.filter(j => j.tags.includes("social-media") || j.company.includes("Threads") || j.company.includes("Instagram"));
  console.log(`\n?? THREADS / INSTAGRAM JOBS (${socialJobs.length}):`);
  socialJobs.forEach((job, index) => {
    console.log(`\n[${index + 1}] ${job.position} | Company: ${job.company}`);
    console.log(`    Link: ${job.url}`);
    console.log(`    Location: ${job.location}`);
    console.log(`    Date: ${job.date}`);
    console.log(`    Snippet: ${job.description.substring(0, 150)}...`);
  });

  const allOtherJobs = jobs.filter(j => !socialJobs.includes(j));
  console.log(`\n?? SUMBER LAINNYA DIPEROLEH (${allOtherJobs.length}):`);
  allOtherJobs.slice(0, 5).forEach((job, index) => {
    console.log(`    - ${job.position} (${job.company}) -> ${job.url}`);
  });
}

main();
