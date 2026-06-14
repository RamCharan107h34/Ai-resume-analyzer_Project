import { Schema, model } from 'mongoose';

// Section Scores Schema 
const sectionScoresSchema = new Schema({
  contactInfo: { type: Number, default: 0 },
  summary:     { type: Number, default: 0 },
  experience:  { type: Number, default: 0 },
  education:   { type: Number, default: 0 },
  skills:      { type: Number, default: 0 },
}, { _id: false });

// Feedback Schema 
const feedbackSchema = new Schema({
  strengths:       { type: [String], default: [] },
  weaknesses:      { type: [String], default: [] },
  suggestions:     { type: [String], default: [] },
  missingKeywords: { type: [String], default: [] },
  matchedKeywords: { type: [String], default: [] },
  sectionScores:   { type: sectionScoresSchema, default: () => ({}) },
}, { _id: false });

// Resume Schema 
const resumeSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: "User",
    required: [true, "User ID is required"],
  },
  fileName: {
    type: String,
    required: [true, "File name is required"],
  },
  fileType: {
    type: String,
    enum: ["pdf", "docx"],
    required: [true, "File type is required"],
  },
  fileUrl: {
    type: String,
    required: [true, "File URL is required"],
  },
  publicId: {
    type: String,
    required: true,
  },
  extractedText: {
    type: String,
    required: [true, "Extracted text is required"],
  },
  jobDescription: { type: String, default: "" },
  overallScore:   { type: Number, min: 0, max: 100, default: 0 },
  atsScore:       { type: Number, min: 0, max: 100, default: 0 },
  matchScore:     { type: Number, min: 0, max: 100, default: 0 },
  feedback:       { type: feedbackSchema, default: () => ({}) },
  status: {
    type: String,
    enum: ["pending", "processing", "completed", "failed"],
    default: "pending",
  },
}, { timestamps: true });

export const ResumeModel = model('Resume', resumeSchema);