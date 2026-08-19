import axios from 'axios';
import * as cheerio from 'cheerio';
import Parser from 'rss-parser';
import { JobPosting } from './fetcher';
import { ENV, MAX_JOB_AGE_HOURS, ENGLISH_LEVEL_REJECT_KEYWORDS } from './config';

const rssParser = new Parser();
const DEFAULT_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 AIJobHunter/1.0',
  Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,application/json;q=0.8,*/*;q=0.7'
};
const LOCAL_KEYWORDS = ['backend', 'fullstack', 'nodejs', 'laravel', 'php', 'typescript'];

function parseList(value: string | undefined): string[] {
  return (value || '')
    .split(/[\n,|]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseValidDate(value: unknown): Date | null {
  if (!value || typeof value !== 'string') return null;

  const normalized = value.trim();
  if (!normalized) return null;

  const relativeMatch = normalized.toLowerCase().match(/(\d+)\s*(minute|minutes|min|hour|hours|hr|hrs|day|days)\s*ago/);
  if (relativeMatch) {
    const amount = Number(relativeMatch[1]);
    const unit = relativeMatch[2];
    const now = Date.now();
    const multiplier = unit.startsWith('minute') || unit === 'min'
      ? 60 * 1000
      : unit.startsWith('hour') || unit === 'hr' || unit === 'hrs'
        ? 60 * 60 * 1000
        : 24 * 60 * 60 * 1000;
    return new Date(now - amount * multiplier);
  }

  if (/today|just now|baru saja|hari ini/i.test(normalized)) return new Date();
  if (/yesterday|kemarin/i.test(normalized)) return new Date(Date.now() - 24 * 60 * 60 * 1000);

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isJobRecent(jobDate: unknown, maxHours: number = MAX_JOB_AGE_HOURS): boolean {
  const posted = parseValidDate(jobDate);
  if (!posted) return false;

  const diffHours = (Date.now() - posted.getTime()) / (1000 * 60 * 60);
  return diffHours >= 0 && diffHours <= maxHours;
}

function getValidRecentIsoDate(value: unknown): string | null {
  const posted = parseValidDate(value);
  if (!posted || !isJobRecent(posted.toISOString())) return null;
  return posted.toISOString();
}

function stripHtml(value: unknown): string {
  return String(value || '')
    .replace(/<[^>]*>?/gm, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function isAllowedLocation(locationValue: unknown, isRemoteValue?: boolean): boolean {
  const location = String(locationValue || '').toLowerCase();
  const isRemote = Boolean(isRemoteValue) ||
    location.includes('remote') ||
    location.includes('wfh') ||
    location.includes('work from home') ||
    location.includes('anywhere') ||
    location.includes('worldwide') ||
    location.includes('global');

  if (isRemote) return true;

  return ['yogyakarta', 'jogja', 'magelang'].some((allowedLocation) => location.includes(allowedLocation));
}

/**
 * Reject senior/lead roles that require 5+ years experience
 * (candidate targets Junior to Mid-level, 1-3 years)
 */
function isJuniorFriendlyRole(title: string, description: string): boolean {
  const lowerTitle = (title || '').toLowerCase();
  const seniorKeywords = ['senior', 'sr.', 'sr ', 'lead ', 'lead developer', 'lead engineer', 'principal', 'architect', 'head of', 'staff developer', 'staff engineer'];
  if (seniorKeywords.some((kw) => lowerTitle.includes(kw))) return false;

  const desc = (description || '').toLowerCase();
  const highExpMatch = desc.match(/(?:5|6|7|8|10)\+?\s*(?:years|yrs|tahun)\b/i);
  if (highExpMatch) return false;

  // Reject roles requiring C1/C2/Fluent/Native/Advanced English (candidate is intermediate B1/B2)
  const englishText = (lowerTitle + " " + desc).toLowerCase();
  if (ENGLISH_LEVEL_REJECT_KEYWORDS.some((kw) => englishText.includes(kw))) {
    return false;
  }

  return true;
}

function isRelevantText(value: string): boolean {
  const text = value.toLowerCase();
  const hasJobSignal = ['loker', 'lowongan', 'hiring', 'job', 'jobs', 'career', 'karir', 'dibutuhkan', 'opportunity', 'opportunities', 'developer', 'engineer'].some((keyword) => text.includes(keyword));
  const hasTechSignal = ['backend', 'back-end', 'fullstack', 'full stack', 'full-stack', 'developer', 'engineer', 'programmer', 'laravel', 'php', 'node', 'nodejs', 'typescript', 'javascript', 'software'].some((keyword) => text.includes(keyword));
  return hasJobSignal && hasTechSignal;
}

function getAllowedTextLocation(value: string): string | null {
  const text = value.toLowerCase();
  if (/remote|wfh|work from home|work-from-home/i.test(text)) return 'Remote / WFH';
  if (/yogyakarta|jogja/i.test(text)) return 'Yogyakarta / Jogja';
  if (/magelang/i.test(text)) return 'Magelang';
  return null;
}
function errorSummary(error: any): string {
  const status = error?.response?.status;
  const statusText = error?.response?.statusText;
  const message = error?.message || String(error);
  return status ? `${status}${statusText ? ` ${statusText}` : ''}` : message;
}

function collectObjects(value: any, predicate: (item: any) => boolean, output: any[] = []): any[] {
  if (!value || typeof value !== 'object') return output;
  if (predicate(value)) output.push(value);

  if (Array.isArray(value)) {
    for (const item of value) collectObjects(item, predicate, output);
    return output;
  }

  for (const item of Object.values(value)) collectObjects(item, predicate, output);
  return output;
}

function normalizeUrl(url: string, baseUrl: string): string {
  if (!url) return baseUrl;
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return baseUrl;
  }
}

function extractJsonLdJobs(html: string): any[] {
  const $ = cheerio.load(html);
  const jobs: any[] = [];

  $('script[type="application/ld+json"]').each((_, element) => {
    const raw = $(element).contents().text();
    if (!raw.trim()) return;

    try {
      const parsed = JSON.parse(raw);
      jobs.push(...collectObjects(parsed, (item) => {
        const type = Array.isArray(item['@type']) ? item['@type'].join(' ') : item['@type'];
        return String(type || '').toLowerCase().includes('jobposting');
      }));
    } catch {
      // Ignore malformed JSON-LD blocks.
    }
  });

  return jobs;
}

function extractNextDataJobs(html: string): any[] {
  const $ = cheerio.load(html);
  const raw = $('#__NEXT_DATA__').contents().text();
  if (!raw.trim()) return [];

  try {
    const parsed = JSON.parse(raw);
    return collectObjects(parsed, (item) => Boolean(item?.title && (item?.id || item?.jobId || item?.jobid || item?.solMetadata?.jobId)));
  } catch {
    return [];
  }
}

async function fetchGlintsHtmlJobs(keyword: string): Promise<JobPosting[]> {
  const url = `https://glints.com/id/opportunities/jobs/explore?keyword=${encodeURIComponent(keyword)}`;
  const response = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 15000 });
  const jobs: JobPosting[] = [];

  try {
    const $ = cheerio.load(response.data);
    const html = $('#__NEXT_DATA__').html();
    if (!html) return jobs;

    const nextData = JSON.parse(html);
    const rawJobs = nextData.props?.pageProps?.initialJobs?.jobsInPage || [];

    for (const job of rawJobs) {
      const postedDate = getValidRecentIsoDate(job.createdAt || job.updatedAt);
      if (!postedDate) continue;

      const title = job.title || 'Developer';
      const company = job.company?.name || 'Glints Company';
      const isRemote = job.workArrangementOption === 'REMOTE';
      
      const locName = job.location?.formattedName || '';
      const locParents = (job.location?.parents || []).map((p: any) => p.name).join(', ');
      const location = `${locName}${locParents ? ', ' + locParents : ''}`;

      if (!isAllowedLocation(location, isRemote)) continue;
      
      const minExp = job.minYearsOfExperience || 0;
      if (minExp >= 5 || !isJuniorFriendlyRole(title, `${title} ${minExp} years experience`)) continue;

      const jobUrl = `https://glints.com/id/opportunities/jobs/${job.id}`;
      jobs.push({
        id: `glints-html-${job.id}`,
        company,
        position: title,
        tags: [keyword, isRemote ? 'remote' : 'local'],
        location: isRemote ? 'Remote (Indonesia)' : location,
        salaryMin: job.salaries?.[0]?.minSalary,
        salaryMax: job.salaries?.[0]?.maxSalary,
        url: jobUrl,
        applyUrl: jobUrl,
        description: stripHtml(`Job posting from Glints for ${title} at ${company}. Work arrangement: ${job.workArrangementOption || 'Onsite'}`),
        date: postedDate
      });
    }
  } catch (e: any) {
    console.log(`   ?? Error parsing Glints NEXT_DATA for "${keyword}":`, e.message || e);
  }

  return jobs;
}

export async function fetchGlintsJobs(): Promise<JobPosting[]> {
  console.log('🇮🇩 Fetching jobs from Glints Indonesia...');

  const jobs: JobPosting[] = [];

  for (const keyword of LOCAL_KEYWORDS) {
    try {
      const url = `https://glints.com/api/v1/jobs/search?keyword=${encodeURIComponent(keyword)}&country=ID&limit=20`;
      const response = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 10000 });
      const rawJobs = response.data?.jobs;
      if (!Array.isArray(rawJobs)) continue;

      console.log(`   Found ${rawJobs.length} Glints API jobs for "${keyword}"`);
      for (const job of rawJobs) {
        const postedDate = getValidRecentIsoDate(job.createdAt || job.created_at || job.updatedAt);
        if (!postedDate) continue;

        const location = job.location || job.city?.name || 'Indonesia';
        if (!isAllowedLocation(location, job.isRemote || job.workType === 'REMOTE')) continue;

        jobs.push({
          id: `glints-${job.id}`,
          company: job.company?.name || 'Glints Company',
          position: job.title || 'Developer',
          tags: [keyword, job.isRemote ? 'remote' : 'local'],
          location: job.isRemote ? 'Remote (Indonesia)' : location,
          salaryMin: job.minSalary,
          salaryMax: job.maxSalary,
          url: `https://glints.com/id/opportunities/jobs/${job.id}`,
          applyUrl: `https://glints.com/id/opportunities/jobs/${job.id}`,
          description: stripHtml(job.description || `Job posting from Glints for ${job.title}`),
          date: postedDate
        });
      }
    } catch (error: any) {
      console.log(`   ⚠️ Glints API failed for "${keyword}" (${errorSummary(error)}); trying public page fallback...`);
      try {
        const fallbackJobs = await fetchGlintsHtmlJobs(keyword);
        console.log(`   Found ${fallbackJobs.length} Glints page jobs for "${keyword}"`);
        jobs.push(...fallbackJobs);
      } catch (fallbackError: any) {
        console.log(`   ⚠️ Glints page fallback failed for "${keyword}" (${errorSummary(fallbackError)})`);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return jobs;
}

async function fetchJobStreetHtmlJobs(keyword: string): Promise<JobPosting[]> {
  const slug = keyword.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').toLowerCase();
  const url = `https://www.jobstreet.co.id/${slug}-jobs?sortmode=ListedDate`;
  const response = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 15000 });
  const jobs: JobPosting[] = [];

  try {
    const $ = cheerio.load(response.data);
    $('[data-job-id]').each((_, el) => {
      const $card = $(el);
      const id = $card.attr('data-job-id');
      const title = $card.find('a[data-automation="jobTitle"]').text().trim() || 'Developer';
      const company = $card.find('a[aria-label^="Jobs at"]').text().trim() || $card.find('a[title^="Jobs at"]').text().trim() || 'JobStreet Company';
      
      const locText = $card.find('a[data-automation="job-card-location"]').text().trim() ||
                      $card.find('span[data-automation="job-card-location"]').text().trim() ||
                      $card.find('span:contains("Jakarta"), span:contains("Bandung"), span:contains("Jogja"), span:contains("Yogyakarta"), span:contains("Magelang"), span:contains("Remote")').first().text().trim() ||
                      'Indonesia';

      const dateText = $card.find('div:contains("Listed"), span:contains("Listed"), div:contains("ago")').first().text().trim();
      const postedDate = getValidRecentIsoDate(dateText);
      if (!postedDate) return;

      const isRemote = /remote|wfh|work from home/i.test(`${title} ${locText}`);
      if (!isAllowedLocation(locText, isRemote)) return;
      if (!isJuniorFriendlyRole(title, `${title} ${locText}`)) return;

      const jobUrl = `https://www.jobstreet.co.id/id/job/${id}`;
      jobs.push({
        id: `jobstreet-html-${id}`,
        company,
        position: title,
        tags: [keyword],
        location: locText,
        url: jobUrl,
        applyUrl: jobUrl,
        description: stripHtml(`Job posting from JobStreet for ${title} at ${company} in ${locText}`),
        date: postedDate
      });
    });
  } catch (e: any) {
    console.log(`   ?? Error parsing JobStreet HTML for "${keyword}":`, e.message || e);
  }

  return jobs;
}

export async function fetchJobStreetJobs(): Promise<JobPosting[]> {
  console.log('🇮🇩 Fetching jobs from JobStreet Indonesia...');

  const jobs: JobPosting[] = [];
  const keywords = ['backend-developer', 'fullstack-developer', 'laravel-developer', 'nodejs-developer'];

  for (const keyword of keywords) {
    try {
      const url = `https://www.jobstreet.co.id/api/chalice-search/v4/search?siteKey=ID-main&keywords=${encodeURIComponent(keyword)}&sortmode=ListedDate&jobsPerPage=20&pageNumber=1`;
      const response = await axios.get(url, { headers: DEFAULT_HEADERS, timeout: 10000, maxRedirects: 3 });
      const rawJobs = response.data?.data || response.data?.jobs || response.data?.solMetadata?.jobs;
      if (!Array.isArray(rawJobs)) continue;

      console.log(`   Found ${rawJobs.length} JobStreet API jobs for "${keyword}"`);
      for (const job of rawJobs) {
        const postedDate = getValidRecentIsoDate(job.listedAt || job.listingDate || job.createdAt || job.date || job.displayDate);
        if (!postedDate) continue;

        const location = job.location || job.locations?.[0]?.label || 'Indonesia';
        if (!isAllowedLocation(location, /remote|wfh|work from home/i.test(`${job.title || ''} ${job.teaser || ''} ${location}`))) continue;

        const id = job.id || job.jobId || job.jobid;
        jobs.push({
          id: `jobstreet-${id}`,
          company: job.companyName || job.company?.name || 'JobStreet Company',
          position: job.title || 'Developer',
          tags: [keyword],
          location,
          url: `https://www.jobstreet.co.id/id/job/${id}`,
          applyUrl: `https://www.jobstreet.co.id/id/job/${id}`,
          description: stripHtml(job.teaser || job.description || `Job posting from JobStreet for ${job.title}`),
          date: postedDate
        });
      }
    } catch (error: any) {
      console.log(`   ⚠️ JobStreet API failed for "${keyword}" (${errorSummary(error)}); trying public page fallback...`);
      try {
        const fallbackJobs = await fetchJobStreetHtmlJobs(keyword);
        console.log(`   Found ${fallbackJobs.length} JobStreet page jobs for "${keyword}"`);
        jobs.push(...fallbackJobs);
      } catch (fallbackError: any) {
        console.log(`   ⚠️ JobStreet page fallback failed for "${keyword}" (${errorSummary(fallbackError)})`);
      }
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return jobs;
}

export async function fetchIndeedJobs(): Promise<JobPosting[]> {
  console.log('🔍 Fetching jobs from Indeed...');
  console.log('   ⏭️ Skipping Indeed HTML results without reliable posting timestamp.');
  return [];
}

export async function fetchWeWorkRemotelyJobs(): Promise<JobPosting[]> {
  console.log('🌍 Fetching jobs from WeWorkRemotely...');

  const jobs: JobPosting[] = [];
  const categories = ['programming', 'devops-sysadmin', 'full-stack-programming'];

  for (const category of categories) {
    try {
      const rssUrl = `https://weworkremotely.com/categories/remote-${category}-jobs.rss`;
      const feed = await rssParser.parseURL(rssUrl);
      if (!feed.items?.length) continue;

      console.log(`   Found ${feed.items.length} WeWorkRemotely jobs in "${category}"`);
      for (const item of feed.items.slice(0, 10)) {
        const postedDate = getValidRecentIsoDate(item.pubDate || item.isoDate);
        if (!postedDate) continue;

        const wwrDesc = stripHtml(item.contentSnippet || item.content || '');
        if (!isJuniorFriendlyRole(item.title || '', wwrDesc)) continue;

        jobs.push({
          id: `wwr-${item.guid || item.link}`,
          company: item.creator || item.author || 'WeWorkRemotely Company',
          position: item.title || 'Developer',
          tags: [category, 'remote'],
          location: 'Remote (Worldwide)',
          url: item.link || '',
          applyUrl: item.link || '',
          description: stripHtml(item.contentSnippet || item.content || ''),
          date: postedDate
        });
      }
    } catch (error: any) {
      console.log(`   ⚠️ Failed WeWorkRemotely category "${category}" (${errorSummary(error)})`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return jobs;
}

export async function fetchRemotiveJobs(): Promise<JobPosting[]> {
  console.log('💼 Fetching jobs from Remotive.io...');

  const jobs: JobPosting[] = [];

  try {
    const response = await axios.get('https://remotive.com/api/remote-jobs?category=software-dev', {
      headers: DEFAULT_HEADERS,
      timeout: 10000
    });

    const rawJobs = response.data?.jobs;
    if (!Array.isArray(rawJobs)) return jobs;

    console.log(`   Found ${rawJobs.length} Remotive jobs`);
    for (const job of rawJobs.slice(0, 20)) {
      const postedDate = getValidRecentIsoDate(job.publication_date);
      if (!postedDate) continue;

      const remDesc = stripHtml(job.description || '');
      if (!isJuniorFriendlyRole(job.title || '', remDesc)) continue;

      jobs.push({
        id: `remotive-${job.id || job.url}`,
        company: job.company_name || 'Remotive Company',
        position: job.title || 'Developer',
        tags: job.tags || ['developer'],
        location: job.candidate_required_location || 'Remote',
        salaryMin: job.salary_min,
        salaryMax: job.salary_max,
        url: job.url || '',
        applyUrl: job.url || '',
        description: stripHtml(job.description || ''),
        date: postedDate
      });
    }
  } catch (error: any) {
    console.error('❌ Error fetching Remotive jobs:', errorSummary(error));
  }

  return jobs;
}

function defaultSocialFeedUrls(): string[] {
  const query = '(loker OR lowongan OR hiring) (backend OR fullstack OR laravel OR nodejs OR php OR typescript) (remote OR wfh OR jogja OR yogyakarta OR magelang)';
  return [
    `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} site:instagram.com`)}&hl=id&gl=ID&ceid=ID:id`,
    `https://news.google.com/rss/search?q=${encodeURIComponent(`${query} site:threads.net OR site:threads.com`)}&hl=id&gl=ID&ceid=ID:id`
  ];
}

export async function fetchSocialRssJobs(): Promise<JobPosting[]> {
  console.log('📱 Fetching Instagram/Threads social RSS/search feeds...');

  const configuredUrls = [
    ...parseList(ENV.SOCIAL_RSS_URLS),
    ...parseList(ENV.INSTAGRAM_RSS_URLS),
    ...parseList(ENV.THREADS_RSS_URLS)
  ];
  const feedUrls = configuredUrls.length > 0 ? configuredUrls : defaultSocialFeedUrls();
  const jobs: JobPosting[] = [];

  if (configuredUrls.length === 0) {
    console.log('   ℹ️ No SOCIAL_RSS_URLS configured; using Google News social search fallback.');
  }

  for (const feedUrl of feedUrls) {
    try {
      const feed = await rssParser.parseURL(feedUrl);
      const sourceName = feed.title || new URL(feedUrl).hostname;
      console.log(`   Found ${feed.items?.length || 0} social feed items from ${sourceName}`);

      for (const item of (feed.items || []).slice(0, 20)) {
        const postedDate = getValidRecentIsoDate(item.isoDate || item.pubDate);
        const text = stripHtml(`${item.title || ''} ${item.contentSnippet || ''} ${item.content || ''}`);
        if (!postedDate || !isRelevantText(text)) continue;
        if (!isJuniorFriendlyRole(item.title || '', text)) continue;

        const link = item.link || feedUrl;
        const isInstagram = /instagram\.com/i.test(link) || /instagram/i.test(sourceName);
        const isThreads = /threads\.(net|com)/i.test(link) || /threads/i.test(sourceName);
        const platform = isInstagram ? 'Instagram' : isThreads ? 'Threads' : 'Social Feed';

        const allowedLocation = getAllowedTextLocation(text);
        if (!allowedLocation) continue;

        jobs.push({
          id: `social-${platform.toLowerCase().replace(/\s+/g, '-')}-${item.guid || link}`,
          company: platform,
          position: item.title || 'Social media job lead',
          tags: ['social-media', platform.toLowerCase(), 'loker'],
          location: allowedLocation,
          url: link,
          applyUrl: link,
          description: text,
          date: postedDate
        });
      }
    } catch (error: any) {
      console.log(`   ⚠️ Failed social feed ${feedUrl} (${errorSummary(error)})`);
    }

    await new Promise((resolve) => setTimeout(resolve, 1500));
  }

  return jobs;
}

function defaultIndonesiaJobFeedUrls(): string[] {
  const keywordGroups = [
    'backend developer remote OR wfh OR jogja OR yogyakarta OR magelang',
    'fullstack developer laravel OR nodejs OR typescript remote OR wfh OR jogja OR yogyakarta OR magelang',
    'php laravel developer remote OR wfh OR jogja OR yogyakarta OR magelang'
  ];
  const sites = [
    'glints.com',
    'jobstreet.co.id',
    'kalibrr.com',
    'dealls.com',
    'techinasia.com/jobs',
    'karir.com',
    'loker.id',
    'kitalulus.com'
  ];

  return keywordGroups.flatMap((keywordGroup) =>
    sites.map((site) =>
      `https://news.google.com/rss/search?q=${encodeURIComponent(`${keywordGroup} site:${site}`)}&hl=id&gl=ID&ceid=ID:id`
    )
  );
}

export async function fetchIndonesiaJobRssJobs(): Promise<JobPosting[]> {
  console.log('🇮🇩 Fetching extra Indonesia job boards via timestamped RSS/search...');

  const configuredUrls = parseList(ENV.INDONESIA_JOB_RSS_URLS);
  const feedUrls = configuredUrls.length > 0 ? configuredUrls : defaultIndonesiaJobFeedUrls();
  const jobs: JobPosting[] = [];

  if (configuredUrls.length === 0) {
    console.log('   ℹ️ No INDONESIA_JOB_RSS_URLS configured; using Google News search fallback for local job boards.');
  }

  for (const feedUrl of feedUrls) {
    try {
      const feed = await rssParser.parseURL(feedUrl);
      const sourceName = feed.title || new URL(feedUrl).hostname;
      const items = feed.items || [];
      console.log(`   Found ${items.length} Indonesia feed items from ${sourceName}`);

      for (const item of items.slice(0, 12)) {
        const postedDate = getValidRecentIsoDate(item.isoDate || item.pubDate);
        const text = stripHtml(`${item.title || ''} ${item.contentSnippet || ''} ${item.content || ''}`);
        if (!postedDate || !isRelevantText(text)) continue;
        if (!isJuniorFriendlyRole(item.title || '', text)) continue;

        const link = item.link || feedUrl;
        let company = 'Indonesia Job Board';
        if (/glints\.com/i.test(link) || /glints/i.test(sourceName)) company = 'Glints';
        else if (/jobstreet\.co\.id/i.test(link) || /jobstreet/i.test(sourceName)) company = 'JobStreet';
        else if (/kalibrr\.com/i.test(link) || /kalibrr/i.test(sourceName)) company = 'Kalibrr';
        else if (/dealls\.com/i.test(link) || /dealls/i.test(sourceName)) company = 'Dealls';
        else if (/techinasia\.com/i.test(link) || /tech in asia/i.test(sourceName)) company = 'Tech in Asia Jobs';
        else if (/karir\.com/i.test(link) || /karir/i.test(sourceName)) company = 'Karir.com';
        else if (/loker\.id/i.test(link) || /loker/i.test(sourceName)) company = 'Loker.id';
        else if (/kitalulus\.com/i.test(link) || /kitalulus/i.test(sourceName)) company = 'KitaLulus';

        const allowedLocation = getAllowedTextLocation(text);
        if (!allowedLocation) continue;

        jobs.push({
          id: `indo-rss-${company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${item.guid || link}`,
          company,
          position: item.title || 'Indonesia job lead',
          tags: ['indonesia-job-board', company.toLowerCase()],
          location: allowedLocation,
          url: link,
          applyUrl: link,
          description: text,
          date: postedDate
        });
      }
    } catch (error: any) {
      console.log(`   ⚠️ Failed Indonesia job feed ${feedUrl} (${errorSummary(error)})`);
    }

    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  return jobs;
}
﻿/**
 * Default RSS/search URLs for local Indonesian IT job boards: Kalibrr,
 * Tech in Asia, Loker.id, and Karir.id (Google News RSS proxies).
 */
function defaultLocalItFeedUrls(): string[] {
  const keywords = '(backend|fullstack|developer|engineer|laravel|nodejs|typescript|php)';
  const sites = ['kalibrr.jobs', 'techinasia.com/jobs', 'loker.id', 'karir.id'];
  return sites.flatMap((site) => {
    const kw = encodeURIComponent(keywords + ' ' + site);
    return `https://news.google.com/rss/search?q=${kw}&hl=id&gl=ID&ceid=ID:id`;
  });
}

/**
 * Fetch local Indonesian IT jobs from RSS boards (Kalibrr / Tech in Asia /
 * Loker.id / Karir.id) and apply pre-filters: recency, tech relevance,
 * location (Remote/Jogja/Magelang), junior-friendly role, and English level
 * (reject C1/C2/Fluent/Native/Advanced).
 */
export async function fetchLocalItJobs(): Promise<JobPosting[]> {
  console.log('🇮🇩 Fetching local IT jobs (Kalibrr, Tech in Asia, Loker.id, Karir.id)...');

  const configuredUrls = parseList(ENV.LOCAL_IT_RSS_URLS);
  const feedUrls = configuredUrls.length > 0 ? configuredUrls : defaultLocalItFeedUrls();
  const jobs: JobPosting[] = [];

  if (configuredUrls.length === 0) {
    console.log('   ℹ️ No LOCAL_IT_RSS_URLS configured; using Google News search fallback for local IT boards.');
  }

  for (const feedUrl of feedUrls) {
    try {
      const feed = await rssParser.parseURL(feedUrl);
      const sourceName = feed.title || new URL(feedUrl).hostname;
      const items = feed.items || [];
      console.log(`   Found ${items.length} local IT feed items from ${sourceName}`);

      for (const item of items.slice(0, 12)) {
        const postedDate = getValidRecentIsoDate(item.isoDate || item.pubDate);
        const text = stripHtml(`${item.title || ''} ${item.contentSnippet || ''} ${item.content || ''}`);
        if (!postedDate || !isRelevantText(text)) continue;
        if (!isJuniorFriendlyRole(item.title || '', text)) continue;

        const allowedLocation = getAllowedTextLocation(text);
        if (!allowedLocation) continue;

        const link = item.link || feedUrl;
        let company = 'Local IT Board';
        if (/kalibrr\.com/i.test(link) || /kalibrr/i.test(sourceName)) company = 'Kalibrr';
        else if (/techinasia\.com/i.test(link) || /tech in asia/i.test(sourceName)) company = 'Tech in Asia';
        else if (/loker\.id/i.test(link) || /loker/i.test(sourceName)) company = 'Loker.id';
        else if (/karir\.id/i.test(link) || /karir/i.test(sourceName)) company = 'Karir.id';

        jobs.push({
          id: `local-it-${company.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${item.guid || link}`,
          company,
          position: item.title || 'Indonesia IT job lead',
          tags: ['indonesia-local', company.toLowerCase()],
          location: allowedLocation,
          url: link,
          applyUrl: link,
          description: text,
          date: postedDate
        });
      }
    } catch (error: any) {
      console.log(`   ⚠️ Failed local IT job feed ${feedUrl} (${errorSummary(error)})`);
    }

    await new Promise((resolve) => setTimeout(resolve, 750));
  }

  return jobs;
}

export async function fetchLinkedInJobs(): Promise<JobPosting[]> {
  console.log('🔍 Fetching jobs from LinkedIn RSS feeds...');
  console.log('   ⏭️ Skipping LinkedIn guest HTML results without reliable posting timestamp.');
  return [];
}

export async function fetchAllJobSources(): Promise<JobPosting[]> {
  console.log('\n📱 SCRAPING VERIFIED-DATE JOB SOURCES ONLY...\n');

  const [glintsJobs, jobstreetJobs, wwrJobs, remotiveJobs, socialRssJobs, indonesiaRssJobs, localItJobs] = await Promise.allSettled([
    fetchGlintsJobs(),
    fetchJobStreetJobs(),
    fetchWeWorkRemotelyJobs(),
    fetchRemotiveJobs(),
    fetchSocialRssJobs(),
    fetchIndonesiaJobRssJobs(),
    fetchLocalItJobs()
  ]);

  const allJobs = [
    ...(glintsJobs.status === 'fulfilled' ? glintsJobs.value : []),
    ...(jobstreetJobs.status === 'fulfilled' ? jobstreetJobs.value : []),
    ...(wwrJobs.status === 'fulfilled' ? wwrJobs.value : []),
    ...(remotiveJobs.status === 'fulfilled' ? remotiveJobs.value : []),
    ...(socialRssJobs.status === 'fulfilled' ? socialRssJobs.value : []),
    ...(indonesiaRssJobs.status === 'fulfilled' ? indonesiaRssJobs.value : []),
    ...(localItJobs.status === 'fulfilled' ? localItJobs.value : [])
  ];

  console.log(`\n✅ Total verified fresh jobs collected (≤${MAX_JOB_AGE_HOURS}h): ${allJobs.length}`);
  console.log(`   🇮🇩 Glints Indonesia: ${glintsJobs.status === 'fulfilled' ? glintsJobs.value.length : 0}`);
  console.log(`   🇮🇩 JobStreet Indonesia: ${jobstreetJobs.status === 'fulfilled' ? jobstreetJobs.value.length : 0}`);
  console.log(`   🌐 WeWorkRemotely: ${wwrJobs.status === 'fulfilled' ? wwrJobs.value.length : 0}`);
  console.log(`   🌐 Remotive: ${remotiveJobs.status === 'fulfilled' ? remotiveJobs.value.length : 0}`);
  console.log(`   📱 Instagram/Threads RSS: ${socialRssJobs.status === 'fulfilled' ? socialRssJobs.value.length : 0}`);
  console.log(`   🇮🇩 Extra Indonesia job boards RSS: ${indonesiaRssJobs.status === 'fulfilled' ? indonesiaRssJobs.value.length : 0}`);
  console.log(`   🇮🇩 Local IT boards (Kalibrr/Techinasia/Loker/Karir): ${localItJobs.status === 'fulfilled' ? localItJobs.value.length : 0}`);
  console.log('   ⛔ LinkedIn/Indeed skipped unless reliable timestamp is available.\n');

  return allJobs;
}





