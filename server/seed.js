import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import Course from './models/Course.js';
import User from './models/User.js';
import Enrollment from './models/Enrollment.js';
import Quiz from './models/Quiz.js';
import Notification from './models/Notification.js';
import Interaction from './models/Interaction.js'; 
import { generateAndStoreEmbeddings } from './utils/aiPipeline.js'; 

dotenv.config();

// 🔥 HELPER: Ensures we stay under Gemini's limit
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const seedData = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("🛰️ Connected to MongoDB...");

    // 1. Clear existing data
    await Promise.all([
      Course.deleteMany(),
      User.deleteMany(),
      Enrollment.deleteMany(),
      Quiz.deleteMany(),
      Notification.deleteMany(),
      Interaction.deleteMany()
    ]);
    console.log("🧹 Database cleared.");

    // ⏳ INITIAL COOLDOWN
    console.log("⏳ Waiting 10 seconds for API Quota reset...");
    await sleep(10000);

    const salt = await bcrypt.genSalt(10);
    const hashedPass = await bcrypt.hash("password123", salt);
    
    // 2. Create Users
    const testStudent = await User.create({
      name: "Fawad Ahmed", email: "student@test.com", password_hash: hashedPass,
      role: 'student', status: 'active', studentId: "STU-F-12345", bio: "Final year BS CS Student"
    });

    const testAdmin = await User.create({
      name: "System Admin", email: "admin@test.com", password_hash: hashedPass,
      role: 'admin', status: 'active', studentId: "ADM-G-99999", bio: "Platform Administrator"
    });

    const approvedInstructor = await User.create({
      name: "Dr. Saleem Ullah", email: "saleem@test.com", password_hash: hashedPass,
      role: 'instructor', status: 'active', studentId: "INST-S-001", bio: "Head of CS Department"
    });

    console.log("✅ Users Created.");

    // Helper to generate 3 Modules per course
    const createModules = (topic, vidIds) => [
      {
        name: `Module 1: Introduction to ${topic}`,
        items: [
          { type: 'video', title: `${topic} Fundamentals`, contentUrl: `https://www.youtube.com/watch?v=${vidIds[0]}` },
          { type: 'pdf', title: `${topic} Study Guide`, contentUrl: "https://bitcoin.org/bitcoin.pdf" }
        ]
      },
      {
        name: `Module 2: Advanced ${topic}`,
        items: [
          { type: 'video', title: `Mastering ${topic}`, contentUrl: `https://www.youtube.com/watch?v=${vidIds[1]}` },
          { type: 'quiz', title: `${topic} Skills Check`, questions: [
              { questionText: `Which of the following is core to ${topic}?`, options: ["Efficiency", "Security", "Scalability", "All of the above"], correctOptionIndex: 3 },
              { questionText: `Is ${topic} used in modern industries?`, options: ["Yes", "No", "Rarely", "Only in research"], correctOptionIndex: 0 }
            ] 
          }
        ]
      },
      {
        name: `Module 3: Project Implementation`,
        items: [
          { type: 'video', title: `${topic} Real-world Demo`, contentUrl: `https://www.youtube.com/watch?v=${vidIds[2]}` }
        ]
      }
    ];

    const courseDefinitions = [
      { 
        title: "Blockchain & Web3 Foundations", 
        cat: "Blockchain", 
        img: "https://images.pexels.com/photos/844124/pexels-photo-844124.jpeg", 
        vids: ["ghTrp1x_1As", "yubzJw0uiE4", "M576WGiDBdQ"], 
        desc: "A technical deep dive into decentralized ledger technology. Learn cryptographic hashing, peer-to-peer networking, Proof of Work (PoW), and Proof of Stake (PoS) consensus protocols. Build the foundation for distributed application architecture." 
      },
      { 
        title: "Ethereum Smart Contract Dev", 
        cat: "Blockchain", 
        img: "https://images.pexels.com/photos/730547/pexels-photo-730547.jpeg", 
        vids: ["M576WGiDBdQ", "coQ5dg8wM2o", "ipwxYa-s1ss"], 
        desc: "Master the Solidity programming language for the Ethereum Virtual Machine (EVM). This course covers smart contract security, ERC-20 and ERC-721 token standards, and deploying immutable code to the mainnet using Hardhat and Truffle." 
      },
      { 
        title: "DeFi Protocols & Yield Farming", 
        cat: "Blockchain", 
        img: "https://images.pexels.com/photos/6770610/pexels-photo-6770610.jpeg", 
        vids: ["k9WdXyS4930", "17O5P724pGg", "aXjL_F9u-E0"], 
        desc: "Explore the mathematics of Decentralized Finance. Study Automated Market Makers (AMM) like Uniswap, lending protocols like Aave, and yield optimization strategies. Understand liquidity pools, slippage, and impermanent loss in the Web3 ecosystem." 
      },
      { 
        title: "Hyperledger for Enterprise", 
        cat: "Blockchain", 
        img: "https://images.pexels.com/photos/373543/pexels-photo-373543.jpeg", 
        vids: ["JSw_Bjt_Xdw", "v99Z6f_r5M8", "UnmD-7t_Vlo"], 
        desc: "Learn to build permissioned blockchain networks for corporate environments using Hyperledger Fabric. Focus on private channels, chaincode development in Go/Node.js, and integrating blockchain with enterprise supply chain management systems." 
      },
      { 
        title: "AI Essentials", 
        cat: "Artificial Intelligence", 
        img: "https://images.pexels.com/photos/6153354/pexels-photo-6153354.jpeg", 
        vids: ["2ePf9rue1Ao", "ad79nYk2keg", "JMUxmLgwRY8"], 
        desc: "Understand the mathematical foundations of Artificial Intelligence. Covers supervised and unsupervised learning, gradient descent optimization, and basic neural network structures. Transition from classical algorithms to modern deep learning." 
      },
      { 
        title: "Computer Vision with CNNs", 
        cat: "Artificial Intelligence", 
        img: "https://images.pexels.com/photos/2599244/pexels-photo-2599244.jpeg", 
        vids: ["YRhxdVk_n6g", "u7TOnX_DShU", "vIci3C4JkL0"], 
        desc: "Teach machines to interpret visual data. Learn Convolutional Neural Networks (CNN) for image classification, object detection, and segmentation using TensorFlow and Keras. Includes real-time processing with OpenCV and YOLO architectures." 
      },
      { 
        title: "Generative AI & LLMs", 
        cat: "Artificial Intelligence", 
        img: "https://images.pexels.com/photos/8386440/pexels-photo-8386440.jpeg", 
        vids: ["hfIUstzHs9A", "5slyuBZ7U8c", "wjZofJX0v4M"], 
        desc: "Unlock the power of Transformer architectures and Large Language Models (LLMs). Master prompt engineering, fine-tuning pre-trained models like GPT-4, and implementing Retrieval-Augmented Generation (RAG) for customized AI agents." 
      },
      { 
        title: "AI Ethics & Governance", 
        cat: "Artificial Intelligence", 
        img: "https://images.pexels.com/photos/5473955/pexels-photo-5473955.jpeg", 
        vids: ["gh5_S5K4_tU", "XvOOn1H3o9I", "u2V0B7xY_m4"], 
        desc: "Navigate the socio-technical landscape of AI. Study algorithmic bias, data privacy regulations like GDPR, and safety alignment. Learn to build responsible AI systems that are transparent, fair, and explainable." 
      },
      { 
        title: "Full-Stack MERN Mastery", 
        cat: "Web Development", 
        img: "https://images.pexels.com/photos/1181263/pexels-photo-1181263.jpeg", 
        vids: ["7CqJlxBYj-M", "P4S7NoK-O-A", "vjf774RKrLc"], 
        desc: "Comprehensive web development using the MERN stack: MongoDB, Express.js, React, and Node.js. Build responsive frontend interfaces, RESTful APIs, and manage state with Redux. Focus on JavaScript, JSX, and full-stack deployment." 
      },
      { 
        title: "Next.js 14 Performance", 
        cat: "Web Development", 
        img: "https://images.pexels.com/photos/1181675/pexels-photo-1181675.jpeg", 
        vids: ["Sklc_f95_9k", "wm5gMKuwSYk", "ZVnjOPwW4Vg"], 
        desc: "Advanced React optimization with Next.js. Master Server Components, App Router logic, Server-Side Rendering (SSR), and Incremental Static Regeneration (ISR). Build lightning-fast web applications with high SEO performance." 
      },
      { 
        title: "UI/UX Design for Devs", 
        cat: "Web Development", 
        img: "https://images.pexels.com/photos/196644/pexels-photo-196644.jpeg", 
        vids: ["c9Wg6A_zEAY", "36_8X_rS-2I", "6f5gT58O-W0"], 
        desc: "Bridge the gap between design and code. Learn Figma prototyping, typography, color theory, and accessibility (WCAG) standards. Translate high-fidelity designs into pixel-perfect CSS and modular React components." 
      },
      { 
        title: "DevOps for Web Apps", 
        cat: "Web Development", 
        img: "https://images.pexels.com/photos/11035380/pexels-photo-11035380.jpeg", 
        vids: ["hP77Rua1E0c", "Wf2eSG3owoA", "pTFZFxd4hOI"], 
        desc: "Automate the software development lifecycle. Master Docker containerization, Kubernetes orchestration, and CI/CD pipelines with GitHub Actions. Manage cloud infrastructure on AWS and optimize deployment workflows." 
      },
      { 
        title: "Data Science with Python", 
        cat: "Data Science", 
        img: "https://images.pexels.com/photos/590022/pexels-photo-590022.jpeg", 
        vids: ["LHBE6Q9XlzI", "6W0X8W7_Fhc", "W8268_H-P_Y"], 
        desc: "Data analysis and statistical modeling using Python. Master library ecosystems including Pandas for dataframes, NumPy for numerical computation, and Matplotlib/Seaborn for advanced data visualization and storytelling." 
      },
      { 
        title: "SQL for Data Analytics", 
        cat: "Data Science", 
        img: "https://images.pexels.com/photos/265087/pexels-photo-265087.jpeg", 
        vids: ["7S_tz1z_5bA", "HXV3zeQKqGY", "27agsguJm_U"], 
        desc: "The core language of data. Learn complex SQL queries, window functions, and database design. Perform ETL processes and aggregate massive datasets from relational databases like PostgreSQL and MySQL." 
      },
      { 
        title: "Big Data with Spark", 
        cat: "Data Science", 
        img: "https://images.pexels.com/photos/669615/pexels-photo-669615.jpeg", 
        vids: ["_C8kWso4ne4", "pW3Y68u4B-8", "Yv64pPj9568"], 
        desc: "Harness the power of distributed computing. Learn Apache Spark and PySpark to process petabytes of data across clusters. Focus on Spark SQL, RDDs, and real-time streaming data analysis for big data pipelines." 
      },
      { 
        title: "Data Visualization: Tableau", 
        cat: "Data Science", 
        img: "https://images.pexels.com/photos/1036936/pexels-photo-1036936.jpeg", 
        vids: ["7Jl-R_fclQ8", "fO-3p80EIdk", "fGk_39rK_y0"], 
        desc: "Transform raw data into business intelligence. Master Tableau for creating interactive dashboards, calculated fields, and advanced data mapping. Learn to communicate complex insights to stakeholders through visual dashboards." 
      },
      { 
        title: "Ethical Hacking: Zero to Hero", 
        cat: "Cybersecurity", 
        img: "https://images.pexels.com/photos/5380664/pexels-photo-5380664.jpeg", 
        vids: ["3Kq1MIfTWCE", "dz7Ntp7KQ8c", "dz7Ntp7KQ8c"], 
        desc: "Master the mindset of an attacker to build better defenses. Learn penetration testing, vulnerability assessment, and exploit development using Kali Linux, Metasploit, and Nmap. Includes web application and network hacking." 
      },
      { 
        title: "Network Security & Firewalls", 
        cat: "Cybersecurity", 
        img: "https://images.pexels.com/photos/60504/security-protection-anti-virus-software-60504.jpeg", 
        vids: ["vIci3C4JkL0", "6f5gT58O-W0", "Wf2eSG3owoA"], 
        desc: "Secure corporate infrastructure against intrusion. Learn to configure enterprise firewalls (Cisco/Palo Alto), manage Intrusion Detection Systems (IDS), and implement Zero Trust Network Access (ZTNA) protocols." 
      },
      { 
        title: "Cloud Security (AWS/Azure)", 
        cat: "Cybersecurity", 
        img: "https://images.pexels.com/photos/4439425/pexels-photo-4439425.jpeg", 
        vids: ["4t48p_Fm_58", "6W0X8W7_Fhc", "hP77Rua1E0c"], 
        desc: "Defending cloud-native environments. Study AWS IAM policies, Azure Sentinel, and cloud encryption standards. Master the Shared Responsibility Model and protect containerized applications from cloud-specific threats." 
      },
      { 
        title: "Digital Forensics", 
        cat: "Cybersecurity", 
        img: "https://images.pexels.com/photos/3861964/pexels-photo-3861964.jpeg", 
        vids: ["Z_vL97q-O28", "u2V0B7xY_m4", "pTFZFxd4hOI"], 
        desc: "Investigate cybercrime through digital footprints. Learn to collect court-admissible evidence, perform disk imaging, and analyze memory dumps. Focus on post-breach analysis and incident response procedures." 
      }
    ];

    for (const c of courseDefinitions) {
      const course = await Course.create({
        title: c.title,
        description: c.desc,
        category: c.cat,
        imageUrl: c.img,
        price: (c.title.includes("Essentials") || c.title.includes("MERN")) ? "Free" : "$49.00",
        duration: "15h",
        level: "Beginner",
        instructor: { _id: approvedInstructor._id, name: approvedInstructor.name },
        modules: createModules(c.title, c.vids),
        isAIIndexed: false,
        enrolledCount: Math.floor(Math.random() * 90) + 10 
      });

      // 🔥 AI PIPELINE WITH SMART RETRY ON 429 ERROR
      let indexed = false;
      let attempts = 0;
      while (!indexed && attempts < 3) {
        try {
          const richContext = `Title: ${c.title}. Category: ${c.cat}. Summary: ${c.desc}`.trim();
          
          await sleep(4500); // ⏱ Base delay
          await generateAndStoreEmbeddings(course._id, richContext, { type: 'summary' });
          
          await sleep(4500); 
          await generateAndStoreEmbeddings(course._id, c.desc, { type: 'tutor' });

          await Course.findByIdAndUpdate(course._id, { isAIIndexed: true });
          console.log(`✅ AI Indexing successful: ${course.title}`);
          indexed = true;
        } catch (error) {
          if (error.status === 429) {
            attempts++;
            console.warn(`⚠️ Rate limited. Waiting 15s to retry: ${c.title} (Attempt ${attempts})`);
            await sleep(15000);
          } else {
            console.error(`❌ Non-429 Error for ${c.title}:`, error.message);
            break;
          }
        }
      }

      const finalQuiz = await Quiz.create({
        course: course._id,
        title: `${c.title}: Final Examination`,
        passingScore: 80,
        questions: [
          { questionText: `What is the core principle of ${c.title}?`, options: ["Automation", "Scalability", "Optimization", "Security"], correctOptionIndex: 1 },
          { questionText: "Which component is considered the 'Brain' of this system?", options: ["User Interface", "Database", "Core Logic", "Cloud Provider"], correctOptionIndex: 2 },
          { questionText: "Is this technology limited to one specific industry?", options: ["Yes", "No", "Only in finance", "Only in health"], correctOptionIndex: 1 },
          { questionText: "What is the primary prerequisite for this course?", options: ["Advanced Math", "Basic Programming", "A laptop", "None"], correctOptionIndex: 1 },
          { questionText: "Would you apply these skills in a real-world project?", options: ["Probably", "Yes", "Absolutely", "Not sure"], correctOptionIndex: 2 }
        ]
      });

      course.finalQuiz = finalQuiz._id;
      await course.save();
    }

    console.log("✅ 20 Courses Seeded with AI Vectors and Quizzes.");

    const mernCourse = await Course.findOne({ title: "Full-Stack MERN Mastery" });
    const ethCourse = await Course.findOne({ title: "Ethereum Smart Contract Dev" });
    const aiCourse = await Course.findOne({ title: "Generative AI & LLMs" });

    await Course.findByIdAndUpdate(mernCourse._id, { $set: { enrolledCount: 1500 } });
    await Course.findByIdAndUpdate(ethCourse._id, { $set: { enrolledCount: 1200 } });
    await Course.findByIdAndUpdate(aiCourse._id, { $set: { enrolledCount: 1100 } });
    
    await Enrollment.create([
      { student: testStudent._id, course: mernCourse._id, progress: 100, completedLessons: [0, 1, 2, 3, 4], isCompleted: true },
      { student: testStudent._id, course: ethCourse._id, progress: 45, completedLessons: [0, 1], isCompleted: false }
    ]);

    await Interaction.create([
      { studentId: testStudent._id, courseId: mernCourse._id, instructorId: approvedInstructor._id, question: "How to deploy to Heroku?" },
      { studentId: testStudent._id, courseId: ethCourse._id, instructorId: approvedInstructor._id, question: "What is a gas fee?" },
      { studentId: testStudent._id, courseId: mernCourse._id, instructorId: approvedInstructor._id, question: "Explain Redux Thunk." }
    ]);

    await User.findByIdAndUpdate(testStudent._id, { $set: { enrolledCourses: [mernCourse._id, ethCourse._id] } });

    await Notification.create([{
        recipient: testStudent._id,
        type: 'system',
        title: 'Welcome to NextGen AI! 🚀',
        message: 'Your personal learning path is ready. Explore your recommendations.',
        isRead: false
    }]);

    console.log("🚀 DATABASE SEEDING COMPLETE.");
    process.exit(0);
  } catch (error) { 
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  }
};

seedData();