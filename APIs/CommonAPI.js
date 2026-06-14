import exp from "express";
import {UserModel} from "../models/UserModel.js";
import {compare, hash} from "bcryptjs";
import jwt from "jsonwebtoken";
import { config } from "dotenv";
import { verifyToken } from "../middlewares/verifyToken.js";
import { uploadImage } from '../config/multer.js';
import { uploadImageToCloudinary } from '../config/cloudinaryUpload.js';


export const commonApp = exp.Router();
const { sign } = jwt;
config()

commonApp.post("/register", uploadImage.single("profileImage"), async (req, res, next) => {
    const { username, email, password, role } = req.body;

    // validate role
    const allowedRoles = ['USER'];
    if (role && !allowedRoles.includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role specified" });
    }

    // check if email already exists
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered" });
    }

    // upload profile image if provided
    let profileImageUrl = "";
    if (req.file) {
      const result = await uploadImageToCloudinary(req.file.buffer);
      profileImageUrl = result.secure_url;
    }

    // hash password
    const hashedPassword = await hash(password, 12);

    // create user
    const user = await UserModel.create({
      username,
      email,
      password: hashedPassword,
      role: role || 'USER',
      profileImgurl: profileImageUrl,
    });

    res.status(201).json({
      message: "Registered successfully",
      data: { id: user._id, username: user.username, email: user.email }
    });
});

// login route
commonApp.post("/login", async (req, res, next) => {
  const { email, password } = req.body;

  const user = await UserModel.findOne({ email });
  if (!user) {
    const err = new Error("Invalid email");
    err.status = 400;
    return next(err);
  }

  if (!user.isUserActive) {
    const err = new Error("Account is deactivated");
    err.status = 403;
    return next(err);
  }

  const isMatched = await compare(password, user.password);
  if (!isMatched) {
    const err = new Error("Invalid password");
    err.status = 400;
    return next(err);
  }

  // create token
  const token = jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
      username: user.username,
      profileImgurl: user.profileImgurl,
    },
    process.env.SECRET_KEY,
    { expiresIn: "1h" }
  );

  // store in HTTP-only cookie
  res.cookie("token", token, {
    httpOnly: true,
    secure: true,       // HTTPS only (required on Render)
    sameSite: "none",   // required for cross-origin (Vercel ↔ Render)
  });

  // remove password before sending user object
  const userObj = user.toObject();
  delete userObj.password;

  res.status(200).json({ success: true, message: "Login successful", payload: userObj });
});

// logout route
commonApp.get("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
  });
  res.status(200).json({ success: true, message: "Logout successful" });
});

// page refresh
commonApp.get("/check-auth", verifyToken("USER", "ADMIN"), (req, res) => {
  res.status(200).json({ success: true, message: "Authenticated", payload: req.user });
});

// change password
commonApp.put("/password", verifyToken("USER", "ADMIN"), async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;

  if (currentPassword === newPassword) {
    const err = new Error("New password must be different from current password");
    err.status = 400;
    return next(err);
  }

  const user = await UserModel.findById(req.user.id);

  const isMatched = await compare(currentPassword, user.password);
  if (!isMatched) {
    const err = new Error("Invalid current password");
    err.status = 400;
    return next(err);
  }

  user.password = await hash(newPassword, 12);
  await user.save();

  res.status(200).json({ success: true, message: "Password changed successfully" });
});

// update profile
commonApp.put("/update-profile", verifyToken("USER", "ADMIN"), uploadImage.single("profileImage"), async (req, res, next) => {
  const { username } = req.body;
  const updates = { username };

  if (req.file) {
    const result = await uploadImageToCloudinary(req.file.buffer);
    updates.profileImgurl = result.secure_url;
  }

  const user = await UserModel.findByIdAndUpdate(req.user.id, updates, { new: true }).select("-password");

  res.status(200).json({ message: "Profile updated", data: user });
});
