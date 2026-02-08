import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Send, Clock } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { gradeEssay, isEssayQuestion, getConfiguredApiUrl } from "@/services/essayGradingService";

export default function ExamAttempt() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [paper, setPaper] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [timeRemaining, setTimeRemaining] = useState<number>(0);
  const [examSessionId, setExamSessionId] = useState<string | null>(null);

  useEffect(() => {
    loadExamData();
  }, [id]);

  useEffect(() => {
    if (!paper || timeRemaining <= 0) return;

    const timer = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          handleSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [paper, timeRemaining]);

  const loadExamData = async () => {
    setLoading(true);
    
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      navigate("/login");
      return;
    }

    const { data: paperData } = await supabase
      .from("past_papers")
      .select("*, subjects(name, grade_level)")
      .eq("id", id)
      .single();

    // Use secure RPC function that excludes answers
    const { data: questionsData } = await supabase
      .rpc("get_questions_for_exam", { paper_id: id });

    if (paperData && questionsData) {
      setPaper(paperData);
      setQuestions(questionsData);
      const durationInSeconds = parseInt(paperData.duration) * 60;
      setTimeRemaining(durationInSeconds);
      setStartTime(Date.now());

      // Create exam session
      const { data: sessionData, error: sessionError } = await supabase
        .from("exam_sessions")
        .insert({
          user_id: user.id,
          past_paper_id: id,
          started_at: new Date().toISOString(),
          total_possible_score: paperData.total_score
        })
        .select()
        .single();

      if (sessionError) {
        console.error("Error creating exam session:", sessionError);
      } else if (sessionData) {
        setExamSessionId(sessionData.id);
      }
    }
    setLoading(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers({ ...answers, [questionId]: answer });
  };

  const handleSubmit = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to submit answers",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const endTime = Date.now();
      const timeTakenSeconds = Math.floor((endTime - startTime) / 1000);
      
      // Fetch full question data with correct answers for grading
      const { data: fullQuestions } = await supabase
        .from("questions")
        .select("*, topics(name), subjects(name)")
        .in("id", questions.map(q => q.id));

      const questionsWithAnswers = fullQuestions || [];
      
      // Process each question - MCQs locally, essays via API
      const attempts = await Promise.all(
        questions.map(async (question) => {
          const userAnswer = answers[question.id] || "";
          const fullQuestion = questionsWithAnswers.find(q => q.id === question.id);
          
          let isCorrect = false;
          let marksAwarded = 0;

          if (question.question_type === "MCQ") {
            // Grade MCQ locally
            isCorrect = fullQuestion?.correct_answer?.includes(userAnswer) || false;
            marksAwarded = isCorrect ? question.marks : 0;
          } else if (isEssayQuestion(question.question_type)) {
            // Grade essay/short answer via API
            const apiConfigured = getConfiguredApiUrl();
            
            if (apiConfigured && fullQuestion) {
              const referenceAnswer = fullQuestion.sample_answer || fullQuestion.correct_answer;
              
              const gradingResult = await gradeEssay(
                question.question_text,
                userAnswer,
                referenceAnswer,
                question.marks,
                question.question_type as "ShortAnswer" | "Essay",
                fullQuestion.subjects?.name,
                fullQuestion.topics?.name
              );

              if (gradingResult.success && gradingResult.score) {
                marksAwarded = gradingResult.score.total_marks;
                // Consider it "correct" if they got at least 50% of marks
                isCorrect = gradingResult.score.percentage >= 50;
              } else {
                // Fallback: if API fails, use simple matching
                console.warn("Essay grading API failed:", gradingResult.error);
                const correctAnswers = fullQuestion?.correct_answer || [];
                const answerLower = userAnswer.toLowerCase().trim();
                isCorrect = correctAnswers.some((ans: string) => 
                  answerLower.includes(ans.toLowerCase().trim())
                );
                marksAwarded = isCorrect ? question.marks * 0.5 : 0;
              }
            } else {
              // No API configured - use simple matching
              const correctAnswers = fullQuestion?.correct_answer || [];
              const answerLower = userAnswer.toLowerCase().trim();
              isCorrect = correctAnswers.some((ans: string) => 
                answerLower.includes(ans.toLowerCase().trim())
              );
              marksAwarded = isCorrect ? question.marks : 0;
            }
          }

          return {
            user_id: user.id,
            question_id: question.id,
            user_answer: userAnswer,
            is_correct: isCorrect,
            marks_awarded: marksAwarded,
            exam_session_id: examSessionId,
          };
        })
      );

      const { error: attemptsError } = await supabase
        .from("user_attempts")
        .insert(attempts);

      if (attemptsError) throw attemptsError;

      const totalMarks = questions.reduce((sum, q) => sum + q.marks, 0);
      const earnedMarks = attempts.reduce((sum, a) => sum + a.marks_awarded, 0);

      // Update exam session with completion data
      if (examSessionId) {
        await supabase
          .from("exam_sessions")
          .update({
            completed_at: new Date().toISOString(),
            duration_seconds: timeTakenSeconds,
            total_score: earnedMarks
          })
          .eq("id", examSessionId);
      }

      navigate("/exam-complete", {
        state: {
          paperId: id,
          paperName: paper.name,
          totalMarks,
          earnedMarks,
          timeTaken: timeTakenSeconds,
          attempts,
          questions,
          sessionId: examSessionId,
        },
      });
    } catch (error) {
      console.error("Error submitting exam:", error);
      toast({
        title: "Error",
        description: "Failed to submit exam. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">Loading exam...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">Exam not found</p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navigation />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <img 
                  src="/src/assets/ecz-logo.png" 
                  alt="ECZ Logo" 
                  className="h-16 w-16 object-contain"
                />
                <div>
                  <CardTitle className="text-2xl">{paper.name}</CardTitle>
                  <p className="text-muted-foreground">
                    {paper.subjects?.name} - Grade {paper.grade_level === "Seven" ? "7" : paper.grade_level === "Nine" ? "9" : "12"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {paper.year} • {paper.duration} minutes • {paper.total_score} marks
                  </p>
                </div>
              </div>
              <div className={`flex items-center gap-2 px-4 py-2 rounded-lg ${
                timeRemaining < 300 ? 'bg-destructive/10 text-destructive' : 'bg-primary/10 text-primary'
              }`}>
                <Clock className="h-5 w-5" />
                <span className="text-2xl font-bold">{formatTime(timeRemaining)}</span>
              </div>
            </div>
          </CardHeader>
        </Card>

        {questions.map((question, index) => (
          <Card key={question.id} className="mb-6">
            <CardHeader>
              <CardTitle className="text-lg">
                Question {index + 1} ({question.marks} marks)
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

              {question.question_type === "MCQ" && question.options ? (
                <RadioGroup
                  value={answers[question.id] || ""}
                  onValueChange={(value) => handleAnswerChange(question.id, value)}
                >
                  {question.options.map((option: string, optIndex: number) => (
                    <div key={optIndex} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`${question.id}-${optIndex}`} />
                      <Label htmlFor={`${question.id}-${optIndex}`}>{option}</Label>
                    </div>
                  ))}
                </RadioGroup>
              ) : (
                <Textarea
                  placeholder="Type your answer here..."
                  value={answers[question.id] || ""}
                  onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                  rows={4}
                />
              )}
            </CardContent>
          </Card>
        ))}

        <Card className="sticky bottom-4 shadow-lg">
          <CardContent className="py-4">
            <Button 
              onClick={handleSubmit} 
              disabled={submitting}
              className="w-full"
              size="lg"
            >
              <Send className="h-4 w-4 mr-2" />
              {submitting ? "Submitting..." : "Submit Exam"}
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
