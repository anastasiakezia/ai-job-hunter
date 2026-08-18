import axios from 'axios';
import Parser from 'rss-parser';
import { JobPosting } from './fetcher';

const rssParser = new Parser();

// Maximum job age in days (only show jobs posted in last 2 days)
const MAX_JOB_AGE_DAYS = 2;

/**
 * Check if job was posted within last N days
 */
function isJobRecent(jobDate: string, maxDays: number = MAX_JOB_AGE_DAYS): boolean {
  try {
    const posted = new Date(jobDate);
    const now = new Date();
    const diffMs = now.getTime() - posted.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    
    return diffDays <= maxDays;
  } catch {
    // If date parsing fails, assume it's recent (today)
    return true;
  }
}

/**
 * Filter jobs by recency
 */
function filterRecentJobs(jobs: JobPosting[]): JobPosting[] {
  return jobs.filter(job => isJobRecent(job.date, MAX_JOB_AGE_DAYS));
}
