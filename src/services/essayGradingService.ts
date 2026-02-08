interface ApiConfig {
  id: string;
  name: string;
  rootUrl: string;
  status: string;
}

interface GradingCriteria {
  content_weight?: number;
  structure_weight?: number;
  language_weight?: number;
  relevance_weight?: number;
}

interface GradeEssayRequest {
  question_type: "short_essay" | "long_essay";
  question: {
    text: string;
    max_marks: number;
    subject?: string;
    topic?: string;
  };
  student_answer: string;
  reference_answer: {
    type: "key_points" | "model_essay";
    content: string[] | string;
  };
  grading_criteria?: GradingCriteria;
}

interface ScoreBreakdown {
  content?: { marks: number; max: number; feedback: string };
  structure?: { marks: number; max: number; feedback: string };
  language?: { marks: number; max: number; feedback: string };
  relevance?: { marks: number; max: number; feedback: string };
}

interface GradeEssayResponse {
  success: boolean;
  score?: {
    total_marks: number;
    max_marks: number;
    percentage: number;
    breakdown?: ScoreBreakdown;
  };
  feedback?: {
    summary: string;
    strengths?: string[];
    improvements?: string[];
  };
  error?: {
    code: string;
    message: string;
    details?: string;
  };
}

export const getConfiguredApiUrl = (): string | null => {
  const savedApis = localStorage.getItem("admin_api_configs");
  if (!savedApis) return null;
  
  const apis: ApiConfig[] = JSON.parse(savedApis);
  // Get the first configured API (essay grading API)
  const essayApi = apis.find(api => 
    api.name.toLowerCase().includes("essay") || 
    api.name.toLowerCase().includes("grading")
  ) || apis[0];
  
  return essayApi?.rootUrl || null;
};

export const checkApiHealth = async (): Promise<boolean> => {
  const apiUrl = getConfiguredApiUrl();
  if (!apiUrl) return false;

  try {
    const response = await fetch(`${apiUrl}/health`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      return data.status === "healthy";
    }
    return false;
  } catch (error) {
    console.error("API health check failed:", error);
    return false;
  }
};

export const gradeEssay = async (
  questionText: string,
  studentAnswer: string,
  referenceAnswer: string | string[],
  maxMarks: number,
  questionType: "ShortAnswer" | "Essay",
  subject?: string,
  topic?: string,
  usePreview: boolean = true // Use preview endpoint by default (no auth required)
): Promise<GradeEssayResponse> => {
  const apiUrl = getConfiguredApiUrl();
  
  if (!apiUrl) {
    // If no external grading API is configured, fall back to Gemini-based grading
    return gradeEssayWithGemini(
      questionText,
      studentAnswer,
      referenceAnswer,
      maxMarks,
      questionType,
      subject,
      topic
    );
  }

  // Determine essay type based on marks and question type
  const essayType: "short_essay" | "long_essay" = 
    questionType === "ShortAnswer" || maxMarks <= 10 
      ? "short_essay" 
      : "long_essay";

  // Format reference answer based on essay type
  const referenceAnswerFormatted: { type: "key_points" | "model_essay"; content: string | string[] } = {
    type: essayType === "short_essay" ? "key_points" : "model_essay",
    content: Array.isArray(referenceAnswer) 
      ? referenceAnswer 
      : essayType === "short_essay" 
        ? [referenceAnswer] 
        : referenceAnswer
  };

  const requestBody: GradeEssayRequest = {
    question_type: essayType,
    question: {
      text: questionText,
      max_marks: maxMarks,
      subject,
      topic
    },
    student_answer: studentAnswer,
    reference_answer: referenceAnswerFormatted
  };

  // Use preview endpoint for testing (no auth) or authenticated endpoint
  const endpoint = usePreview 
    ? `${apiUrl}/functions/v1/grade-essay/preview`
    : `${apiUrl}/functions/v1/grade-essay`;

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };

    // Add authorization header for non-preview requests
    if (!usePreview) {
      const anonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
      if (anonKey) {
        headers["Authorization"] = `Bearer ${anonKey}`;
      }
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      return {
        success: false,
        error: {
          code: errorData.error?.code || `HTTP_${response.status}`,
          message: errorData.error?.message || `API returned status ${response.status}`,
          details: errorData.error?.details
        }
      };
    }

    const data: GradeEssayResponse = await response.json();
    return data;
  } catch (error) {
    console.error("Essay grading API error:", error);
    return {
      success: false,
      error: {
        code: "NETWORK_ERROR",
        message: error instanceof Error ? error.message : "Failed to connect to grading API",
        details: "Please check your network connection and API configuration"
      }
    };
  }
};

export const isEssayQuestion = (questionType: string): boolean => {
  return questionType === "ShortAnswer" || questionType === "Essay";
};

export type { GradeEssayResponse, ScoreBreakdown, GradingCriteria };

// Gemini-based essay grading fallback
const gradeEssayWithGemini = async (
  questionText: string,
  studentAnswer: string,
  referenceAnswer: string | string[],
  maxMarks: number,
  questionType: "ShortAnswer" | "Essay",
  subject?: string,
  topic?: string,
): Promise<GradeEssayResponse> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

  if (!apiKey) {
    return {
      success: false,
      error: {
        code: "NO_GEMINI_API_KEY",
        message: "Gemini API key is not configured",
        details: "Please set VITE_GEMINI_API_KEY in your environment configuration",
      },
    };
  }

  const essayType: "short_essay" | "long_essay" =
    questionType === "ShortAnswer" || maxMarks <= 10 ? "short_essay" : "long_essay";

  const referenceText = Array.isArray(referenceAnswer)
    ? referenceAnswer.join("\n- ")
    : referenceAnswer;

  const systemPrompt =
    "You are an experienced exam marker for the Zambian school curriculum. " +
    "You must grade the student's answer fairly and consistently using the marking guide provided. " +
    "Return ONLY valid JSON that matches this TypeScript interface (no extra text, no markdown):\\n" +
    "{\\n" +
    "  \"score\": {\\n" +
    "    \"total_marks\": number,\\n" +
    "    \"max_marks\": number,\\n" +
    "    \"percentage\": number,\\n" +
    "    \"breakdown\"?: {\\n" +
    "      \"content\"?: { \"marks\": number; \"max\": number; \"feedback\": string },\\n" +
    "      \"structure\"?: { \"marks\": number; \"max\": number; \"feedback\": string },\\n" +
    "      \"language\"?: { \"marks\": number; \"max\": number; \"feedback\": string },\\n" +
    "      \"relevance\"?: { \"marks\": number; \"max\": number; \"feedback\": string }\\n" +
    "    }\\n" +
    "  },\\n" +
    "  \"feedback\"?: {\\n" +
    "    \"summary\": string,\\n" +
    "    \"strengths\"?: string[],\\n" +
    "    \"improvements\"?: string[]\\n" +
    "  }\\n" +
    "}";

  const userPrompt = [
    `Question type: ${essayType === "short_essay" ? "short_essay" : "long_essay"}.`,
    subject ? `Subject: ${subject}.` : null,
    topic ? `Topic: ${topic}.` : null,
    `Maximum marks: ${maxMarks}.`,
    "",
    "Question:",
    questionText,
    "",
    "Marking guide / reference answer (use this to decide marks):",
    referenceText,
    "",
    "Student's answer (grade this):",
    studentAnswer,
    "",
    "Important marking rules:",
    "- Award partial marks when the student shows partial understanding.",
    "- Do NOT exceed the maximum marks.",
    "- Be consistent and fair; avoid being too strict or too generous.",
    "- Consider content accuracy first, then structure, language, and relevance.",
    "",
    "Now respond ONLY with JSON matching the interface described above. Do not include any explanation outside the JSON object.",
  ]
    .filter(Boolean)
    .join("\n");

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              role: "user",
              parts: [{ text: systemPrompt }, { text: userPrompt }],
            },
          ],
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => undefined);
      const message =
        (errorData && (errorData.error?.message || errorData.message)) ||
        `Gemini API error: ${response.status}`;
      throw new Error(message);
    }

    const data = await response.json();

    const rawReply =
      data?.candidates?.[0]?.content?.parts
        ?.map((part: { text?: string }) => part.text || "")
        .join("\n")
        ?.trim() || "";

    // Try to extract the JSON object from the model output
    const jsonMatch = rawReply.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Gemini response did not contain a JSON object");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.score || typeof parsed.score.total_marks !== "number") {
      throw new Error("Gemini response JSON is missing required score fields");
    }

    // Clamp marks to valid range
    const totalMarks = Math.max(0, Math.min(maxMarks, parsed.score.total_marks));
    const maxMarksValue = maxMarks;
    const percentage = maxMarksValue > 0 ? (totalMarks / maxMarksValue) * 100 : 0;

    const score = {
      total_marks: totalMarks,
      max_marks: maxMarksValue,
      percentage,
      breakdown: parsed.score.breakdown,
    };

    const feedback = parsed.feedback;

    return {
      success: true,
      score,
      feedback,
    };
  } catch (error) {
    console.error("Gemini essay grading error:", error);
    return {
      success: false,
      error: {
        code: "GEMINI_GRADING_ERROR",
        message:
          error instanceof Error
            ? error.message
            : "Failed to grade essay using Gemini",
      },
    };
  }
};
