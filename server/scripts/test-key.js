import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from 'dotenv';
dotenv.config();

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function listMyModels() {
  try {
    console.log("🔍 Fetching available models for your API Key...");
    
    // This is a raw fetch to see what Google actually allows you to use
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
    const data = await response.json();

    if (data.error) {
        console.error("❌ API Error:", data.error.message);
        return;
    }

    const embeddingModels = data.models.filter(m => m.supportedGenerationMethods.includes("embedContent"));
    
    console.log("\n✅ YOUR KEY SUPPORTS THESE EMBEDDING MODELS:");
    embeddingModels.forEach(m => console.log(`- ${m.name.replace('models/', '')}`));

    if (embeddingModels.length > 0) {
        const bestModel = embeddingModels[0].name.replace('models/', '');
        console.log(`\n🚀 RECOMMENDED FIX: Use "${bestModel}" in your aiPipeline.js`);
        
        // Immediate test with the first available model
        console.log(`\n📡 Testing ${bestModel}...`);
        const model = genAI.getGenerativeModel({ model: bestModel });
        const result = await model.embedContent("Final validation test");
        console.log("🎉 SUCCESS! Vectors generated using:", bestModel);
    } else {
        console.log("❌ No embedding models found for this key. You may need a new API Key.");
    }

  } catch (error) {
    console.error("❌ Fatal Error:", error.message);
  }
}

listMyModels();