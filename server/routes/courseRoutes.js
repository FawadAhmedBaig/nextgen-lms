import express from 'express';
import multer from 'multer';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import streamifier from 'streamifier';
import dotenv from 'dotenv';
import Course from '../models/Course.js';
import { createRequire } from 'module';
import { generateAndStoreEmbeddings } from '../utils/aiPipeline.js'; // 🔥 CRITICAL IMPORT
import User from '../models/User.js';
import Enrollment from '../models/Enrollment.js';
import { getPublicStats } from '../controllers/statsController.js';

const require = createRequire(import.meta.url);
const PDFParser = require("pdf2json");

dotenv.config();

const router = express.Router();

// --- CLOUDINARY CONFIG ---
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// --- MULTER MEMORY STORAGE ---
const storage = multer.memoryStorage();
const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 } 
});

// Helper to handle Cloudinary stream upload
const uploadToCloudinary = (fileBuffer, folder) => {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: folder, resource_type: "auto" },
      (error, result) => {
        if (result) resolve(result.secure_url);
        else reject(error);
      }
    );
    streamifier.createReadStream(fileBuffer).pipe(stream);
  });
};

// Safe JSON Parser Helper
const safeParse = (data) => {
  if (!data || data === "undefined" || data === "null") return [];
  try {
    return typeof data === 'string' ? JSON.parse(data) : data;
  } catch (e) {
    console.error("JSON Parse Error:", e);
    return [];
  }
};

// --- HELPER FUNCTION FOR PDF EXTRACTION ---
const extractPdfText = async (buffer) => {
    return new Promise((resolve) => {
        const pdfParser = new PDFParser(null, 1);
        pdfParser.on("pdfParser_dataError", (errData) => {
            console.error("❌ PDF Parser Error:", errData.parserError);
            resolve(""); 
        });
        pdfParser.on("pdfParser_dataReady", () => {
            const text = pdfParser.getRawTextContent();
            console.log("✅ PDF Text Extracted Successfully");
            resolve(text || "");
        });
        pdfParser.parseBuffer(buffer);
    });
};


// --- CREATE COURSE ---
router.post('/create', upload.fields([
    { name: 'pdf', maxCount: 1 },
    { name: 'image', maxCount: 1 }
]), async (req, res) => {
    try {
        const { 
            title, description, price, category, 
            duration, level, instructorName, instructorId, modules 
        } = req.body;

        // Validation
        if (!req.files?.['pdf'] || !req.files?.['image']) {
            return res.status(400).json({ error: "Both PDF and Course Image are required." });
        }

        const pdfBuffer = req.files['pdf'][0].buffer;
        const imageBuffer = req.files['image'][0].buffer;

        // 1. Extract Text from PDF
        const extractedText = await extractPdfText(pdfBuffer);

        // 2. Upload Assets to Cloudinary
        const [pdfUrl, imageUrl] = await Promise.all([
            uploadToCloudinary(pdfBuffer, "courses/pdfs"),
            uploadToCloudinary(imageBuffer, "courses/thumbnails")
        ]);

        // 3. Save Course to Database
        const newCourse = new Course({
            title,
            description,
            content: extractedText,
            price,
            category,
            duration,
            level,
            instructor: { 
                _id: req.user?.id || instructorId, 
                name: instructorName || req.user?.name || "Instructor" 
            },
            modules: typeof modules === 'string' ? JSON.parse(modules) : modules,
            pdfUrl,
            imageUrl,
            isAIIndexed: false 
        });

        const savedCourse = await newCourse.save();

        // 4. 🔥 ASYNCHRONOUS AI PIPELINE (RAG & Recommendations)
        // We use setImmediate so the API returns the response immediately 
        // while the heavy AI work happens in the background.
        if (savedCourse) {
            setImmediate(async () => {
                try {
                    console.log(`🤖 Background AI Pipeline started: ${title}`);

                    // Helper to prevent 429
                    const sleep = (ms) => new Promise(res => setTimeout(res, ms));

                    // A. Discovery Vector (Wait first to clear any existing quota)
                    await sleep(3000); 
                    const recommendationContext = `Title: ${title}. Category: ${category}. Summary: ${description}`.trim();
                    await generateAndStoreEmbeddings(savedCourse._id, recommendationContext, { type: 'summary' });

                    // B. PDF Embeddings (Granular RAG data)
                    if (extractedText) {
                        // Give the API a longer break before processing large PDF text
                        await sleep(5000); 
                        await generateAndStoreEmbeddings(savedCourse._id, extractedText, { type: 'tutor' });
                    }

                    await Course.findByIdAndUpdate(savedCourse._id, { isAIIndexed: true });
                    console.log(`✅ AI Discovery & Tutor indexing successful for: ${title}`);
                } catch (vectorError) {
                    console.error("❌ Background Vectorization Failed:", vectorError.message);
                }
            });
        }

        // Return the saved course immediately
        res.status(201).json(savedCourse);
        
    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ error: error.message });
    }
});
// --- UPDATE COURSE ---
// router.put('/:id', upload.fields([{ name: 'image' }, { name: 'pdf' }]), async (req, res) => {
//     try {
//         const updateData = { ...req.body, isAIIndexed: false };
//         if (updateData.modules) updateData.modules = safeParse(updateData.modules);

//         let newContentExtracted = false;
//         if (req.files?.['pdf']) {
//             const pdfBuffer = req.files['pdf'][0].buffer;
//             updateData.content = await extractPdfText(pdfBuffer);
//             updateData.pdfUrl = await uploadToCloudinary(pdfBuffer, "courses/pdfs");
//             newContentExtracted = true;
//         }

//         if (req.files?.['image']) {
//             const imageBuffer = req.files['image'][0].buffer;
//             updateData.imageUrl = await uploadToCloudinary(imageBuffer, "courses/thumbnails");
//         }

//         const updatedCourse = await Course.findByIdAndUpdate(
//             req.params.id, 
//             { $set: updateData }, 
//             { new: true, runValidators: true }
//         );
        
//         if (!updatedCourse) return res.status(404).json({ error: "Course not found" });

//         if (newContentExtracted && updatedCourse.content) {
//             try {
//                 await generateAndStoreEmbeddings(updatedCourse._id, updatedCourse.content);
//                 console.log("✅ Course re-indexed successfully.");
//             } catch (vErr) {
//                 console.error("❌ Re-indexing failed:", vErr.message);
//             }
//         }

//         res.json(updatedCourse);
//     } catch (err) {
//         console.error("Update Error:", err);
//         res.status(500).json({ error: err.message });
//     }
// });
// --- UPDATE COURSE ---
router.put('/:id', upload.fields([{ name: 'image' }, { name: 'pdf' }]), async (req, res) => {
    try {
        const updateData = { ...req.body, isAIIndexed: false };
        if (updateData.modules) updateData.modules = safeParse(updateData.modules);

        let newPdfExtracted = false;
        let metadataChanged = false;

        // Check if metadata that affects recommendations has changed
        if (req.body.title || req.body.category || req.body.description) {
            metadataChanged = true;
        }

        // 1. Handle PDF Update
        if (req.files?.['pdf']) {
            const pdfBuffer = req.files['pdf'][0].buffer;
            updateData.content = await extractPdfText(pdfBuffer);
            updateData.pdfUrl = await uploadToCloudinary(pdfBuffer, "courses/pdfs");
            newPdfExtracted = true;
        }

        // 2. Handle Image Update
        if (req.files?.['image']) {
            const imageBuffer = req.files['image'][0].buffer;
            updateData.imageUrl = await uploadToCloudinary(imageBuffer, "courses/thumbnails");
        }

        const updatedCourse = await Course.findByIdAndUpdate(
            req.params.id, 
            { $set: updateData }, 
            { new: true, runValidators: true }
        );
        
        if (!updatedCourse) return res.status(404).json({ error: "Course not found" });

        // 3. 🔥 RE-INDEXING LOGIC (Hybrid)
        try {
            // A. If Metadata changed, update the Recommendation Vector
            if (metadataChanged) {
                console.log(`🔄 Updating Discovery Vector for: ${updatedCourse.title}`);
                const updatedContext = `
                    Title: ${updatedCourse.title}. 
                    Category: ${updatedCourse.category}. 
                    Level: ${updatedCourse.level}. 
                    Summary: ${updatedCourse.description}
                `.trim();
                
                await generateAndStoreEmbeddings(updatedCourse._id, updatedContext, { type: 'summary' });
            }

            // B. If a new PDF was uploaded, update the Tutor Embeddings
            if (newPdfExtracted && updatedCourse.content) {
                console.log(`🔄 Re-indexing PDF chunks for AI Tutor...`);
                await generateAndStoreEmbeddings(updatedCourse._id, updatedCourse.content, { type: 'tutor' });
            }

            if (metadataChanged || newPdfExtracted) {
                await Course.findByIdAndUpdate(updatedCourse._id, { isAIIndexed: true });
                console.log("✅ Course re-indexed successfully.");
            }
        } catch (vErr) {
            console.error("❌ Re-indexing failed:", vErr.message);
        }

        res.json(updatedCourse);
    } catch (err) {
        console.error("Update Error:", err);
        res.status(500).json({ error: err.message });
    }
});

// --- REMAINING ROUTES (GET, DELETE, LIVE SESSIONS) ---
router.get('/all', async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.status(200).json(courses);
  } catch (error) { res.status(500).json({ error: error.message }); }
});

router.get('/public-stats', getPublicStats);
router.get('/popular', async (req, res) => {
  try {
    // We sort by 'enrolledCount' in descending order (-1)
    // and limit to 3 for the featured section
    const popularCourses = await Course.find()
      .sort({ enrolledCount: -1 }) 
      .limit(3);
      
    res.status(200).json(popularCourses);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Validate if the ID is a valid MongoDB format to prevent server crash
    if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: "Invalid Course ID format" });
    }

    const course = await Course.findById(id);

    if (!course) {
        return res.status(404).json({ error: "Course not found" });
    }

    res.status(200).json(course);
  } catch (error) {
    console.error("Fetch Error:", error);
    res.status(500).json({ error: "Server error fetching course details" });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await Course.findByIdAndDelete(req.params.id);
    res.json({ message: "Course deleted successfully" });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.post('/:id/schedule-live', async (req, res) => {
  try {
    const { title, date, time, meetingLink, duration } = req.body;
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: "Course not found" });
    course.liveSessions.push({ title, date, time, meetingLink, duration });
    await course.save();
    res.status(200).json({ message: "Live session scheduled", sessions: course.liveSessions });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.get('/:id/live-sessions', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    res.json(course.liveSessions || []);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.delete('/:id/live-session/:sessionId', async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    course.liveSessions = course.liveSessions.filter(s => s._id.toString() !== req.params.sessionId);
    await course.save();
    res.json({ message: "Session deleted", sessions: course.liveSessions });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

router.put('/:id/live-session/:sessionId', async (req, res) => {
  try {
    const { title, date, time, meetingLink } = req.body;
    const course = await Course.findById(req.params.id);
    const session = course.liveSessions.id(req.params.sessionId);
    if (!session) return res.status(404).json({ error: "Session not found" });
    session.title = title; session.date = date; session.time = time; session.meetingLink = meetingLink;
    await course.save();
    res.json({ message: "Session updated", sessions: course.liveSessions });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- GET PERSONALIZED RECOMMENDATIONS (FR-04) ---
// Place this near your other GET routes
// --- Updated Recommendation Route ---
// --- GET PERSONALIZED RECOMMENDATIONS (FR-04) ---
router.get('/recommendations/:userId', async (req, res) => {
    try {
        let { userId } = req.params;
        console.log("🔍 [1/6] Starting Recommendation for User:", userId);

        // 1. Validation
        if (!userId || userId === "undefined" || userId === "null") {
            console.log("⚠️ No UserID in request, sending random fallback.");
            return res.json(await Course.find().limit(3));
        }

        userId = userId.trim();
        if (!mongoose.Types.ObjectId.isValid(userId)) {
            console.log("❌ Mathematically invalid ID format:", userId);
            return res.json(await Course.find().limit(3));
        }

        // 2. Fetch Enrollments
        const userEnrollments = await Enrollment.find({ student: userId });
        const enrolledIds = userEnrollments.map(e => e.course.toString());
        console.log(`🔍 [2/6] Found ${userEnrollments.length} enrollments.`);

        // 3. Filter for Interests (>50%)
        const interestedCourseIds = userEnrollments
            .filter(e => e.progress > 50)
            .map(e => e.course);

        if (interestedCourseIds.length === 0) {
            console.log("ℹ️ User has no progress > 50%. Showing general courses.");
            const general = await Course.find({ _id: { "$nin": enrolledIds } }).limit(3);
            return res.json(general);
        }

        // 4. Extract Vectors
        const likedCourses = await Course.find({ _id: { "$in": interestedCourseIds } });
        console.log(`🔍 [3/6] Analyzing interests from: ${likedCourses.map(c => c.title).join(', ')}`);

        // Check Discovery Vectors first
        let vectors = likedCourses
            .filter(c => c.discoveryVector && c.discoveryVector.length > 0)
            .map(c => c.discoveryVector);

        // Backup: Use embeddings[0] if discoveryVector is empty
        if (vectors.length === 0) {
            console.log("⚠️ discoveryVector field is empty. Falling back to embeddings[0]...");
            vectors = likedCourses
                .filter(c => c.embeddings?.length > 0)
                .map(c => c.embeddings[0].vector);
        }

        if (vectors.length === 0) {
            console.log("❌ CRITICAL: No vectors found in Database for liked courses.");
            return res.json(await Course.find().limit(3));
        }

        // 5. Calculate Mean Centroid
        console.log("🔍 [4/6] Calculating Interest Centroid...");
        const meanVector = vectors[0].map((_, i) => 
            vectors.reduce((acc, v) => acc + (v[i] || 0), 0) / vectors.length
        );

        // 6. Atlas Vector Search
        console.log("🔍 [5/6] Querying Atlas Vector Search (Index: vector_index)...");
        const suggestions = await Course.aggregate([
            {
                "$vectorSearch": {
                    "index": "vector_index", 
                    "path": "discoveryVector",
                    "queryVector": meanVector,
                    "numCandidates": 50,
                    "limit": 3,
                    "filter": { "_id": { "$nin": interestedCourseIds } } // Don't recommend what they already like
                }
            },
            { 
                "$project": { 
                    title: 1, description: 1, imageUrl: 1, category: 1, price: 1, level: 1, duration: 1, instructor: 1,
                } 
            }
        ]);

        console.log(`🔍 [6/6] Search Complete. Found ${suggestions.length} AI matches.`);
        
        if (suggestions.length > 0) {
            console.log("🎯 TOP RECOMMENDATIONS:", suggestions.map(s => s.title));
            return res.json(suggestions);
        } else {
            console.log("⚠️ Atlas returned 0 results. Check Index Path and Index Name.");
            // Final safety fallback
            const finalFallback = await Course.find({ _id: { "$nin": enrolledIds } }).limit(3);
            return res.json(finalFallback);
        }

    } catch (error) {
        console.error("❌ ERROR IN RECOMMENDATION PIPELINE:", error);
        // Ensure the frontend always gets something
        const emergencyFallback = await Course.find().limit(3);
        res.json(emergencyFallback);
    }
});


export default router;