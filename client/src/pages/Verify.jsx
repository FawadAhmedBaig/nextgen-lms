import React, { useState } from 'react';
import { ethers } from 'ethers';
import API from '../utils/api';
import toast from 'react-hot-toast';
import abiData from '../constants/contractABI.json';

const Verify = () => {
  const [txnHash, setTxnHash] = useState(""); 
  const [isVerifying, setIsVerifying] = useState(false);
  const [result, setResult] = useState(null);

  const handleVerify = async (e) => {
    e.preventDefault();
    if (!txnHash.trim()) {
      toast.error("Please enter a certificate hash");
      return;
    }

    setIsVerifying(true);
    setResult(null);

try {
      const provider = new ethers.JsonRpcProvider("https://rpc-amoy.polygon.technology");
      const contractAddress = "0x41804060a305051Ae5e018636938B11F66cf802a";
      const contract = new ethers.Contract(contractAddress, abiData, provider);
      const cleanHash = txnHash.startsWith('0x') ? txnHash : `0x${txnHash}`;
      
      // Step 1: Decentralized Query (Direct to Blockchain)
      const data = await contract.certificates(cleanHash);

      if (data.exists) {
        // Step 2: Web2 Data Resolution (Direct to OCI Production)
        // Using the API instance with the relative path
        const resolveRes = await API.get(`/users/public-resolve/${data.studentId}/${data.courseId}`);
        
        const formattedDate = new Date(Number(data.timestamp) * 1000).toLocaleDateString('en-US', {
          year: 'numeric', month: 'long', day: 'numeric'
        });

        setResult({
          status: 'success',
          studentName: resolveRes.data.studentName,
          courseTitle: resolveRes.data.courseTitle,
          studentId: data.studentId,
          courseId: data.courseId,
          date: formattedDate,
          network: 'Polygon Amoy Testnet',
          fullHash: cleanHash,
          contractAddress: contractAddress
        });
        
        toast.success("Credential Authenticated!");
      } else {
        toast.error("Hash not found on Polygon.");
      }
    } catch (err) {
      console.error("Verification Error:", err);
      toast.error("Network error or invalid hash format.");
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success("Hash copied!");
  };

  return (
    <div className="min-h-screen bg-slate-50 pt-8 md:pt-12 pb-12 md:pb-20 font-['Plus_Jakarta_Sans'] text-left overflow-x-hidden">
      <div className="max-w-4xl mx-auto px-4 md:px-8">
        
        <div className="text-center mb-10 md:mb-16">
          <div className="inline-flex items-center gap-2 bg-blue-100 text-blue-700 px-3 md:px-4 py-2 rounded-full text-[10px] md:text-xs font-black uppercase tracking-widest mb-6">
            <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></span>
            Web3 Verification
          </div>
          <h1 className="text-3xl md:text-5xl font-extrabold text-slate-900 mb-4 md:mb-6 tracking-tight">Verify Certificate</h1>
          <p className="text-slate-500 text-sm md:text-base font-medium max-w-xl mx-auto leading-relaxed text-center px-2">
            Validate academic records instantly via the Polygon decentralized ledger.
          </p>
        </div>

        <div className="bg-white rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl shadow-blue-100 border border-slate-100">
          <form onSubmit={handleVerify} className="space-y-6 md:space-y-8">
            <div className="flex flex-col md:flex-row gap-4">
              <input 
                type="text" 
                value={txnHash}
                onChange={(e) => setTxnHash(e.target.value)}
                placeholder="Enter Certificate Hash (0x...)"
                className="w-full flex-1 bg-slate-50 border border-slate-200 rounded-xl md:rounded-2xl px-5 md:px-6 py-3.5 md:py-4 text-xs md:text-sm font-mono focus:border-blue-600 outline-none transition-all"
              />
              <button 
                type="submit"
                disabled={isVerifying}
                className="w-full md:w-auto bg-blue-600 text-white cursor-pointer px-8 md:px-10 py-3.5 md:py-4 rounded-xl md:rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 flex items-center justify-center gap-3 disabled:opacity-50 min-w-[160px] text-sm"
              >
                {isVerifying ? 'Searching...' : 'Verify Now'}
              </button>
            </div>
          </form>

          {result && (
            <div className="mt-8 md:mt-12 animate-in slide-in-from-bottom-4 duration-500">
              <div className="bg-white border-2 border-green-500/20 rounded-[2rem] md:rounded-[3rem] p-6 md:p-10 shadow-2xl shadow-green-100 relative overflow-hidden">
                {/* Responsive Badge */}
                <div className="absolute top-0 right-0 bg-green-500 text-white px-8 md:px-10 py-1.5 md:py-2 rotate-45 translate-x-6 md:translate-x-8 translate-y-3 md:translate-y-4 text-[8px] md:text-[10px] font-black uppercase tracking-widest text-center">
                  Authentic
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-center gap-4 md:gap-6 mb-8 md:mb-10 text-center sm:text-left">
                  <div className="w-16 h-16 md:w-20 md:h-20 bg-green-500 text-white rounded-2xl md:rounded-[2rem] flex items-center justify-center shadow-xl shadow-green-200 shrink-0">
                    <svg className="w-8 h-8 md:w-10 md:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-xl md:text-3xl font-black text-slate-900 tracking-tight">Success</h3>
                    <p className="text-green-600 font-bold flex items-center justify-center sm:justify-start gap-2 text-xs md:text-sm">
                      <span className="w-2 h-2 bg-green-500 rounded-full animate-ping"></span>
                      Validated On-Chain
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-10">
                  <div className="space-y-6 text-center md:text-left">
                    <div>
                      <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Student</p>
                      <p className="text-xl md:text-2xl font-bold text-slate-900 leading-tight">{result.studentName}</p>
                      <p className="text-[8px] md:text-[9px] font-mono text-slate-400 mt-1 uppercase break-all">UID: {result.studentId}</p>
                    </div>
                    <div>
                      <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Course</p>
                      <p className="text-lg md:text-xl font-bold text-blue-600 leading-tight">{result.courseTitle}</p>
                      <p className="text-[8px] md:text-[9px] font-mono text-slate-400 mt-1 uppercase break-all">REF: {result.courseId}</p>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl md:rounded-[2rem] p-6 md:p-8 flex flex-col justify-center border border-slate-100">
                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-2">CertHash Fingerprint</p>
                    <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 mb-4">
                       <span className="text-[9px] font-mono text-slate-500 truncate mr-2">{result.fullHash}</span>
                       <button onClick={() => copyToClipboard(result.fullHash)} className="text-[10px] font-black text-blue-600 uppercase shrink-0">Copy</button>
                    </div>
                    <div>
                      <p className="text-[9px] md:text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Issued On</p>
                      <p className="text-xs md:text-sm font-bold text-slate-900">{result.date}</p>
                    </div>
                  </div>
                </div>

                <a 
                  href={`https://amoy.polygonscan.com/address/${result.contractAddress.toLowerCase()}#readContract`}
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="block w-full text-center mt-8 md:mt-10 bg-slate-900 text-white py-4 md:py-5 rounded-xl md:rounded-2xl font-black text-[10px] md:text-xs uppercase tracking-widest hover:bg-black transition-all shadow-xl active:scale-95"
                >
                  Manual Explorer Verification
                </a>
                <p className="text-[8px] md:text-[9px] text-center text-slate-400 mt-4 px-2 md:px-10 leading-relaxed">
                    This link opens the PolygonScan ledger. Query the <b>"certificates"</b> function with the hash above to verify independently.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Verify;