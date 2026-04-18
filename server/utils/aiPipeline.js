import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
import Course from '../models/Course.js';

dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

/**
 * --- CORE EMBEDDING GENERATOR ---
 * Uses the verified 'gemini-embedding-001' model
 */
export const generateEmbedding = async (text) => {
    try {
        const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" }); 

        // 🔥 FORCE 768 DIMENSIONS to match your MongoDB Index
        const result = await model.embedContent({
            content: { parts: [{ text }] },
            taskType: "RETRIEVAL_QUERY", // Optimized for RAG search
            outputDimensionality: 768, 
        });
        
        return result.embedding.values;
    } catch (error) {
        console.error("❌ Embedding Failed:", error.message);
        throw error;
    }
};
/**
 * --- TEXT CHUNKING ---
 * Splits long PDF text into 1000-character pieces for better AI context
 */
const chunkText = (text, size = 1000) => {
    if (!text) return [];
    const chunks = [];
    for (let i = 0; i < text.length; i += size) {
        chunks.push(text.substring(i, i + size));
    }
    return chunks;
};

export const generateAndStoreEmbeddings = async (courseId, text, options = { type: 'tutor' }) => {
    try {
        if (!text || text.trim().length === 0) {
            console.warn("⚠️ No text provided for embedding.");
            return;
        }

        // --- BRANCH 1: RECOMMENDATION SYSTEM (SUMMARY TYPE) ---
        if (options.type === 'summary') {
            console.log(`🎯 Generating Discovery Vector for Course ID: ${courseId}`);
            
            // Generate a single vector for the title + category + description
            const vector = await generateEmbedding(text);

            await Course.findByIdAndUpdate(
                courseId,
                { $set: { discoveryVector: vector } },
                { returnDocument: 'after' }
            );
            
            console.log(`✅ Discovery Vector stored successfully.`);
            return true;
        }

        // --- BRANCH 2: AI TUTOR (TUTOR TYPE / DEFAULT) ---
        // 1. Chunk the text
        const chunks = chunkText(text, 1000);
        console.log(`📦 Processing ${chunks.length} chunks for AI Tutor (Course ID: ${courseId})`);

        const vectorData = [];

        // 2. Generate embeddings for each chunk
        for (let i = 0; i < chunks.length; i++) {
            const vector = await generateEmbedding(chunks[i]);
            
            vectorData.push({
                content: chunks[i],
                vector: vector,
                chunkIndex: i
            });
        }

        // 3. Store in the Course Document
        const updatedCourse = await Course.findByIdAndUpdate(
            courseId, 
            {
                $set: { 
                    embeddings: vectorData,
                    isAIIndexed: true 
                }
            },
            { returnDocument: 'after' }
        );

        if (updatedCourse && updatedCourse.embeddings.length > 0) {
            console.log(`✅ Successfully stored ${chunks.length} tutor vectors for: ${updatedCourse.title}`);
            return true;
        } else {
            console.error("❌ DB Update failed: Tutor embeddings array is empty.");
            return false;
        }

    } catch (error) {
        console.error("❌ generateAndStoreEmbeddings Pipeline Error:", error);
        throw error;
    }
};

/**
 * --- THE MAIN PIPELINE MANAGER ---
 */
// export const generateAndStoreEmbeddings = async (courseId, fullText) => {
//     try {
//         if (!fullText || fullText.trim().length === 0) {
//             console.warn("⚠️ No text provided for embedding.");
//             return;
//         }

//         // 1. Chunk the text
//         const chunks = chunkText(fullText, 1000);
//         console.log(`📦 Processing ${chunks.length} chunks for Course ID: ${courseId}`);

//         const vectorData = [];

//         // 2. Generate embeddings for each chunk
//         for (let i = 0; i < chunks.length; i++) {
//             const vector = await generateEmbedding(chunks[i]);
            
//             vectorData.push({
//                 content: chunks[i],
//                 vector: vector,
//                 chunkIndex: i
//             });
//         }

//         // 3. Store in the Course Document
//         const updatedCourse = await Course.findByIdAndUpdate(
//             courseId, 
//             {
//                 $set: { 
//                     embeddings: vectorData,
//                     isAIIndexed: true 
//                 }
//             },
//             { returnDocument: 'after' }
//         );

//         if (updatedCourse && updatedCourse.embeddings.length > 0) {
//             console.log(`✅ Successfully stored ${chunks.length} vectors for: ${updatedCourse.title}`);
//             return true;
//         } else {
//             console.error("❌ DB Update failed: Embeddings array is still empty after save.");
//             return false;
//         }

//     } catch (error) {
//         console.error("❌ generateAndStoreEmbeddings Pipeline Error:", error);
//         throw error;
//     }
// };