import { CohereClient } from "cohere-ai";
import { config } from "dotenv";
config();

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

// Prompt Builder
const buildPrompt = (resumeText, jobDescription = "") => {
  const jobSection = jobDescription
    ? `JOB DESCRIPTION:
${jobDescription}

`
    : "";

  return `
You are a strict ATS recruiter.

Analyze the resume critically and do not inflate scores.

Only exceptional resumes should score above 90.
Average resumes should score between 50 and 80.

${jobSection}

RESUME:
${resumeText}

Rules:
- overallScore: overall resume quality (0-100)
- atsScore: ATS friendliness (0-100)
- matchScore: job match score (0-100)
- If no job description is provided, set matchScore to 50.
- Deduct points for missing sections, weak content, poor formatting, and lack of achievements.
- Reward quantified achievements, projects, skills, internships, certifications, and relevant experience.

IMPORTANT:
- Return ONLY valid JSON.
- The response must begin with { and end with }.
- Do not include markdown.
- Do not include explanations.
- Do not include code blocks.
- The JSON must work directly with JSON.parse().

{
  "overallScore": 0,
  "atsScore": 0,
  "matchScore": 0,
  "feedback": {
    "strengths": ["string"],
    "weaknesses": ["string"],
    "suggestions": ["string"],
    "missingKeywords": [],
    "matchedKeywords": [],
    "sectionScores": {
      "contactInfo": 0,
      "summary": 0,
      "experience": 0,
      "education": 0,
      "skills": 0
    }
  }
}
`;
};

// Extract JSON safely
const extractJSON = (text) => {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");

  if (start === -1 || end === -1) {
    throw new Error("No valid JSON found.");
  }

  let json = text.slice(start, end + 1);

  json = json
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\t/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\u2018|\u2019/g, "'")
    .replace(/\u201c|\u201d/g, '"')
    .replace(/,\s*}/g, "}")
    .replace(/,\s*]/g, "]");

  try {
    return JSON.parse(json);
  } catch (error) {
    console.error("Invalid JSON from Cohere:");
    console.log(json);
    throw error;
  }
};

// Score Resume
export const scoreResume = async (
  resumeText,
  jobDescription = ""
) => {
  try {
    const prompt = buildPrompt(
      resumeText,
      jobDescription
    );

    const response = await cohere.chat({
      model: "command-a-03-2025",
      message: prompt,
      temperature: 0.1,
    });

    console.log("AI Response:");
    console.log(response.text);

    return extractJSON(response.text);
  } catch (error) {
    console.error("Resume Analysis Error:", error);

    return {
      overallScore: 0,
      atsScore: 0,
      matchScore: 0,
      feedback: {
        strengths: [
          "Analysis could not be completed."
        ],
        weaknesses: [
          "AI returned an invalid response."
        ],
        suggestions: [
          "Please try uploading the resume again."
        ],
        missingKeywords: [],
        matchedKeywords: [],
        sectionScores: {
          contactInfo: 0,
          summary: 0,
          experience: 0,
          education: 0,
          skills: 0,
        },
      },
    };
  }
};