import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

// These two lines help find the correct folder path
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Point to the .env file in the parent directory (server/.env)
dotenv.config({ path: path.resolve(__dirname, '../.env') }); 

import mongoose from 'mongoose';
import Course from '../models/Course.js';
import { generateEmbedding } from '../utils/aiPipeline.js';

dotenv.config();

async function migrate() {
    try {
        console.log("🔗 Connecting to MongoDB...");
        await mongoose.connect(process.env.MONGO_URI);
        console.log("✅ Connected.");

        // We find ALL courses because we need to upgrade them to 3072 dimensions
        const courses = await Course.find({});
        
        console.log(`🚀 Starting migration for ${courses.length} courses to 3072-dim...`);

        for (let i = 0; i < courses.length; i++) {
            const course = courses[i];
            
            // Combine all relevant text for better semantic search
            const textToVectorize = `
                Course Title: ${course.title} 
                Description: ${course.description} 
                Module Content: ${course.content || ""}
            `.trim();

            console.log(`🛰️ Vectorizing [${i + 1}/${courses.length}]: ${course.title}...`);

            try {
                // This calls your updated gemini-embedding-001 model
                const newVector = await generateEmbedding(textToVectorize);
                
                // Safety check: Ensure we actually got 3072 dimensions
                if (newVector.length !== 3072) {
                    console.warn(`⚠️ Warning: Expected 3072 dimensions, got ${newVector.length} for ${course.title}`);
                }

                course.contentVector = newVector;
                await course.save();
                
                console.log(`✅ Success: ${course.title} is now AI-Ready.`);
                
                // Small delay to respect Google's Free Tier Rate Limits (15 RPM)
                if (i < courses.length - 1) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

            } catch (err) {
                console.error(`❌ Failed to vectorize ${course.title}:`, err.message);
            }
        }

        console.log("\n✨ MIGRATION COMPLETE! Your database is now synchronized with the 3072-dim index.");
        process.exit(0);

    } catch (error) {
        console.error("❌ CRITICAL MIGRATION ERROR:", error.message);
        process.exit(1);
    }
}

migrate();