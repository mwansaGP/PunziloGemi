import { z } from "zod";

export const questionFormSchema = z.object({
  past_paper_id: z.string().uuid("Invalid paper ID"),
  subject_id: z.string().uuid("Invalid subject ID"),
  topic_id: z.string().optional(),
  question_text: z.string().trim().min(5, "Question must be at least 5 characters").max(5000, "Question too long"),
  question_type: z.enum(["MCQ", "ShortAnswer", "Essay"]),
  sample_answer: z.string().max(5000, "Sample answer too long").optional(),
  difficulty: z.enum(["Easy", "Medium", "Hard"]),
  question_number: z.number().int().positive("Question number must be positive"),
  marks: z.number().positive("Marks must be positive").max(100, "Marks cannot exceed 100"),
  image_url: z.string().url("Invalid image URL").optional().or(z.literal("")),
  options: z.array(z.string().trim().max(500)).optional(),
  correct_answer: z.array(z.string().trim().max(500)).min(1, "At least one correct answer required"),
});

export const paperFormSchema = z.object({
  year: z.string().regex(/^\d{4}$/, "Invalid year format"),
  subject_id: z.string().uuid("Invalid subject ID"),
  grade_level: z.enum(["Seven", "Nine", "Twelve", "GCE"]),
  paper_type: z.enum(["none", "Paper1", "Paper2", "Paper3"]),
  duration: z.string().regex(/^\d+$/, "Duration must be a number"),
  total_score: z.number().int().positive("Total score must be positive").max(300, "Total score too high"),
  is_writable: z.boolean(),
});
