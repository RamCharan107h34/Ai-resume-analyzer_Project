import express from "express";
import { verifyToken } from "../middlewares/verifyToken.js";
import { UserModel } from "../models/UserModel.js";
import { ResumeModel } from "../models/ResumeModel.js";

export const adminApp = express.Router();


// ── Get All Users ────────────────────────────────────────────
// GET /admin/users
adminApp.get("/users", verifyToken("ADMIN"), async (req, res, next) => {
  const users = await UserModel.find()
    .select("-password")
    .sort({ createdAt: -1 });

  res.status(200).json({
    message: "Users fetched successfully",
    count: users.length,
    data: users,
  });
});

// ── Get Single User ──────────────────────────────────────────
// GET /admin/users/:id
adminApp.get("/users/:id", verifyToken("ADMIN"), async (req, res, next) => {
  const user = await UserModel.findById(req.params.id).select("-password");

  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    return next(err);
  }

  res.status(200).json({
    message: "User fetched successfully",
    data: user,
  });
});

// ── Toggle User Active Status ────────────────────────────────
// PUT /admin/users/:id/toggle
adminApp.put("/users/:id/toggle", verifyToken("ADMIN"), async (req, res, next) => {
  const user = await UserModel.findById(req.params.id);

  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    return next(err);
  }

  // prevent admin from deactivating themselves
  if (user._id.toString() === req.user.id) {
    const err = new Error("You cannot deactivate your own account");
    err.status = 400;
    return next(err);
  }

  user.isUserActive = !user.isUserActive;
  await user.save();

  res.status(200).json({
    message: `User ${user.isUserActive ? "activated" : "deactivated"} successfully`,
    data: {
      id:           user._id,
      username:     user.username,
      isUserActive: user.isUserActive,
    },
  });
});

// ── Delete User ──────────────────────────────────────────────
// DELETE /admin/users/:id
adminApp.delete("/users/:id", verifyToken("ADMIN"), async (req, res, next) => {
  const user = await UserModel.findById(req.params.id);

  if (!user) {
    const err = new Error("User not found");
    err.status = 404;
    return next(err);
  }

  // prevent admin from deleting themselves
  if (user._id.toString() === req.user.id) {
    const err = new Error("You cannot delete your own account");
    err.status = 400;
    return next(err);
  }

  // delete all resumes belonging to this user too
  await ResumeModel.deleteMany({ userId: req.params.id });
  await user.deleteOne();

  res.status(200).json({
    message: "User and all their resumes deleted successfully",
  });
});

// ── Get All Resumes ──────────────────────────────────────────
// GET /admin/resumes
adminApp.get("/resumes", verifyToken("ADMIN"), async (req, res, next) => {
  const resumes = await ResumeModel.find()
    .select("-extractedText")
    .populate("userId", "username email")
    .sort({ createdAt: -1 });

  res.status(200).json({
    message: "Resumes fetched successfully",
    count: resumes.length,
    data: resumes,
  });
});

// ── Get Single Resume ────────────────────────────────────────
// GET /admin/resumes/:id
adminApp.get("/resumes/:id", verifyToken("ADMIN"), async (req, res, next) => {
  const resume = await ResumeModel.findById(req.params.id)
    .select("-extractedText")
    .populate("userId", "username email");

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

// ── Delete Resume ─────────────────────────────────────────────
// DELETE /admin/resumes/:id
adminApp.delete("/resumes/:id", verifyToken("ADMIN"), async (req, res, next) => {
  const resume = await ResumeModel.findById(req.params.id);

  if (!resume) {
    const err = new Error("Resume not found");
    err.status = 404;
    return next(err);
  }

  await resume.deleteOne();

  res.status(200).json({ message: "Resume deleted successfully" });
});

// ── Dashboard Stats ───────────────────────────────────────────
// GET /admin/stats
adminApp.get("/stats", verifyToken("ADMIN"), async (req, res, next) => {
  const [
    totalUsers,
    activeUsers,
    inactiveUsers,
    totalResumes,
    completedResumes,
    averageScores,
  ] = await Promise.all([
    UserModel.countDocuments(),
    UserModel.countDocuments({ isUserActive: true }),
    UserModel.countDocuments({ isUserActive: false }),
    ResumeModel.countDocuments(),
    ResumeModel.countDocuments({ status: "completed" }),
    ResumeModel.aggregate([
      { $match: { status: "completed" } },
      {
        $group: {
          _id:                null,
          avgOverallScore:    { $avg: "$overallScore" },
          avgAtsScore:        { $avg: "$atsScore" },
          avgMatchScore:      { $avg: "$matchScore" },
        },
      },
    ]),
  ]);

  res.status(200).json({
    message: "Stats fetched successfully",
    data: {
      users: {
        total:    totalUsers,
        active:   activeUsers,
        inactive: inactiveUsers,
      },
      resumes: {
        total:     totalResumes,
        completed: completedResumes,
      },
      averageScores: {
        overall: Math.round(averageScores[0]?.avgOverallScore ?? 0),
        ats:     Math.round(averageScores[0]?.avgAtsScore ?? 0),
        match:   Math.round(averageScores[0]?.avgMatchScore ?? 0),
      },
    },
  });
});