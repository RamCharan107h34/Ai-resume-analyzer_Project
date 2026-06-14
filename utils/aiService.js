import { CohereClient } from "cohere-ai";
import { config } from "dotenv";
config();

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

// Prompt Builder
const buildPrompt = (resumeText, jobDescription = "") => {
  const jobDescriptionSection = jobDescription
    ? `JOB DESCRIPTION:\n${jobDescription}\n\n`
    : "";

  return `You are an expert ATS (Applicant Tracking System) and professional resume coach.
Analyze the resume below and return a detailed JSON evaluation.

${jobDescriptionSection}RESUME:
${resumeText}

IMPORTANT: Return ONLY a raw JSON object. No markdown, no backticks, no explanation, no extra text before or after.

Use exactly this structure:
{
  "overallScore": 75,
  "atsScore": 80,
  "matchScore": 50,
  "feedback": {
    "strengths": ["strength one", "strength two", "strength three"],
    "weaknesses": ["weakness one", "weakness two", "weakness three"],
    "suggestions": ["suggestion one", "suggestion two", "suggestion three"],
    "missingKeywords": [],
    "matchedKeywords": [],
    "sectionScores": {
      "contactInfo": 80,
      "summary": 60,
      "experience": 75,
      "education": 70,
      "skills": 65
    }
  }
}

Rules:
- overallScore: overall resume quality as a number 0 to 100
- atsScore: ATS friendliness as a number 0 to 100
- matchScore: match with job description as a number 0 to 100, return 50 if no JD provided
- strengths: array of 3 to 5 strings, each string must be complete and not contain quotes
- weaknesses: array of 3 to 5 strings, each string must be complete and not contain quotes
- suggestions: array of 4 to 6 strings, each string must be complete and not contain quotes
- missingKeywords: array of strings, empty array if no JD provided
- matchedKeywords: array of strings, empty array if no JD provided
- all scores must be plain numbers with no quotes
- do not use apostrophes or single quotes inside string values`;
};

// ── Clean and extract JSON from response ─────────────────────
const extractJSON = (text) => {
  const start = text.indexOf("{");
  const end   = text.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("No valid JSON object found in AI response");
  }

  const sliced = text.slice(start, end + 1);

  // normalize all whitespace to standard spaces/newlines
  const normalized = sliced
    .replace(/\r\n/g, "\n")   // windows line endings
    .replace(/\r/g, "\n")     // old mac line endings
    .replace(/\t/g, " ")      // tabs to spaces
    .replace(/\u00a0/g, " ")  // non-breaking space
    .replace(/\u2018|\u2019/g, "'")   // smart single quotes
    .replace(/\u201c|\u201d/g, '"');  // smart double quotes

  return JSON.parse(normalized);
};

// Score Resume 
export const scoreResume = async (resumeText, jobDescription = "") => {
  const prompt = buildPrompt(resumeText, jobDescription);

  const response = await cohere.chat({
    model: "command-a-03-2025",
    message: prompt,
    temperature: 0.1,   // very low = most consistent structured output
  });

  return extractJSON(response.text);
};