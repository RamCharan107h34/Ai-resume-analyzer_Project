import cloudinary from "./cloudinary.js";

// Profile image upload
export const uploadImageToCloudinary = (buffer) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder: "resume-app/profiles",
        resource_type: "image",
        transformation: [{ width: 300, height: 300, crop: "fill" }],
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};

// Resume PDF/DOCX upload — stored as actual file
export const uploadResumeToCloudinary = (buffer, originalName) => {
  const ext = originalName.split(".").pop().toLowerCase();
  const nameWithoutExt = originalName
    .replace(/\.[^.]+$/, "")
    .replace(/\s+/g, "_");

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder:        "resume-app/resumes",
        resource_type: "raw",   // ← back to raw for all files
        format:        ext,
        public_id:     `${Date.now()}-${nameWithoutExt}`,
      },
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
    stream.end(buffer);
  });
};