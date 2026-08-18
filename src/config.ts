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
  INDONESIA_JOB_RSS_URLS: (process.env.INDONESIA_JOB_RSS_URLS || '').trim()
};


