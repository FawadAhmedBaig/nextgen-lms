import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix for .env location
const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function listModels() {
    const key = process.env.GEMINI_API_KEY;
    
    if (!key) {
        console.error("❌ ERROR: GEMINI_API_KEY not found in .env file!");
        return;
    }

    const url = `https://generativelanguage.googleapis.com/v1/models?key=${key}`;

    try {
        console.log("🔗 Connecting to Google API Gateway...");
        const response = await fetch(url);
        const data = await response.json();

        if (data.error) {
            console.log("\n❌ GOOGLE REJECTED THE REQUEST:");
            console.log(`- Status:  ${data.error.status}`);
            console.log(`- Message: ${data.error.message}`);
            return;
        }

        console.log("\n✅ SUCCESS! YOUR KEY CAN SEE THESE MODELS:");
        console.log("-----------------------------------------");
        data.models.forEach(m => {
            // We want the string AFTER 'models/'
            console.log(`> ${m.name.split('/')[1]}`);
        });
        console.log("-----------------------------------------");
        console.log("💡 Copy one of the names above and put it in your controller.");
    } catch (err) {
        console.error("\n❌ NETWORK ERROR:", err.message);
    }
}

listModels();