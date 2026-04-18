import puppeteer from 'puppeteer';
import QRCode from 'qrcode';
import { onlineUsers } from '../socketStore.js';
import Notification from '../models/Notification.js';
import { issueBlockchainCert } from '../utils/blockchainService.js';
import Enrollment from '../models/Enrollment.js'; 
import mongoose from 'mongoose';

export const generateCertificate = async (req, res) => {
  let browser = null; 
  try {
    const { userName, courseTitle, date, userId, courseId } = req.body; 

    // --- CACHING LOGIC ---
    let txnHash;
    let certHash;

    const userObjId = new mongoose.Types.ObjectId(userId);
    const courseObjId = new mongoose.Types.ObjectId(courseId);

    console.log(`🔍 Checking MongoDB for: Student ${userId}, Course ${courseId}`);
    const enrollment = await Enrollment.findOne({ student: userObjId, course: courseObjId });

    if (enrollment && enrollment.blockchainData && enrollment.blockchainData.txnHash) {
      console.log(`✅ CACHE HIT: Certificate already on Blockchain for ${userName}. Skipping Minting.`);
      txnHash = enrollment.blockchainData.txnHash;
      certHash = enrollment.blockchainData.certHash;
    } else {
      console.log(`❌ CACHE MISS: First time minting for ${userName}...`);
      const blockchainResult = await issueBlockchainCert(userId, courseId || "COURSE_ID");
      
      txnHash = blockchainResult.txnHash; 
      certHash = blockchainResult.certHash;
      console.log(`✅ Minted on Polygon! Hash: ${txnHash}`);

      if (enrollment) {
        enrollment.blockchainData = {
          txnHash: txnHash,
          certHash: certHash,
          issuedAt: new Date()
        };
        enrollment.markModified('blockchainData');
        await enrollment.save();
        console.log("💾 SUCCESS: Blockchain data saved to Enrollment record.");
      }
    }

    // Generate the QR Code using the txnHash
    const qrCodeData = await QRCode.toDataURL(`https://amoy.polygonscan.com/tx/${txnHash}`);

    // --- YOUR EXACT HTML CONTENT & DESIGN ---
    const htmlContent = `
<html>
<head>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
  <style>
    body { margin: 0; padding: 0; background-color: #f8fafc; }
    .cert-container {
      width: 900px; height: 650px; padding: 20px;
      background: white; border: 15px solid #1e293b;
      position: relative; margin: auto; box-sizing: border-box;
      background-image: url('https://www.transparenttextures.com/patterns/cubes.png');
    }
    .inner-border {
      border: 2px solid #2563eb; height: 100%; width: 100%;
      box-sizing: border-box; padding: 40px; text-align: center;
    }
    .header { font-family: 'Montserrat', sans-serif; font-weight: 700; letter-spacing: 5px; color: #64748b; margin-top: 20px; }
    .title { font-family: 'Playfair Display', serif; font-size: 52px; color: #1e293b; margin: 20px 0; }
    .sub-title { font-family: 'Montserrat', sans-serif; font-size: 18px; color: #64748b; }
    .student-name { font-family: 'Montserrat', sans-serif; font-size: 42px; font-weight: 700; color: #2563eb; margin: 30px 0; border-bottom: 2px solid #e2e8f0; display: inline-block; padding: 0 50px; }
    .course-title { font-family: 'Montserrat', sans-serif; font-size: 24px; font-weight: 700; color: #1e293b; }
    .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 60px; padding: 0 40px; }
    .signature-wrapper {
      position: relative;
      height: 70px;
      display: flex;
      justify-content: center;
      align-items: center;
    }
    .signature-img {
      max-height: 60px;
      width: auto;
      position: absolute;
      bottom: -5px;
      z-index: 10;
    }
    .signature-box {
      width: 220px; 
      padding-top: 10px; 
      font-family: 'Montserrat', sans-serif; 
      font-size: 12px; 
      color: #1e293b; 
      position: relative;
    }
    .blockchain-status {
      text-align: center;
      margin-bottom: -10px;
    }
    .txn-hash { font-family: 'Courier New', monospace; font-size: 9px; color: #94a3b8; margin-top: 5px; }
    .seal { position: absolute; top: 30px; right: 40px; width: 100px; opacity: 0.8; }
  </style>
</head>
<body>
  <div class="cert-container">
    <div class="inner-border">
      <img src="https://cdn-icons-png.flaticon.com/512/5973/5973360.png" class="seal" />
      
      <div class="header">CERTIFICATE OF COMPLETION</div>
      <div class="title">NextGen LMS</div>
      
      <div class="sub-title">This is to certify that the student</div>
      <div class="student-name">${userName}</div>
      
      <div class="sub-title">has successfully completed the professional curriculum for</div>
      <div class="course-title">${courseTitle}</div>
      
      <div class="footer">
        <div class="signature-box">
          <div class="signature-wrapper">
            <img src="https://res.cloudinary.com/dnzopenf6/image/upload/v1774241419/copy_of_sir_saleem_ullah_sign_us4n12_c4a99b.png" class="signature-img" />
          </div>
          <strong>Dr. Saleem Ullah</strong><br/>
          Head of CS, KFUEIT
        </div>

        <div class="blockchain-status">
          <div style="margin-bottom: 8px;">
            <p style="font-family: 'Montserrat'; font-size: 8px; font-weight: 700; color: #64748b; margin: 0; text-transform: uppercase;">Certificate ID (Hash)</p>
            <p style="font-family: 'Courier New', monospace; font-size: 8px; color: #1e293b; margin: 2px 0;">
              ${certHash}
            </p>
          </div>

          <img src="${qrCodeData}" style="width: 75px; height: 75px;" />
          
          <div class="txn-hash">
            Polygon TX: ${txnHash.substring(0, 8)}...${txnHash.substring(txnHash.length - 8)}
          </div>
          
          <div style="font-size: 9px; font-weight: bold; color: #2563eb; margin-top: 4px; font-family: 'Montserrat';">VERIFIED ON POLYGON</div>
        </div>

        <div class="signature-box">
          <div class="signature-wrapper">
            <img src="https://res.cloudinary.com/dnzopenf6/image/upload/v1774241476/copy_of_fawad_sign-removebg-preview_oczgwx_71f748.png" class="signature-img" />
          </div>
          <strong>Fawad Ahmed Baig</strong><br/>
          Lead Software Engineer
        </div>
      </div>
    </div>
  </div>
</body>
</html>
`;

    // 3. Launch Puppeteer
    const browser = await puppeteer.launch({
      executablePath: '/usr/bin/chromium-browser', // Path in the Alpine container
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage' // Helps with memory limits in Docker
      ]
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

    // 4. Generate PDF Buffer
    const pdfBuffer = await page.pdf({ 
      format: 'A4', 
      landscape: true,
      printBackground: true,
      margin: { top: '0px', right: '0px', bottom: '0px', left: '0px' }
    });

    await browser.close();
    browser = null;

    // --- NOTIFICATION HANDLER ---
    try {
      if (userId) {
        const io = req.app.get('socketio');
        const notiData = {
          recipient: userId,
          type: 'certificate',
          title: 'Certificate Issued! 🎓',
          message: `Your certificate for ${courseTitle} is ready and verified on Polygon.`
        };
        await Notification.create(notiData);
        const recipientSocket = onlineUsers.get(userId);
        if (recipientSocket) {
          io.to(recipientSocket).emit('notification_received', notiData);
        }
      }
    } catch (notiErr) {
      console.error("Notification failed:", notiErr.message);
    }

    // 5. Send PDF
    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename=Certificate_${userName.replace(/\s+/g, '_')}.pdf`,
      "Content-Length": pdfBuffer.length,
    });
    
    return res.send(pdfBuffer);

  } catch (error) {
    console.error("❌ PDF Generation Error:", error.message);
    if (browser) await browser.close();

    if (error.message.includes("insufficient funds")) {
      return res.status(500).json({ 
        error: "Minter wallet has insufficient funds. Please top up gas." 
      });
    }

    return res.status(500).json({ error: "Internal server error during generation." });
  }
};