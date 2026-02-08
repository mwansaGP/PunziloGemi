import { useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, XCircle, Clock, Award, ArrowLeft, Home, X } from "lucide-react";

const cleanGeminiText = (text: string): string => {
  if (!text) return text;

  let cleaned = text.replace(/\r\n/g, "\n");

  // Remove trailing whitespace
  cleaned = cleaned.replace(/[ \t]+$/gm, "");

  // Turn markdown-style bullets and numbered lists into plain sentences
  cleaned = cleaned.replace(/^\s*[\*-]\s+/gm, "");
  cleaned = cleaned.replace(/^\s*\d+[\.)]\s+/gm, "");

  // Remove markdown emphasis asterisks like *text* or **text**
  cleaned = cleaned.replace(/\*{1,3}([^*\n]+)\*{1,3}/g, "$1");

  // Collapse 3+ blank lines into a maximum of 2
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  return cleaned.trim();
};

export default function ExamComplete() {
  const location = useLocation();
  const navigate = useNavigate();
  const state = location.state;
  const [geminiLoadingId, setGeminiLoadingId] = useState<string | null>(null);
  const [geminiAnswers, setGeminiAnswers] = useState<Record<string, string>>({});

  if (!state) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No exam results found</p>
              <Button asChild className="mt-4">
                <Link to="/papers">Browse Papers</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const { paperName, totalMarks, earnedMarks, timeTaken, attempts, questions } = state;
  const percentage = Math.round((earnedMarks / totalMarks) * 100);
  const minutes = Math.floor(timeTaken / 60);
  const seconds = timeTaken % 60;

  const incorrectAttempts = attempts.filter((a: any) => !a.is_correct);
  const incorrectQuestions = questions.filter((q: any) => 
    incorrectAttempts.some((a: any) => a.question_id === q.id)
  );

  const handleAskGemini = async (question: any, attempt: any) => {
    if (!question) return;

    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

    if (!apiKey) {
      setGeminiAnswers((prev) => ({
        ...prev,
        [question.id]:
          "Gemini is not configured. Please contact your administrator to add the API key.",
      }));
      return;
    }

    const questionIndex = questions.findIndex((q: any) => q.id === question.id) + 1;

    let details = `This is a review after an exam on the paper "${paperName}".`;
    details += `\nQuestion number: ${questionIndex}.`;
    details += `\nQuestion text: ${question.question_text}`;

    if (question.question_type === "MCQ" && question.options) {
      const optionsList = (question.options as string[]).map(
        (option: string, idx: number) => `${String.fromCharCode(65 + idx)}. ${option}`
      );
      details += `\n\nOptions:\n${optionsList.join("\n")}`;
    }

    const userAnswer = attempt?.user_answer || "No answer provided";
    details += `\n\nStudent's answer: ${userAnswer}.`;
    details += `\nThe student's answer was marked incorrect.`;

    const correctAnswerText = Array.isArray(question.correct_answer)
      ? question.correct_answer.join(", ")
      : question.correct_answer || "Answer not available";
    details += `\nCorrect answer: ${correctAnswerText}.`;

    if (question.sample_answer) {
      details += `\nSample answer (if provided): ${question.sample_answer}`;
    }

    const systemPrompt =
      "You are a helpful exam tutor for Zed Past Prep students in Zambia. " +
      "Explain clearly, step by step, why the correct answer is right and why the student's answer is wrong. " +
      "Use simple, encouraging language and focus on what the student should remember for next time.";

    setGeminiLoadingId(question.id);

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
                parts: [
                  { text: systemPrompt },
                  { text: details },
                ],
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
          ?.trim() ||
        "I'm sorry, I couldn't generate an explanation right now.";

      const reply = cleanGeminiText(rawReply);

      setGeminiAnswers((prev) => ({
        ...prev,
        [question.id]: reply,
      }));
    } catch (error: any) {
      setGeminiAnswers((prev) => ({
        ...prev,
        [question.id]:
          error?.message ||
          "Sorry, I couldn't reach Gemini to explain this question. Please try again later.",
      }));
    } finally {
      setGeminiLoadingId(null);
    }
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navigation />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate("/papers")}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Papers
        </Button>

        {/* Results Summary */}
        <Card className="mb-6 border-2 border-primary/20">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <div className={`p-4 rounded-full ${percentage >= 50 ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
                {percentage >= 50 ? (
                  <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400" />
                ) : (
                  <XCircle className="h-16 w-16 text-red-600 dark:text-red-400" />
                )}
              </div>
            </div>
            <CardTitle className="text-3xl mb-2">
              {percentage >= 50 ? "Congratulations!" : "Keep Practicing!"}
            </CardTitle>
            <p className="text-muted-foreground">{paperName}</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-muted/50 rounded-lg">
                <Award className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold text-foreground">
                  {earnedMarks}/{totalMarks}
                </p>
                <p className="text-sm text-muted-foreground">Score ({percentage}%)</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <Clock className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold text-foreground">
                  {minutes}m {seconds}s
                </p>
                <p className="text-sm text-muted-foreground">Time Taken</p>
              </div>
              <div className="p-4 bg-muted/50 rounded-lg">
                <XCircle className="h-8 w-8 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold text-foreground">
                  {incorrectQuestions.length}
                </p>
                <p className="text-sm text-muted-foreground">Incorrect Answers</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Incorrect Questions */}
        {incorrectQuestions.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-2xl font-bold text-foreground">Questions to Review</h2>
            {incorrectQuestions.map((question: any, index: number) => {
              const attempt = incorrectAttempts.find((a: any) => a.question_id === question.id);
              
              return (
                <Card key={question.id} className="border-red-200 dark:border-red-900">
                  <CardHeader>
                    <CardTitle className="text-lg flex items-start gap-2">
                      <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                      <span>Question {questions.findIndex((q: any) => q.id === question.id) + 1} ({question.marks} marks)</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-foreground">{question.question_text}</p>
                    
                    {question.image_url && (
                      <img 
                        src={question.image_url} 
                        alt="Question" 
                        className="max-w-full h-auto rounded-lg"
                      />
                    )}

                    <div className="bg-red-50 dark:bg-red-900/10 p-4 rounded-lg">
                      <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                        Your Answer:
                      </p>
                      <p className="text-red-700 dark:text-red-300">
                        {attempt?.user_answer || "No answer provided"}
                      </p>
                    </div>

                    <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-lg">
                      <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-1">
                        Correct Answer:
                      </p>
                      <p className="text-green-700 dark:text-green-300">
                        {Array.isArray(question.correct_answer) 
                          ? question.correct_answer.join(", ") 
                          : question.correct_answer || "Answer not available"}
                      </p>
                    </div>

                    {question.sample_answer && (
                      <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-lg">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
                          Sample Answer:
                        </p>
                        <p className="text-blue-700 dark:text-blue-300">
                          {question.sample_answer}
                        </p>
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2 border-t flex-wrap gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAskGemini(question, attempt)}
                        disabled={geminiLoadingId === question.id}
                        className="h-8 text-xs"
                      >
                        {geminiLoadingId === question.id
                          ? "Asking Gemini..."
                          : "Ask Gemini to explain"}
                      </Button>
                    </div>

                    {geminiAnswers[question.id] && (
                      <div className="mt-3 rounded-md bg-muted/60 p-3 text-xs sm:text-sm whitespace-pre-wrap text-muted-foreground">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-semibold text-foreground">
                            Gemini explanation
                          </div>
                          <button
                            type="button"
                            aria-label="Close Gemini explanation"
                            className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted/80"
                            onClick={() =>
                              setGeminiAnswers((prev) => {
                                const { [question.id]: _removed, ...rest } = prev;
                                return rest;
                              })
                            }
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                        {geminiAnswers[question.id]}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {incorrectQuestions.length === 0 && (
          <Card className="text-center py-12 border-2 border-green-200 dark:border-green-900">
            <CardContent>
              <CheckCircle className="h-16 w-16 text-green-600 dark:text-green-400 mx-auto mb-4" />
              <h3 className="text-xl font-bold text-foreground mb-2">Perfect Score!</h3>
              <p className="text-muted-foreground">
                You answered all questions correctly. Excellent work!
              </p>
            </CardContent>
          </Card>
        )}

        {/* Action Buttons */}
        <div className="flex gap-4 mt-8">
          <Button variant="outline" className="flex-1" asChild>
            <Link to="/papers">
              <Home className="h-4 w-4 mr-2" />
              Browse Papers
            </Link>
          </Button>
          <Button className="flex-1" asChild>
            <Link to="/dashboard">
              Go to Dashboard
            </Link>
          </Button>
        </div>
      </main>
    </div>
  );
}
