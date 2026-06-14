# AI Resume Scorer — Backend

Node.js and Express backend for the AI Resume Scorer app. Handles authentication, resume uploads, AI analysis using Cohere, and file storage on Cloudinary.

---

## What's inside

```
Backend/
├── APIs/
│   ├── CommonAPI.js        register, login, logout, profile
│   ├── UserAPI.js          upload resume, history, delete
│   └── AdminAPI.js         manage users, resumes, stats
├── config/
│   ├── cloudinary.js       cloudinary SDK setup
│   ├── cloudinaryUpload.js image and file upload functions
│   └── multer.js           file upload middleware
├── middlewares/
│   └── verifyToken.js      JWT check + role guard
├── models/
│   ├── UserModel.js
│   └── ResumeModel.js
├── utils/
│   ├── extractText.js      reads text from PDF and DOCX
│   └── aiService.js        sends text to Cohere, returns scores
├── .env.example
├── package.json
└── server.js
```

---

Fill in `.env`:

```
PORT=5000
DB_URL=mongodb://localhost:27017/ai-resume-scorer
SECRET_KEY=your_jwt_secret

CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

COHERE_API_KEY=
CLIENT_URL=http://localhost:5173
```

Where to get the keys:
- Cohere — https://dashboard.cohere.com → API Keys
- Cloudinary — https://cloudinary.com → Dashboard
- MongoDB Atlas (if not local) — https://cloud.mongodb.com

---

## Models

### User

```
username        text, required, at least 3 characters
email           text, required, must be unique
password        text, required, stored as a bcrypt hash
role            USER or ADMIN — new accounts default to USER
profileImgurl   cloudinary URL for the profile photo, empty by default
isUserActive    true by default, admins can set this to false to ban a user
createdAt       set automatically
updatedAt       set automatically
```

### Resume

Each time a user uploads a resume the whole result gets saved here — the file details, the extracted text, the scores and the full feedback from the AI.

```
userId          which user uploaded this
fileName        original file name e.g. john_cv.pdf
fileType        pdf or docx
fileUrl         cloudinary URL — used for the download link
publicId        cloudinary public ID — needed to delete the file later
extractedText   raw text pulled out of the file, not sent back to the client in list views
jobDescription  optional, pasted by the user for match scoring
overallScore    0 to 100
atsScore        0 to 100
matchScore      0 to 100, defaults to 50 if no job description was given
status          pending → processing → completed or failed
createdAt       set automatically
updatedAt       set automatically
```

The `feedback` field is a nested object:

```
strengths           array of strings — what the resume does well
weaknesses          array of strings — what needs work
suggestions         array of strings — specific things to improve
matchedKeywords     keywords from the job description found in the resume

sectionScores
  contactInfo       0 to 100
  summary           0 to 100
  experience        0 to 100
  education         0 to 100
  skills            0 to 100
```

---

## Routes

### /auth

```
POST   /auth/register             create account (multipart — supports profile image)
POST   /auth/login                login, sets HTTP-only cookie
GET    /auth/logout               clears the cookie
GET    /auth/check-auth           used on page refresh to restore session
PUT    /auth/update-profile       change username or profile photo
PUT    /auth/password             change password
```

### /user — requires login

```
POST   /user/resume               upload PDF or DOCX, runs AI scoring
GET    /user/resumes              get all resumes for the logged-in user
GET    /user/resumes/:id          get one resume with full feedback
DELETE /user/resumes/:id          delete from MongoDB and Cloudinary
```

### /admin — requires ADMIN role

```
GET    /admin/users               all users
GET    /admin/users/:id           one user
PUT    /admin/users/:id/toggle    activate or deactivate a user
DELETE /admin/users/:id           delete user and all their resumes
GET    /admin/resumes             all resumes from all users
GET    /admin/resumes/:id         one resume
DELETE /admin/resumes/:id         delete any resume
GET    /admin/stats               total users, resumes and average scores
```

---

## How resume upload works

When a resume is uploaded the backend does five things in order:

1. Multer reads the file into memory as a buffer — nothing is written to disk
2. The buffer is passed to `extractText()` which uses pdfjs-dist for PDFs and mammoth for DOCX files
3. The same buffer is uploaded to Cloudinary and stored as a raw file
4. The extracted text is sent to Cohere with a structured prompt asking for scores and feedback in JSON
5. Everything — file details, extracted text, scores, feedback — is saved to MongoDB and the scores are returned to the client

---