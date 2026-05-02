import { ethers } from 'ethers';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();

// Stable JSON loading for Node v24
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const abiPath = path.join(__dirname, '../constants/contractABI.json');
const abiData = JSON.parse(fs.readFileSync(abiPath, 'utf8'));

// Ensure you are using StaticJsonRpcProvider or checking the network
const provider = new ethers.JsonRpcProvider(process.env.POLYGON_RPC_URL, {
    chainId: 80002, // Amoy Testnet Chain ID
    name: 'polygon-amoy'
}, { staticNetwork: true });
const wallet = new ethers.Wallet(process.env.PRIVATE_KEY, provider);
const contract = new ethers.Contract(process.env.CONTRACT_ADDRESS, abiData, wallet);

export const issueBlockchainCert = async (studentId, courseId) => {
  try {
    // 1. SAFETY CHECK: Ensure inputs are strings and not 'undefined'
    // This prevents the "Cannot read properties of undefined (reading 'then')" error
    const sId = String(studentId || "");
    const cId = String(courseId || "");

    if (!sId || sId === "undefined" || !cId || cId === "undefined") {
        throw new Error(`Invalid inputs received. Student: ${sId}, Course: ${cId}`);
    }

    console.log("🛠️ Starting Blockchain process for:", sId);
    
    const balance = await provider.getBalance(wallet.address);
    if (balance === 0n) {
      throw new Error("Your wallet has 0 POL. Please use the Amoy Faucet.");
    }

    const dataString = `${sId}-${cId}-${Date.now()}`;
    const certHash = ethers.id(dataString); 

    console.log("📡 Sending Transaction to Polygon...");
    // 1. Fetch current network fee data
    const feeData = await provider.getFeeData();

    // 2. Calculate a "Speed Premium" (30% buffer for rapid inclusion)
    const priorityFee = (feeData.maxPriorityFeePerGas * 130n) / 100n; 
    const maxFee = (feeData.maxFeePerGas * 150n) / 100n;

    // 3. Execution with optimized gas parameters
    const tx = await contract.issueCertificate(certHash, sId, cId, {
      gasLimit: 300000, 
      
      maxPriorityFeePerGas: priorityFee > ethers.parseUnits('50', 'gwei') 
                            ? priorityFee 
                            : ethers.parseUnits('50', 'gwei'), 
      
      // This ensures the transaction doesn't fail if the base fee rises
      maxFeePerGas: maxFee > ethers.parseUnits('150', 'gwei') 
                    ? maxFee 
                    : ethers.parseUnits('150', 'gwei')
    });

    // 3. Wait for 1 confirmation (Polygon is fast)
    const receipt = await tx.wait(1);
    console.log(`✅ Certificate Anchored! Block: ${receipt.blockNumber}`);

        
        
        console.log("⏳ Transaction Sent! Hash:", tx.hash);
        await tx.wait(1); 
        console.log("✅ Block Confirmed!");

        return { txnHash: tx.hash, certHash };
      } catch (error) {
        console.error("❌ DETAILED BLOCKCHAIN ERROR:", error.message);
        throw error; 
      }
    };