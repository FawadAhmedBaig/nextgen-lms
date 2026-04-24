import mongoose from 'mongoose';

const liveSessionSchema = new mongoose.Schema({
  title: { type: String, required: true },
  date: { type: Date, required: true },
  time: { type: String, required: true },
  meetingLink: { type: String, required: true },
  duration: { type: String, default: "60 min" },
  status: { type: String, enum: ['scheduled', 'live', 'ended'], default: 'scheduled' }
});

const itemSchema = new mongoose.Schema({
  type: { type: String, enum: ['video', 'pdf', 'quiz'], required: true },
  title: { type: String, required: true },
  contentUrl: { type: String }, 
  questions: [{
    questionText: String,
    options: [String],
    correctOptionIndex: Number
  }]
});

const moduleSchema = new mongoose.Schema({
  name: { type: String, required: true },
  items: [itemSchema]
});

const embeddingSchema = new mongoose.Schema({
  content: { type: String, required: true },
  vector: { type: [Number], required: true },
  chunkIndex: { type: Number }
});

const courseSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  content: { type: String }, 

  discoveryVector: { 
    type: [Number], 
    default: [] 
  },
  
  embeddings: [embeddingSchema],

  price: { type: String, default: "Free" },
  category: { type: String, required: true },
  duration: { type: String, required: true },
  level: { type: String, required: true },

instructor: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true
},

  modules: [moduleSchema], 
  pdfUrl: { type: String },
  imageUrl: { type: String },
  finalQuiz: { type: mongoose.Schema.Types.ObjectId, ref: 'Quiz' },
  liveSessions: [liveSessionSchema],

  // 🔥 NEW FIELDS FOR POPULARITY & ANALYTICS 🔥
  enrolledCount: { 
    type: Number, 
    default: 0 
  },
  averageRating: { 
    type: Number, 
    default: 4.5 
  },
  totalLessons: { 
    type: Number, 
    default: 0 
  },

  isAIIndexed: { type: Boolean, default: false }

}, { timestamps: true });

const Course = mongoose.models.Course || mongoose.model('Course', courseSchema);

export default Course;