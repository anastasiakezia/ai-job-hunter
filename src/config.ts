import dotenv from 'dotenv';
dotenv.config();

export interface CandidateProfile {
  name: string;
  roleTitle: string;
  targetRoles: string[];
  techStack: string[];
  experienceYears: {
    min: number;
    max: number;
    description: string;
  };
  englishSkills: {
    spoken: string;
    written: string;
    preferredMode: string;
    avoidCriteria: string[];
  };
  salaryRules: {
    remoteMinIDRPerMonth: number;
    wfoHybridMinIDRPerMonth: number;
    allowedWfoLocations: string[];
  };
  experienceAreas: string[];
}

export const CANDIDATE_PROFILE: CandidateProfile = {
  name: 'Anastasia Kezia',
  roleTitle: 'Backend / Fullstack Developer',
  targetRoles: [
    'Backend Developer',
    'Fullstack Developer',
    'Full Stack Developer',
    'Software Engineer',
    'Programmer',
    'Web Developer'
  ],
  techStack: [
    'PHP',
    'Laravel',
    'Node.js',
    'JavaScript',
    'TypeScript',
    'PostgreSQL',
    'MySQL',
    'HTML',
    'CSS',
    'Bootstrap',
    'Git',
    'GitHub',
    'REST API'
  ],
  experienceYears: {
    min: 1,
    max: 3,
    description: '1 - 3 Tahun (Junior s/d Mid-level)'
  },
  experienceAreas: [
    'Web Application Development',
    'ERP System Management',
    'Database Architecture & Design',
    'REST API Development & Integration',
    'Backend Development'
  ],
  englishSkills: {
    spoken: 'Pasif - masih terbata-bata untuk percakapan lisan/speaking',
    written: 'Aktif - terbiasa membaca & menulis dokumentasi, chat, email',
    preferredMode: 'Asynchronous / Text-based communication (Slack, Email, GitHub PR, Documentation)',
    avoidCriteria: [
      'Native English Speaker',
      'Fluent Spoken English Required',
      'Daily Client Calls',
      'Heavy Phone Communication',
      'Client-Facing Presentations'
    ]
  },
  salaryRules: {
    remoteMinIDRPerMonth: 3500000, // Rp 3.500.000 / bulan
    wfoHybridMinIDRPerMonth: 4000000, // Rp 4.000.000 / bulan
    allowedWfoLocations: ['magelang', 'yogyakarta', 'jogja']
  }
};

export const MATCH_THRESHOLD = 75; // Minimum match score percentage (75%)

// Maximum job age in HOURS (24 hours = 1 day)
export const MAX_JOB_AGE_HOURS = 24;

export const ENV = {
  GEMINI_API_KEY: (process.env.GEMINI_API_KEY || '').trim(),
  OPENAI_API_KEY: (process.env.OPENAI_API_KEY || '').trim(),
  OPENAI_API_BASE: (process.env.OPENAI_API_BASE || '').trim(),
  TELEGRAM_BOT_TOKEN: (process.env.TELEGRAM_BOT_TOKEN || '').trim(),
  TELEGRAM_CHAT_ID: (process.env.TELEGRAM_CHAT_ID || '').trim(),
  SOCIAL_RSS_URLS: (process.env.SOCIAL_RSS_URLS || '').trim(),
  INSTAGRAM_RSS_URLS: (process.env.INSTAGRAM_RSS_URLS || '').trim(),
  THREADS_RSS_URLS: (process.env.THREADS_RSS_URLS || '').trim(),
  INDONESIA_JOB_RSS_URLS: (process.env.INDONESIA_JOB_RSS_URLS || '').trim(),
  LOCAL_IT_RSS_URLS: (process.env.LOCAL_IT_RSS_URLS || '').trim()
};



export const NON_TECH_REJECT_KEYWORDS = [
  // Haji / Keagamaan / Instansi Pemerintah
  'haji', 'ppih', 'kemenag', 'petugas haji', 'ibadah haji', 'umroh', 'kemenkes',
  'cpns', 'pns', 'asn', 'pppk', 'bumn', 'tni', 'polri', 'polisi', 'tentara',
  'kelurahan', 'kecamatan', 'pemda', 'pemprov', 'dinas', 'kementerian',
  // Non-tech jobs (ID & EN)
  'guru', 'dosen', 'pengajar', 'tutor', 'ustadz', 'ustadzah',
  'perawat', 'bidan', 'dokter', 'medis', 'apoteker', 'farmasi', 'laboratorium',
  'satpam', 'security', 'penjaga', 'cleaning service', 'ob', 'office boy', 'office girl', 'cleaner', 'kebersihan',
  'koki', 'chef', 'cook', 'barista', 'waiter', 'waitress', 'pelayan', 'kasir', 'cashier', 'pramusaji', 'kitchen',
  'driver', 'supir', 'sopir', 'kurir', 'courier', 'ojol', 'helper', 'kenek', 'gudang', 'warehouse', 'packer', 'packing',
  'sales', 'salesman', 'telemarketing', 'marketing executive', 'spg', 'spb', 'promotor', 'account executive',
  'admin', 'administrasi', 'operator', 'jahit', 'sewing', 'konveksi', 'montir', 'mekanik', 'mechanic', 'teknisi ac', 'teknisi listrik',
  'estimator', 'smash repairs', 'labourer', 'laborer', 'nurse', 'accountant', 'akuntan', 'finance', 'pajak', 'tax',
  'receptionist', 'customer service', 'cs', 'call center', 'teller',
  'content creator', 'content writer', 'copywriter', 'social media specialist', 'seo specialist', 'video editor', 'graphic designer', 'desain grafis'
];

export const TECH_ROLE_KEYWORDS = [
  'developer', 'programmer', 'software engineer', 'software development',
  'backend', 'back-end', 'back end',
  'fullstack', 'full-stack', 'full stack',
  'frontend', 'front-end', 'front end',
  'web developer', 'web programmer',
  'laravel', 'php', 'node', 'nodejs', 'node.js',
  'typescript', 'javascript', 'react', 'vue', 'nextjs', 'nest.js', 'nestjs',
  'golang', 'python', 'java developer', 'golang developer',
  'rest api', 'api developer', 'database engineer', 'devops', 'system engineer'
];

export const ENGLISH_LEVEL_REJECT_KEYWORDS = [
  "c1 level",
  "c2 level",
  "c1/c2",
  "cefr c1",
  "cefr c2",
  "english c1",
  "english c2",
  "english: c1",
  "english: c2",
  "english (c1)",
  "english (c2)",
  "does not meet c1",
  "c1 proficiency",
  "c1/c2 english",
  "advanced english",
  "advanced english proficiency",
  "advanced english skills",
  "proficient english",
  "fluent english",
  "fluent spoken english",
  "fluent english required",
  "must speak fluent english",
  "native english",
  "native speaker",
  "native english speaker",
  "english: native",
  "english (native)",
  "english proficiency: native",
  "professional english",
  "business english fluency",
  "full professional proficiency",
  "minimum english c1",
  "ielts 7",
  "ielts 7.5",
  "ielts 8",
  "ielts 7+",
  "toefl 100",
  "toefl 110",
  "bahasa inggris c1",
  "bahasa inggris c2",
  "inggris c1",
  "inggris c2",
];
