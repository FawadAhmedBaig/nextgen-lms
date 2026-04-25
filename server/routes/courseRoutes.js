import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import dotenv from 'dotenv';
import Course from '../models/Course.js';
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { getPublicStats } from '../controllers/statsController.js';
import { generateAndStoreEmbeddings } from '../utils/aiPipeline.js';
import { createRequire } from 'module';
import { validate, getAllCoursesSchema, recommendationSchema, courseUploadSchema, liveSessionSchema } from '../middleware/validateMiddleware.js';
const require = createRequire(import.meta.url);
const PDFParser = require("pdf2json");

dotenv.config();
const router = express.Router();

// --- CONFIG & HELPERS ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = multer.memoryStorage();
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder, resource_type: "auto" },
      (error, result) => (result ? resolve(result.secure_url) : reject(error))
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

const extractPdfText = async (buffer) => {
  return new Promise((resolve) => {
    const pdfParser = new PDFParser(null, 1);
    pdfParser.on("pdfParser_dataError", () => resolve(""));
    pdfParser.on("pdfParser_dataReady", () => resolve(pdfParser.getRawTextContent() || ""));
    pdfParser.parseBuffer(buffer);
  });
};

// --- STATIC ROUTES (MUST BE ABOVE /:id) ---

// 3. Stats & Popular
router.get('/public-stats', getPublicStats);
router.get('/popular', async (req, res) => {
  try {
    const popular = await Course.find().sort({ enrolledCount: -1 }).limit(3);
    res.json(popular);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

// 1. All Courses
router.get('/all', authMiddleware, validate(getAllCoursesSchema), async (req, res) => {
  try {
    /**
     * 🔥 PERFORMANCE OPTIMIZATIONS:
     * 1. .select(...): We exclude 'modules' and 'description' because they are heavy 
     * and not needed for the course grid/cards.
     * 2. .populate(...): Only fetches the instructor's name and picture.
     * 3. .lean(): Tells Mongoose to return plain JavaScript objects instead of full 
     * Mongoose Documents. This reduces memory usage and CPU overhead by ~5x.
     */
    const courses = await Course.find()
      .select('-modules -description') 
      .populate('instructor', 'name profilePicture')
      .lean();

    res.json(courses);
  } catch (error) {
    console.error("❌ Course Fetch Error:", error.message);
    res.status(500).json({ error: "Internal Server Error" });
  }
});



// 2. Instructor Dashboard Data (THE FIX FOR 400 ERROR)
router.get('/instructor-courses', authMiddleware, async (req, res) => {
  try {
    const rawId = req.user?._id || req.user?.id;
    if (!rawId) return res.status(401).json({ error: "Unauthorized" });
    
    // Explicit casting to prevent Mongoose validation 400 errors
    const instructorObjectId = new mongoose.Types.ObjectId(rawId);
    const courses = await Course.find({ instructor: instructorObjectId })
      .populate('instructor', 'name profilePicture')
      .sort({ createdAt: -1 });

    res.json(courses);
  } catch (error) { 
    console.error("Instructor Route Error:", error);
    res.status(400).json({ error: "Could not fetch instructor courses" }); 
  }
});


// 4. AI Recommendations
router.get('/recommendations/:userId', validate(recommendationSchema), async (req, res) => {
  try {
    const { userId } = req.params;
    const enrollments = await Enrollment.find({ student: userId });
    const enrolledIds = enrollments.map(e => e.course.toString());
    const interested = enrollments.filter(e => e.progress >= 50);
    const likedCourses = await Course.find({ _id: { "$in": interested.map(e => e.course) } });
    const activeCats = [...new Set(likedCourses.map(c => c.category))];

    if (activeCats.length === 0) return res.json([]);

    let blended = [];
    for (const cat of activeCats) {
      const catVectors = likedCourses.filter(c => c.category === cat && c.discoveryVector?.length > 0).map(c => c.discoveryVector);
      if (catVectors.length > 0) {
        const meanVec = catVectors[0].map((_, i) => catVectors.reduce((acc, v) => acc + (v[i] || 0), 0) / catVectors.length);
        const suggs = await Course.aggregate([
          { "$vectorSearch": { "index": "vector_index", "path": "discoveryVector", "queryVector": meanVec, "numCandidates": 50, "limit": 5 } },
          { "$match": { "_id": { "$nin": [...enrolledIds, ...blended.map(r => r._id.toString())].map(id => new mongoose.Types.ObjectId(id)) }, "category": cat } },
          { "$lookup": { "from": "users", "localField": "instructor", "foreignField": "_id", "as": "info" } },
          { "$unwind": "$info" },
          { "$project": { title: 1, imageUrl: 1, category: 1, price: 1, level: 1, duration: 1, instructor: { name: "$info.name", profilePicture: "$info.profilePicture" } } },
          { "$limit": 1 }
        ]);
        if (suggs.length > 0) blended.push(suggs[0]);
      }
    }

    if (blended.length < 3) {
      const needed = 3 - blended.length;
      const fillers = await Course.find({ _id: { "$nin": [...enrolledIds, ...blended.map(r => r._id.toString())] }, category: { "$in": activeCats } })
        .populate('instructor', 'name profilePicture').limit(needed);
      blended = [...blended, ...fillers];
    }
    res.json(blended.slice(0, 3));
  } catch (err) { res.json([]); }
});

// --- DYNAMIC & MUTATION ROUTES ---

// 5. Create Course
router.post('/create', authMiddleware, upload.fields([{ name: 'image' }, { name: 'pdf' }]), validate(courseUploadSchema), async (req, res) => {
  try {
    const { title, description, price, category, duration, level, instructorId, modules } = req.body;
    const extractedText = await extractPdfText(req.files['pdf'][0].buffer);
    const [pdfUrl, imageUrl] = await Promise.all([
      uploadToCloudinary(req.files['pdf'][0].buffer, "courses/pdfs"),
      uploadToCloudinary(req.files['image'][0].buffer, "courses/thumbnails")
    ]);

    const newCourse = new Course({
      title, description, content: extractedText, price, category, duration, level,
      instructor: req.user?.id || instructorId,
      modules: typeof modules === 'string' ? JSON.parse(modules) : modules,
      pdfUrl, imageUrl, isAIIndexed: false
    });

    const saved = await newCourse.save();
    setImmediate(async () => {
      try {
        const context = `Title: ${title}. Category: ${category}. Summary: ${description}`;
        await generateAndStoreEmbeddings(saved._id, context, { type: 'summary' });
        if (extractedText) await generateAndStoreEmbeddings(saved._id, extractedText, { type: 'tutor' });
        await Course.findByIdAndUpdate(saved._id, { isAIIndexed: true });
      } catch (e) { console.error("AI Indexing Error"); }
    });
    res.status(201).json(saved);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id)
      .populate('instructor', 'name profilePicture')
      .lean(); // We want modules and description here!

    if (!course) return res.status(404).json({ error: "Course not found" });
    res.json(course);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 6. Update Course
router.put('/:id', authMiddleware, upload.fields([{ name: 'image' }, { name: 'pdf' }]), validate(courseUploadSchema), async (req, res) => {
  try {
    const updateData = { ...req.body, isAIIndexed: false };
    if (updateData.modules) updateData.modules = typeof updateData.modules === 'string' ? JSON.parse(updateData.modules) : updateData.modules;
    
    if (req.files?.['pdf']) {
      updateData.content = await extractPdfText(req.files['pdf'][0].buffer);
      updateData.pdfUrl = await uploadToCloudinary(req.files['pdf'][0].buffer, "courses/pdfs");
    }
    if (req.files?.['image']) {
      updateData.imageUrl = await uploadToCloudinary(req.files['image'][0].buffer, "courses/thumbnails");
    }

    const updated = await Course.findByIdAndUpdate(req.params.id, { $set: updateData }, { new: true });
    res.json(updated);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// 7. Get Course by ID (Keep this at the bottom!)
router.get('/:id', async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) return res.status(400).json({ error: "Invalid ID" });
    const course = await Course.findById(req.params.id).populate('instructor', 'name profilePicture');
    if (!course) return res.status(404).json({ error: "Not found" });
    res.json(course);
  } catch (e) { res.status(500).json({ error: "Server Error" }); }
});

// 8. Delete & Live Sessions
router.delete('/:id', authMiddleware, async (req, res) => {
  try { await Course.findByIdAndDelete(req.params.id); res.json({ message: "Deleted" }); } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/:id/schedule-live', authMiddleware, validate(liveSessionSchema), async (req, res) => {
  try {
    const { title, date, time, meetingLink, duration } = req.body;
    const course = await Course.findById(req.params.id);
    course.liveSessions.push({ title, date, time, meetingLink, duration });
    await course.save();
    res.json({ message: "Scheduled", sessions: course.liveSessions });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.get('/:id/live-session', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    res.json(course?.liveSessions || []);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// --- NEW: UPDATE SPECIFIC LIVE SESSION ---
router.put('/:id/live-session/:sessionId', authMiddleware, validate(liveSessionSchema), async (req, res) => {
  try {
    const { title, date, time, meetingLink, duration } = req.body;
    const course = await Course.findById(req.params.id);

    if (!course) return res.status(404).json({ error: "Course not found" });

    // Find the session in the array and update it
    const session = course.liveSessions.id(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });

    session.title = title;
    session.date = date;
    session.time = time;
    session.meetingLink = meetingLink;
    session.duration = duration;

    await course.save();
    res.json({ message: "Updated", sessions: course.liveSessions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// --- NEW: DELETE SPECIFIC LIVE SESSION ---
router.delete('/:id/live-session/:sessionId', authMiddleware, async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: "Course not found" });

    // Remove the session from the array
    course.liveSessions.pull(req.params.sessionId);
    
    await course.save();
    res.json({ message: "Deleted", sessions: course.liveSessions });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;