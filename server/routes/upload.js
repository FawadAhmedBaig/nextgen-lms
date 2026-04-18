const cloudinary = require('cloudinary').v2;
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Setup Storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'nextgen_courses',
    resource_type: 'raw', // This allows PDFs
  },
});

const upload = multer({ storage: storage });

// THE ROUTE
router.post('/create', upload.single('pdf'), async (req, res) => {
  try {
    const { title, description, price, lessons } = req.body;
    
    const newCourse = new Course({
      title,
      description,
      price,
      lessons: JSON.parse(lessons), // Lessons come as a string in FormData
      pdfUrl: req.file ? req.file.path : "" // This is the Cloudinary URL!
    });

    await newCourse.save();
    res.status(201).json(newCourse);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});