import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { uploadResume } from "../config/multer.js";
import { uploadResumeToCloudinary } from "../config/cloudinaryUpload.js";
import cloudinary from "../config/cloudinary.js";
import { extractText } from "../utils/extractText.js";
import { scoreResume } from "../utils/aiService.js";
import { ResumeModel } from "../models/ResumeModel.js";

export const userApp = express.Router();

//  Upload + Score Resume 
// POST /api/user/resume
userApp.post("/resume", verifyToken("USER","ADMIN"), uploadResume.single("resume"), async (req, res, next) => {
    // check file exists
    if (!req.file) {
        const err = new Error("No file uploaded");
        err.status = 400;
        return next(err);
    }

    const { jobDescription = "" } = req.body;
    const { buffer, mimetype, originalname } = req.file;

    // get file type from mimetype
    const fileType = mimetype === "application/pdf" ? "pdf" : "docx";

    // extract text from buffer
    const extractedText = await extractText(buffer, mimetype);

    // upload file to cloudinary
    // upload file to cloudinary
    const cloudinaryResult = await uploadResumeToCloudinary(
        buffer,
        originalname
    );
    const fileUrl = cloudinaryResult.secure_url;
    const publicId = cloudinaryResult.public_id;
    // console.log("Cloudinary Public ID:", publicId);

    // send text to gemini and get scores
    const scores = await scoreResume(extractedText, jobDescription);

    // save everything to mongodb
    const resume = await ResumeModel.create({
        userId:        req.user.id,
        fileName:      originalname,
        fileType,
        fileUrl,
        publicId,
        extractedText,
        jobDescription,
        overallScore:  scores.overallScore,
        atsScore:      scores.atsScore,
        matchScore:    scores.matchScore,
        feedback:      scores.feedback,
        status:        "completed",
    });

    //return response
    res.status(201).json({
        message: "Resume uploaded and scored successfully",
        data: {
            resumeId:     resume._id,
            fileName:     resume.fileName,
            fileUrl:      resume.fileUrl,
            overallScore: resume.overallScore,
            atsScore:     resume.atsScore,
            matchScore:   resume.matchScore,
            feedback:     resume.feedback,
            status:       resume.status,
        },
    });
});

//  Get Resume History 
// GET /api/user/resumes
userApp.get("/resumes", verifyToken("USER","ADMIN"), async (req, res, next) => {
    const resumes = await ResumeModel.find({ userId: req.user.id })
        .select("-extractedText")   // too heavy to send in list
        .sort({ createdAt: -1 })    // latest first
        .limit(20);

    res.status(200).json({
        message: "Resume history fetched successfully",
        data: resumes,
    });
});

//  Get Single Resume Result 
// GET /api/user/resumes/:id
userApp.get("/resumes/:id", verifyToken("USER","ADMIN"), async (req, res, next) => {
    const resume = await ResumeModel.findOne({
        _id:    req.params.id,
        userId: req.user.id,        // make sure it belongs to this user
    }).select("-extractedText");

    if (!resume) {
        const err = new Error("Resume not found");
        err.status = 404;
        return next(err);
    }

    res.status(200).json({
        message: "Resume fetched successfully",
        data: resume,
    });
});

// Delete Resume
// DELETE /api/user/resumes/:id
userApp.delete("/resumes/:id", verifyToken("USER","ADMIN"), async (req, res, next) => {
  const resume = await ResumeModel.findOne({
    _id:    req.params.id,
    userId: req.user.id,
  });

  if (!resume) {
    const err = new Error("Resume not found");
    err.status = 404;
    return next(err);
  }

  // pick correct resource type based on file type
  const resourceType = resume.fileType === "pdf" ? "image" : "raw";

  await cloudinary.uploader.destroy(resume.publicId, {
    resource_type: "raw",
  });

  await resume.deleteOne();

  res.status(200).json({ message: "Resume deleted successfully" });
});

// rescore
userApp.post("/resumes/:id/rescore", verifyToken("USER","ADMIN"), async (req, res, next) => {
  const { jobDescription = "" } = req.body;

  const resume = await ResumeModel.findOne({
    _id:    req.params.id,
    userId: req.user.id,
  });

  if (!resume) {
    const err = new Error("Resume not found");
    err.status = 404;
    return next(err);
  }

  // re-use already extracted text — no file needed
  const scores = await scoreResume(resume.extractedText, jobDescription);

  // update existing document
  resume.jobDescription = jobDescription;
  resume.overallScore   = scores.overallScore;
  resume.atsScore       = scores.atsScore;
  resume.matchScore     = scores.matchScore;
  resume.feedback       = scores.feedback;
  await resume.save();

  res.status(200).json({
    message: "Resume re-scored successfully",
    data: {
      resumeId:     resume._id,
      fileName:     resume.fileName,
      fileUrl:      resume.fileUrl,
      overallScore: resume.overallScore,
      atsScore:     resume.atsScore,
      matchScore:   resume.matchScore,
      feedback:     resume.feedback,
      status:       resume.status,
    },
  });
});