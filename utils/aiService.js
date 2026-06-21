import { CohereClient } from "cohere-ai";
import { config } from "dotenv";
config();

const cohere = new CohereClient({
  token: process.env.COHERE_API_KEY,
});

// Prompt Builder
const buildPrompt = (resumeText, jobDescription = "") => {
  const jobSection = jobDescription
    ? `JOB DESCRIPTION:${jobDescription}`: "";
    return ` You are an ATS recruiter and resume reviewer. Analyze the resume critically.
    Overall Score:
    - Measures overall resume quality.
    - Consider projects, education, skills, internships, and achievements.
    - Students should not be heavily penalized for lack of work experience.
    ATS Score:
    - Measures the likelihood of passing an ATS screening.
    - Deduct points for:
    - Missing experience
    - Missing certifications
    - Missing keywords
    - Missing summary
    - Weak skills section
    - Lack of measurable achievements
    Scoring Guide:
    90-100: Exceptional resume.
    80-89: Strong resume.
    70-79: Good resume.
    60-69: Average resume.
    40-59: Weak resume.
    0-39: Poor resume.
    Only exceptional resumes should score above 90.
    ${jobSection}RESUME: ${resumeText}
    Rules:
    - overallScore: 0-100
    - atsScore: 0-100
    - matchScore: 0-100
    - If no job description is provided, set matchScore to 50.
    - Return only valid JSON.
    - Do not include markdown or explanations.
    - Response must start with { and end with }.
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
}
};
`};

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