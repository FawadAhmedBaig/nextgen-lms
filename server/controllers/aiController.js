import Course from '../models/Course.js';
import { generateEmbedding } from '../utils/aiPipeline.js';
import Groq from 'groq-sdk';
import mongoose from 'mongoose';
import Interaction from '../models/Interaction.js';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const askTutor = async (req, res) => {
    try {
        const { question, courseId, isQuizActive } = req.body;

        // 1. Fetch the course to get the Instructor ID (Mandatory for stats)
        const targetCourse = await Course.findById(courseId);
        if (!targetCourse) {
            return res.status(404).json({ error: "Course not found" });
        }

        // 2. Log the Interaction (This powers the "AI Queries" stat)
        // We use dot notation fallback to ensure we get the ID correctly
        const instructorId = targetCourse.instructor?._id || targetCourse.instructor;
        
        const newInteraction = new Interaction({
            studentId: req.user.id,
            courseId: courseId,
            instructorId: instructorId, 
            question: question 
        });
        await newInteraction.save();

        // 3. Vectorize the student's question
        const questionVector = await generateEmbedding(question);

        // 4. Vector Search Aggregation (RAG)
        const searchResult = await Course.aggregate([
            {
                "$vectorSearch": {
                    "index": "vector_index", 
                    "path": "embeddings.vector",
                    "queryVector": questionVector,
                    "numCandidates": 100,
                    "limit": 10,
                    "filter": { "_id": new mongoose.Types.ObjectId(courseId) }
                }
            },
            { "$unwind": "$embeddings" },
            {
                "$addFields": {
                    "score": { "$meta": "vectorSearchScore" }
                }
            },
            { "$sort": { "score": -1 } },
            { "$limit": 5 },
            { "$project": { "content": "$embeddings.content", "_id": 0 } }
        ]);

        const contextText = searchResult.length > 0 
            ? searchResult.map(r => r.content).join("\n\n") 
            : "No specific context found.";

        // 5. System Prompting
const systemInstruction = isQuizActive
  ? "The student is taking a quiz. You are a supportive mentor. NEVER give direct answers. If they ask about a question, explain the underlying concept only."
  : "You are an AI Tutor helping a student with their course content.";

        // 6. Groq Completion
        const completion = await groq.chat.completions.create({
            messages: [
                {
                    role: "system",
                    content: `${systemInstruction}\n\nCONTEXT FROM COURSE PDF:\n${contextText}`
                },
                { role: "user", content: question }
            ],
            model: "llama-3.3-70b-versatile",
            temperature: isQuizActive ? 0.7 : 0.2,
        });

        res.status(200).json({ answer: completion.choices[0]?.message?.content });

    } catch (error) {
        console.error("❌ AskTutor Error:", error.message);
        res.status(500).json({ error: "Server Error or Search Index Syncing." });
    }
};