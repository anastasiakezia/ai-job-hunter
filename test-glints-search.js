const axios = require('axios');
const cheerio = require('cheerio');
const headers = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.9,id;q=0.8'
};

function collectObjects(value, predicate, output) {
  if (!value || typeof value !== 'object') return output || [];
  if (!output) output = [];
  if (predicate(value)) output.push(value);
  if (Array.isArray(value)) {
    for (const item of value) collectObjects(item, predicate, output);
    return output;
  }
  for (const item of Object.values(value)) collectObjects(item, predicate, output);
  return output;
}

async function searchGlints(qs) {
  const url = `https://glints.com/id/opportunities/jobs/explore?keyword=${encodeURIComponent(qs)}`;
  const res = await axios.get(url, { headers, timeout: 15000 });
  const $ = cheerio.load(res.data);
  const nd = JSON.parse($('#__NEXT_DATA__').html());
  const allJobs = collectObjects(nd, j => j?.__typename === 'Job' && j?.title && j?.id);
  
  const now = Date.now();
  const recent = allJobs.filter(j => {
    const d = new Date(j.createdAt || j.updatedAt).getTime();
    const age = (now - d) / 3600000;
    return age >= 0 && age <= 24;
  });
  
  console.log(`Search: "${qs}" -> ${allJobs.length} jobs, ${recent.length} recent (<24h)`);
  recent.forEach(j => {
    const isRemote = j.workArrangementOption === 'REMOTE';
    const loc = j.location?.parents?.map(p => p.name).join(' > ') || '';
    const exp = `${j.minYearsOfExperience}-${j.maxYearsOfExperience}`;
    console.log(`  ${j.title} @ ${j.company?.name} | ${j.workArrangementOption} | ${loc} | exp: ${exp}yrs | isSenior: ${exp.includes('5') || exp.includes('10')}`);
  });
}

async function run() {
  const queries = [
    'backend remote',
    'backend jogja',
    'backend yogyakarta',
    'laravel remote',
    'nodejs remote',
    'fullstack remote',
    'backend magelang',
  ];

  for (const q of queries) {
    try {
      await searchGlints(q);
      await new Promise(r => setTimeout(r, 1500));
    } catch(e) {
      console.log(`Search: "${q}" -> Error: ${e.message}`);
    }
  }
}

run();
