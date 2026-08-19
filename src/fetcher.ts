import axios from 'axios';
import { CANDIDATE_PROFILE, MAX_JOB_AGE_HOURS, ENGLISH_LEVEL_REJECT_KEYWORDS } from './config';

export interface JobPosting {
  id: string;
  company: string;
  position: string;
  tags: string[];
  location: string;
  salaryMin?: number;
  salaryMax?: number;
  url: string;
  applyUrl?: string;
  description: string;
  date: string;
}

const REMOTEOK_API_URL = 'https://remoteok.com/api';

/**
 * Clean HTML tags from text
 */
function stripHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Check if job was posted within last N hours
 */
function isJobRecent(jobDate: string, maxHours: number = MAX_JOB_AGE_HOURS): boolean {
  try {
    const posted = new Date(jobDate);
    const now = new Date();
    const diffMs = now.getTime() - posted.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    return diffHours >= 0 && diffHours <= maxHours;
  } catch {
    // If date parsing fails, reject to avoid old/unknown postings
    return false;
  }
}

/**
 * High quality pre-filtering logic for tech job listings.
 */
function isRelevantJob(job: any): boolean {
  if (!job || !job.position) return false;

  const title = (job.position || '').toLowerCase();
  const tags = Array.isArray(job.tags) ? job.tags.map((t: string) => t.toLowerCase()) : [];
  const description = (job.description || '').toLowerCase();
  const location = (job.location || '').toLowerCase();

  // FILTER 1: Check job recency (only last 24 hours)
  if (job.date && !isJobRecent(job.date, MAX_JOB_AGE_HOURS)) {
    return false;
  }

  // FILTER 2: Non-software / irrelevant role exclusions
  const nonTechKeywords = [
    'labourer', 'laborer', 'estimator', 'smash repairs', 'driver',
    'nurse', 'accountant', 'recruiter', 'receptionist', 
    'sales representative', 'customer service', 'cleaner', 'chef', 'mechanic',
    'marketing', 'designer', 'content writer', 'copywriter'
  ];

  if (nonTechKeywords.some((ex) => title.includes(ex))) {
    return false;
  }

  // FILTER 2.5: Seniority check (candidate target: Junior to Mid, 1-3 years)
  const seniorRoleKeywords = ['senior', 'sr.', 'sr ', 'lead ', 'lead developer', 'lead engineer', 'principal', 'architect', 'head of', 'staff developer', 'staff engineer'];
  if (seniorRoleKeywords.some((kw) => title.includes(kw))) {
    return false;
  }

  // FILTER 3: Strict role matching - target roles or tech stack
  const titleAndTags = `${title} ${tags.join(' ')}`;

  const primaryRoleKeywords = [
    'fullstack', 'full-stack', 'full stack',
    'backend', 'back-end', 'back end',
    'software engineer', 'software developer',
    'web developer', 'web programmer',
    'programmer', 'developer',
    'node', 'nodejs', 'node.js',
    'typescript', 'javascript',
    'php', 'laravel'
  ];

  const secondaryTechKeywords = [
    'postgresql', 'postgres', 'mysql',
    'bootstrap', 'html', 'css',
    'api', 'rest', 'restful',
    'git', 'github'
  ];

  const hasPrimaryMatch = primaryRoleKeywords.some((kw) => titleAndTags.includes(kw));
  const hasSecondaryMatch = secondaryTechKeywords.some((kw) => titleAndTags.includes(kw));
  const hasDescMatch = primaryRoleKeywords.some((kw) => description.includes(kw));

  if (!hasPrimaryMatch && !(hasSecondaryMatch && hasDescMatch)) {
    return false;
  }

  // FILTER 4: Location filter (STRONGLY PREFER REMOTE)
  if (location) {
    const isRemote = location.includes('remote') || 
                     location.includes('anywhere') || 
                     location.includes('worldwide') ||
                     location.includes('global') ||
                     location.includes('wfh') ||
                     location.includes('work from home');
    
    if (!isRemote) {
      // If not remote, check if it's allowed WFO location
      const isWFO = location.includes('wfo') || 
                    location.includes('hybrid') || 
                    location.includes('onsite') ||
                    location.includes('office') ||
                    location.includes('on-site');
      
      if (isWFO) {
        const allowed = CANDIDATE_PROFILE.salaryRules.allowedWfoLocations.some((loc) =>
          location.includes(loc)
        );
        if (!allowed) {
          return false; // Reject WFO outside Jogja/Magelang
        }
      }
      // If location specified but not explicitly remote/WFO, be cautious
      else {
        const inAllowedCity = CANDIDATE_PROFILE.salaryRules.allowedWfoLocations.some((loc) =>
          location.includes(loc)
        );
        // If not in allowed city and not explicitly remote, skip it
        if (!inAllowedCity) {
          return false;
        }
      }
    }
  }

  // FILTER 5: English Level Filter (Reject C1/C2/Advanced/Fluent/Native requirements)
  // Candidate is intermediate (~B1/B2) - cannot meet C1+ requirements
  const englishText = `${title} ${description} ${tags.join(" ")}`.toLowerCase();
    const highEnglishKeywords = ENGLISH_LEVEL_REJECT_KEYWORDS;
  if (highEnglishKeywords.some((kw) => englishText.includes(kw))) {
    return false;
  }

  return true;
}

/**
 * Fetch jobs from RemoteOK API and apply pre-filtering.
 */
export async function fetchJobs(): Promise<JobPosting[]> {
  console.log('📡 Fetching job listings from RemoteOK API (https://remoteok.com/api)...');
  console.log(`   🕒 Filter: Jobs posted within last ${MAX_JOB_AGE_HOURS} hours (24h) only`);

  try {
    const response = await axios.get(REMOTEOK_API_URL, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AIJobHunter/1.0',
        'Accept': 'application/json'
      },
      timeout: 15000
    });

    const rawData = response.data;

    if (!Array.isArray(rawData)) {
      console.warn('⚠️ RemoteOK API returned non-array response.');
      return [];
    }

    // RemoteOK API returns legal notice as first element
    const rawJobs = rawData.filter(
      (item) => item && typeof item === 'object' && !item.legal_notice && item.id && item.position
    );

    console.log(`📥 Total jobs fetched from RemoteOK API: ${rawJobs.length}`);

    // Apply pre-filter
    const filteredJobs: JobPosting[] = rawJobs
      .filter(isRelevantJob)
      .map((item) => ({
        id: String(item.id || item.slug || Math.random()),
        company: item.company || 'Unknown Company',
        position: item.position || 'Software Engineer',
        tags: Array.isArray(item.tags) ? item.tags : [],
        location: item.location || 'Remote (Worldwide)',
        salaryMin: item.salary_min ? Number(item.salary_min) : undefined,
        salaryMax: item.salary_max ? Number(item.salary_max) : undefined,
        url: item.url || item.apply_url || `https://remoteok.com/remote-jobs/${item.id}`,
        applyUrl: item.apply_url || item.url || `https://remoteok.com/remote-jobs/${item.id}`,
        description: stripHtml(item.description || ''),
        date: item.date || new Date().toISOString()
      }));

    console.log(`🎯 Relevant jobs after filtering: ${filteredJobs.length}`);
    console.log(`   ✅ Remote-preferred / WFO in Jogja-Magelang only`);
    console.log(`   ✅ Posted within ${MAX_JOB_AGE_HOURS}h (fresh jobs!)`);
    console.log(`   ✅ Matching tech stack (PHP/Laravel/Node.js/TypeScript)`);
    
    return filteredJobs;
  } catch (error: any) {
    console.error('❌ Error fetching jobs from RemoteOK API:', error.message || error);
    return [];
  }
}


