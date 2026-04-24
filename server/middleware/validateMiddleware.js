import { z } from 'zod';

export const validate = (schema) => (req, res, next) => {
  try {
    schema.parse({
      body: req.body,
      query: req.query,
      params: req.params,
    });
    next();
  } catch (error) {
    // 1. Check if it's a Zod error
    if (error?.errors && Array.isArray(error.errors)) {
      // Find which field failed (e.g., "duration")
      const field = error.errors[0].path[1] || "input"; 
      // Get the message you wrote in the schema (e.g., "Format must be...")
      const message = error.errors[0].message;

      // 🔥 Combine them: "duration: Format must be like '9h'..."
      const specificMessage = `${field.toUpperCase()}: ${message}`;
      
      console.log(`🛡️ Validation Blocked: ${specificMessage}`);
      return res.status(400).json({ error: specificMessage });
    }

    return res.status(400).json({ error: "Invalid input. Please check all fields." });
  }
};

// --- AUTH SCHEMAS ---

export const signupSchema = z.object({
  body: z.object({
    name: z.string().min(3, "Name must be at least 3 characters"),
    email: z.string().email("Invalid email format"),
    password: z.string().min(6, "Password must be at least 6 characters"),
    role: z.enum(['student', 'instructor']).optional(),
  })
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Invalid email format"),
    password: z.string().min(1, "Password is required"),
  })
});

// --- COURSE & INSTRUCTOR SCHEMAS ---

export const getAllCoursesSchema = z.object({
  // 🔥 FIX: Added .passthrough() to allow frontend cache-buster timestamps (?t=...)
  query: z.object({}).passthrough() 
});

export const recommendationSchema = z.object({
  params: z.object({
    userId: z.string().length(24, "Invalid User ID format")
  }),
  // Allow analytics/tracking query params
  query: z.object({}).passthrough()
});

export const courseUploadSchema = z.object({
  body: z.object({
    title: z.string().min(5, "Title must be at least 5 characters"),
    description: z.string().min(20, "Description is too short"),
    price: z.string().refine(val => val === "Free" || /^\$\d+(\.\d{2})?$/.test(val), {
    message: "Please enter a valid price (e.g., 49.99) or 'Free'"
    }),
    category: z.string().min(2, "Category is required"),
    level: z.string().optional(),
    duration: z.string()
  .trim()
  .regex(
    /^((\d+h\s*)?(\d+min)?|(\d+h\s*)?(\d+m)?)$/i, 
    "Format must be '9h', '50min', or '9h 50min'"
  )
  .refine(val => val.length > 0, "Duration cannot be empty"),
    modules: z.string().refine((val) => {
      try { JSON.parse(val); return true; } catch { return false; }
    }, "Invalid module structure")
  })
});

export const liveSessionSchema = z.object({
  body: z.object({
    title: z.string().min(5, "Session title too short").max(100),
    meetingLink: z.string().url("Invalid meeting URL"),
    date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Invalid date format (YYYY-MM-DD)"),
    time: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format (HH:MM)")
  })
});

// --- PROFILE & ADMIN SCHEMAS ---

export const updateProfileSchema = z.object({
  body: z.object({
    // .nullish() allows the field to be null, undefined, or a string
    name: z.string().min(3, "Name too short").nullish(),
    bio: z.string().max(200, "Bio too long").nullish(),
  })
});

export const adminStatusSchema = z.object({
  body: z.object({
    status: z.enum(['active', 'blocked', 'pending'], "Invalid status"),
  }),
  params: z.object({
    id: z.string().length(24, "Invalid User ID format")
  })
});

export const publicResolveSchema = z.object({
  params: z.object({
    studentId: z.string().length(24, "Invalid Student Reference"),
    courseId: z.string().length(24, "Invalid Course Reference")
  })
});