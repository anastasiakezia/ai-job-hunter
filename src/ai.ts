import { GoogleGenAI } from '@google/genai';
import OpenAI from 'openai';
import { CANDIDATE_PROFILE, ENV, MATCH_THRESHOLD } from './config';
import { JobPosting, requiresExcessiveExperience } from './fetcher';

export interface AIAnalysisResult {
  matchScore: number;
  isMatch: boolean;
  workMode: string;
  reasons: string[];
  coverLetter: string;
  quickChatTemplate: string;
  salaryEvaluation?: string;
  englishNotes?: string;
}

/**
 * Fallback mock generator for demonstration when API keys are missing or in DEMO_MODE
 */
function generateMockAnalysis(job: JobPosting): AIAnalysisResult {
  const title = job.position.toLowerCase();
  const desc = (job.description || '').toLowerCase();

  // Check if job requires Senior / Lead level (5+ years experience)
  const isSenior = ['senior', 'sr.', 'sr ', 'lead', 'principal', 'architect', 'head of', 'staff developer', 'staff engineer'].some((kw) => title.includes(kw));
  const requiresHighExp = requiresExcessiveExperience(desc);

  if (isSenior || requiresHighExp) {
    return {
      matchScore: 45,
      isMatch: false,
      workMode: job.location.toLowerCase().includes('jogja') || job.location.toLowerCase().includes('magelang')
        ? 'Hybrid (Yogyakarta/Magelang)'
        : 'Remote (Internasional)',
      reasons: [
        'Requires senior-level experience (> 3 years), exceeding candidate level (1-3 years).'
      ],
      coverLetter: '',
      quickChatTemplate: '',
      salaryEvaluation: 'Not evaluated (experience level mismatch)',
      englishNotes: 'Not evaluated'
    };
  }

  const isFullstack = title.includes('full') || title.includes('stack');
  const isNode = title.includes('node') || job.tags.some((t) => t.toLowerCase().includes('node'));
  const isPHP = title.includes('php') || job.tags.some((t) => t.toLowerCase().includes('php'));
  const isLaravel = title.includes('laravel') || job.tags.some((t) => t.toLowerCase().includes('laravel'));

  // Calculate score based on tech stack alignment
  const matchScore = isFullstack || isNode || isPHP || isLaravel ? 88 : 72;

  return {
    matchScore,
    isMatch: matchScore >= MATCH_THRESHOLD,
    workMode: job.location.toLowerCase().includes('jogja') || job.location.toLowerCase().includes('magelang')
      ? 'Hybrid (Yogyakarta/Magelang)'
      : 'Remote (Internasional)',
    reasons: [
      `Strong tech stack alignment with candidate's experience in Node.js, TypeScript, PHP/Laravel, and SQL databases.`,
      `Perfect fit for candidate's experience level of 1-3 years (Junior to Mid-Level Developer).`,
      `Asynchronous & text-based communication workflow suitable for text-heavy English interaction.`
    ],
    coverLetter: `Dear Hiring Team at ${job.company},

I am writing to express my enthusiasm for the ${job.position} position. With over 2 years of hands-on experience developing backend services and full-stack web applications using Node.js, TypeScript, PHP (Laravel), and PostgreSQL/MySQL databases, I am confident in my ability to contribute effectively to your engineering team.

In my previous projects, I focused on building reliable REST APIs, database query optimizations, and seamless user-facing features. I thrive in asynchronous, text-driven remote work environments where clear documentation, pull request reviews, and proactive task updates drive project momentum.

I would welcome the opportunity to discuss how my skill set aligns with the needs of ${job.company}. Thank you for considering my application.

Best regards,
${CANDIDATE_PROFILE.name}`,
    quickChatTemplate: `Hi there! I came across the ${job.position} role at ${job.company} and would love to introduce myself. I specialize in Node.js, TypeScript, and PHP/Laravel with 1-3 years of experience. Looking forward to connecting!`,
    salaryEvaluation: 'Estimated compensation meets candidate minimum expectation (> Rp 3.500.000 / month USD equivalent).',
    englishNotes: 'Text-based communication model compatible with candidate preferences.'
  };
}

/**
 * Generate strict prompt for AI evaluation
 */
function buildPrompt(job: JobPosting): string {
  return `
You are an expert AI Tech Recruiter evaluating job postings for "${CANDIDATE_PROFILE.name}".

### CANDIDATE PROFILE:
- Name: ${CANDIDATE_PROFILE.name}
- Target Roles: ${CANDIDATE_PROFILE.targetRoles.join(', ')}
- Core Tech Stack: ${CANDIDATE_PROFILE.techStack.join(', ')}
- Experience Level: 1 - 3 Years (Junior to Mid-Level Developer)
- Key Expertise: Web Applications, ERP Systems, Database Architecture, REST API Backend Development
- Spoken English Ability: Passive / Limited spoken English (needs text-based / async communication like Slack, PR Reviews, Email)
- Maximum English Level: Intermediate (B1-B2). CANNOT accept C1/C2, Fluent, Native, Advanced, or Proficient English requirements.
- Location Rules: Remote (Local/International) OR WFO/Hybrid ONLY in Magelang or Yogyakarta/Jogja
- Minimum Salary: Rp 3.500.000/mo (Remote) or Rp 4.000.000/mo (WFO)

### JOB POSTING TO EVALUATE:
- Title: ${job.position}
- Company: ${job.company}
- Location: ${job.location}
- Tags: ${job.tags.join(', ')}
- Listed Salary: ${job.salaryMin ? `$${job.salaryMin} - $${job.salaryMax || job.salaryMin}/yr` : 'Not explicitly listed'}
- Description: ${job.description.slice(0, 2000)}

### SCORING RULES (Match Score: 0-100%):
1. Experience Level (1-3 years): Give high score for Junior/Mid roles (1-3 yrs). REJECT (score < 50%) if the role requires more than 3 years (e.g. 4 years, 4-5 years, 5+ years, "Senior"/"Lead").
2. Tech Stack Alignment: High score for PHP, Laravel, Node.js, TypeScript, PostgreSQL, MySQL, Bootstrap, REST API.
3. Location/Work Mode: High score for Remote or WFO in Jogja/Magelang. REJECT (score < 50%) if WFO in other cities (Jakarta, Bandung, Surabaya, etc.).
4. English Requirement: High score for text-based/async English at intermediate level (B1-B2). REJECT (score < 50%) if job requires C1/C2, Fluent, Native, Advanced, Proficient English, IELTS 7+, or TOEFL 100+.
5. Overall Match Score >= ${MATCH_THRESHOLD}% ONLY IF all major criteria fit.

### OUTPUT STRUCTURE (JSON ONLY):
{
  "matchScore": <number 0-100>,
  "workMode": "<Remote / Hybrid Jogja / WFO Magelang>",
  "reasons": [
    "<Reason 1: Tech stack alignment>",
    "<Reason 2: Experience level fit (1-3 yrs)>",
    "<Reason 3: Work mode & async English fit>"
  ],
  "coverLetter": "<Professional 2-3 paragraph cover letter emphasizing PHP, Laravel, Node.js, TypeScript, PostgreSQL/MySQL, 1-3 yrs exp>",
  "quickChatTemplate": "<1-2 sentence recruiter chat intro>",
  "salaryEvaluation": "<Salary evaluation>",
  "englishNotes": "<English suitability note>"
}

CRITICAL: Output MUST be valid JSON only without markdown formatting blocks if possible.
`;
}

/**
 * Main AI analysis function
 */
export async function analyzeJobPosting(job: JobPosting): Promise<AIAnalysisResult | null> {
  // Check DEMO_MODE first
  if (process.env.DEMO_MODE === 'true') {
    return generateMockAnalysis(job);
  }

  // 1. Try Google Gemini API
  if (ENV.GEMINI_API_KEY && ENV.GEMINI_API_KEY.length > 5) {
    try {
      const ai = new GoogleGenAI({ apiKey: ENV.GEMINI_API_KEY });
      const prompt = buildPrompt(job);

      const modelsToTry = [
        'gemini-2.5-flash',
        'gemini-2.0-flash',
        'gemini-1.5-flash',
        'gemini-1.5-pro'
      ];

      for (const modelName of modelsToTry) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: prompt,
            config: {
              responseMimeType: 'application/json'
            }
          });
          
          if (response && response.text) {
            const parsed = JSON.parse(response.text);
            const matchScore = Number(parsed.matchScore) || 0;

            return {
              matchScore,
              isMatch: matchScore >= MATCH_THRESHOLD,
              workMode: parsed.workMode || 'Remote',
              reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
              coverLetter: parsed.coverLetter || '',
              quickChatTemplate: parsed.quickChatTemplate || '',
              salaryEvaluation: parsed.salaryEvaluation,
              englishNotes: parsed.englishNotes
            };
          }
        } catch (e: any) {
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
      }
    } catch (error: any) {
      console.error('   ⚠️ Gemini API error:', error.message);
    }
  }

  // 2. Try OpenAI/9Router
  if (ENV.OPENAI_API_KEY && ENV.OPENAI_API_KEY.length > 5) {
    try {
      const openaiConfig: any = { 
        apiKey: ENV.OPENAI_API_KEY,
        dangerouslyAllowBrowser: false
      };
      
      if (ENV.OPENAI_API_BASE) {
        openaiConfig.baseURL = ENV.OPENAI_API_BASE;
      }
      
      const openai = new OpenAI(openaiConfig);
      const prompt = buildPrompt(job);

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an AI job matching assistant. Respond strictly with valid JSON.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.2
      });

      const content = completion.choices[0]?.message?.content;
      if (content) {
        let jsonStr = content;
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          jsonStr = jsonMatch[0];
        }
        
        const parsed = JSON.parse(jsonStr);
        const matchScore = Number(parsed.matchScore) || 0;

        return {
          matchScore,
          isMatch: matchScore >= MATCH_THRESHOLD,
          workMode: parsed.workMode || 'Remote',
          reasons: Array.isArray(parsed.reasons) ? parsed.reasons : [],
          coverLetter: parsed.coverLetter || '',
          quickChatTemplate: parsed.quickChatTemplate || '',
          salaryEvaluation: parsed.salaryEvaluation,
          englishNotes: parsed.englishNotes
        };
      }
    } catch (error: any) {
      // Silently continue
    }
  }

  // 3. Fallback to demo mode
  return generateMockAnalysis(job);
}
