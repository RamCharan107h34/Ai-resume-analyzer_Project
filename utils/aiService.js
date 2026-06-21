import { CohereClient } from "cohere-ai";
import { config } from "dotenv";
config();

const cohere = new CohereClient({ token: process.env.COHERE_API_KEY });

// Prompt Builder
const buildPrompt = (resumeText, jobDescription = "") => {
  const jobSection = jobDescription
    ? `JOB DESCRIPTION: ${jobDescription}`: "";
    return ` You are a strict ATS recruiter.
    Analyze the resume critically and do not inflate scores.
    Only exceptional resumes should score above 90.
    Average resumes should score between 50 and 80.
    ${jobSection}RESUME: ${resumeText}
    Rules:
    - overallScore: overall resume quality (0-100)
    - atsScore: ATS friendliness (0-100)
    - matchScore: job match score (0-100)
    - If no job description is provided, set matchScore to 50.
    - Deduct points for missing sections, weak content, poor formatting, and lack of achievements.
    - Reward quantified achievements, projects, skills, internships, and relevant experience.
    - Return only valid JSON.
    {
      "overallScore": number,
      "atsScore": number,
      "matchScore": number,
      "feedback": {
      "strengths": [],
      "weaknesses": [],
      "suggestions": [],
      "missingKeywords": [],
      "matchedKeywords": [],
      "sectionScores": {
        "contactInfo": number,
        "summary": number,
        "experience": number,
        "education": number,
        "skills": number
      }
    }
  }
}`;
};

//  Clean and extract JSON from response 
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
    temperature: 0.3,
  });

  return extractJSON(response.text);
};