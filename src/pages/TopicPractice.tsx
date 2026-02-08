import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  ArrowLeft, 
  ArrowRight, 
  CheckCircle2, 
  XCircle, 
  BookOpen,
  Target,
  TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { Alert, AlertDescription } from "@/components/ui/alert";

type Question = {
  id: string;
  question_text: string;
  question_type: string;
  question_number: number;
  marks: number;
  difficulty: string;
  options: string[] | null;
  correct_answer: string[];
  sample_answer: string | null;
  image_url: string | null;
  past_papers: {
    name: string;
    year: string;
  };
};

type AttemptResult = {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
};

export default function TopicPractice() {
  const { id: topicId } = useParams();
  const navigate = useNavigate();
  const [topic, setTopic] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [attemptResults, setAttemptResults] = useState<AttemptResult[]>([]);
  const [showFeedback, setShowFeedback] = useState(false);
  const [currentResult, setCurrentResult] = useState<AttemptResult | null>(null);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUserAndLoadData();
  }, [topicId]);

  const checkUserAndLoadData = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      toast.error("Please login to practice topics");
      navigate("/login");
      return;
    }

    setUser(session.user);
    await loadTopicData();
  };

  const loadTopicData = async () => {
    setLoading(true);

    // Get topic details
    const { data: topicData, error: topicError } = await supabase
      .from("topics")
      .select(`
        id,
        name,
        subjects(
          id,
          name,
          grade_level
        )
      `)
      .eq("id", topicId)
      .single();

    if (topicError || !topicData) {
      toast.error("Failed to load topic");
      navigate("/topics");
      return;
    }

    // Get questions for this topic (with answers for practice mode)
    const { data: questionsData, error: questionsError } = await supabase
      .from("questions")
      .select(`
        id,
        question_text,
        question_type,
        question_number,
        marks,
        difficulty,
        options,
        correct_answer,
        sample_answer,
        image_url,
        past_papers!inner(
          name,
          year
        )
      `)
      .eq("topic_id", topicId)
      .order("question_number");

    if (questionsError || !questionsData || questionsData.length === 0) {
      toast.error("No questions found for this topic");
      navigate("/topics");
      return;
    }

    setTopic(topicData);
    setQuestions(questionsData as Question[]);
    setLoading(false);
  };

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) {
      toast.error("Please provide an answer");
      return;
    }

    setSubmitted(true);
    const currentQuestion = questions[currentQuestionIndex];
    let isCorrect = false;
    let marksAwarded = 0;

    // Check answer based on question type
    if (currentQuestion.question_type === "Multiple Choice") {
      isCorrect = currentQuestion.correct_answer.includes(userAnswer);
      marksAwarded = isCorrect ? currentQuestion.marks : 0;
    } else {
      // For open-ended questions, we'll award partial marks based on keyword matching
      // In a real app, this would use AI or teacher review
      const answerLower = userAnswer.toLowerCase();
      const correctAnswerLower = currentQuestion.correct_answer[0]?.toLowerCase() || "";
      
      // Simple keyword matching (this is a simplified approach)
      const keywords = correctAnswerLower.split(" ").filter(word => word.length > 3);
      const matchedKeywords = keywords.filter(keyword => answerLower.includes(keyword));
      const matchPercentage = keywords.length > 0 ? matchedKeywords.length / keywords.length : 0;
      
      marksAwarded = currentQuestion.marks * matchPercentage;
      isCorrect = matchPercentage >= 0.7; // 70% keyword match
    }

    const result: AttemptResult = {
      questionId: currentQuestion.id,
      userAnswer,
      isCorrect,
      marksAwarded,
      maxMarks: currentQuestion.marks,
    };

    setCurrentResult(result);
    setShowFeedback(true);

    // Save attempt to database
    if (user) {
      await supabase.from("user_attempts").insert({
        user_id: user.id,
        question_id: currentQuestion.id,
        user_answer: userAnswer,
        is_correct: isCorrect,
        marks_awarded: marksAwarded,
        attempted_at: new Date().toISOString(),
      });
    }

    // Add to results
    setAttemptResults([...attemptResults, result]);
  };

  const handleNextQuestion = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
      setUserAnswer("");
      setSubmitted(false);
      setShowFeedback(false);
      setCurrentResult(null);
    } else {
      // Show summary
      navigate(`/topic-practice/${topicId}/complete`, {
        state: { results: [...attemptResults, currentResult] },
      });
    }
  };

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
      // Load previous answer if exists
      const previousResult = attemptResults[currentQuestionIndex - 1];
      if (previousResult) {
        setUserAnswer(previousResult.userAnswer);
        setSubmitted(true);
        setShowFeedback(true);
        setCurrentResult(previousResult);
      } else {
        setUserAnswer("");
        setSubmitted(false);
        setShowFeedback(false);
        setCurrentResult(null);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading practice session...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const totalMarksEarned = attemptResults.reduce((sum, r) => sum + r.marksAwarded, 0) + 
    (currentResult?.marksAwarded || 0);
  const totalMarksPossible = questions.slice(0, currentQuestionIndex + (submitted ? 1 : 0))
    .reduce((sum, q) => sum + q.marks, 0);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Header */}
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => navigate("/topics")}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Topics
          </Button>

          <div className="flex items-start justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">
                {topic.name}
              </h1>
              <p className="text-muted-foreground">
                {topic.subjects.name} • Grade {topic.subjects.grade_level}
              </p>
            </div>
            <div className="text-right">
              <Badge variant="outline" className="mb-2">
                Question {currentQuestionIndex + 1} of {questions.length}
              </Badge>
              <p className="text-sm text-muted-foreground">
                Score: {totalMarksEarned.toFixed(1)}/{totalMarksPossible} marks
              </p>
            </div>
          </div>

          <Progress value={progress} className="h-2" />
        </div>

        {/* Question Card */}
        <Card className="mb-6">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <CardTitle className="text-xl mb-2">
                  Question {currentQuestion.question_number}
                </CardTitle>
                <CardDescription className="flex items-center gap-3">
                  <Badge>{currentQuestion.question_type}</Badge>
                  <span>{currentQuestion.marks} marks</span>
                  <span>•</span>
                  <span>{currentQuestion.difficulty}</span>
                  <span>•</span>
                  <span className="text-xs">
                    {currentQuestion.past_papers.year} - {currentQuestion.past_papers.name}
                  </span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="prose prose-sm max-w-none">
                <p className="text-base whitespace-pre-wrap">{currentQuestion.question_text}</p>
              </div>

              {currentQuestion.image_url && (
                <div className="border rounded-lg overflow-hidden">
                  <img 
                    src={currentQuestion.image_url} 
                    alt="Question illustration" 
                    className="w-full h-auto"
                  />
                </div>
              )}

              {/* Answer Input */}
              {!submitted && (
                <div className="space-y-4">
                  {currentQuestion.question_type === "Multiple Choice" && currentQuestion.options ? (
                    <RadioGroup value={userAnswer} onValueChange={setUserAnswer}>
                      <div className="space-y-3">
                        {currentQuestion.options.map((option, index) => (
                          <div key={index} className="flex items-center space-x-2">
                            <RadioGroupItem value={option} id={`option-${index}`} />
                            <Label 
                              htmlFor={`option-${index}`}
                              className="flex-1 cursor-pointer p-3 rounded-lg border hover:bg-accent transition-colors"
                            >
                              {option}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  ) : (
                    <div>
                      <Label htmlFor="answer" className="mb-2 block">Your Answer</Label>
                      <Textarea
                        id="answer"
                        value={userAnswer}
                        onChange={(e) => setUserAnswer(e.target.value)}
                        placeholder="Type your answer here..."
                        className="min-h-32"
                      />
                    </div>
                  )}

                  <Button 
                    onClick={handleSubmitAnswer}
                    disabled={!userAnswer.trim()}
                    className="w-full"
                  >
                    Submit Answer
                  </Button>
                </div>
              )}

              {/* Feedback */}
              {showFeedback && currentResult && (
                <div className="space-y-4 border-t pt-6">
                  <Alert className={currentResult.isCorrect ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}>
                    <div className="flex items-start gap-3">
                      {currentResult.isCorrect ? (
                        <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5" />
                      ) : (
                        <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                      )}
                      <div className="flex-1">
                        <h4 className={`font-semibold mb-1 ${currentResult.isCorrect ? "text-green-900" : "text-red-900"}`}>
                          {currentResult.isCorrect ? "Correct!" : "Incorrect"}
                        </h4>
                        <AlertDescription className={currentResult.isCorrect ? "text-green-800" : "text-red-800"}>
                          You earned {currentResult.marksAwarded.toFixed(1)} out of {currentResult.maxMarks} marks
                        </AlertDescription>
                      </div>
                    </div>
                  </Alert>

                  <div className="bg-muted/50 p-4 rounded-lg space-y-3">
                    <div>
                      <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                        <Target className="h-4 w-4" />
                        Your Answer:
                      </h4>
                      <p className="text-sm pl-6">{currentResult.userAnswer}</p>
                    </div>

                    {!currentResult.isCorrect && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <CheckCircle2 className="h-4 w-4 text-green-600" />
                          Correct Answer:
                        </h4>
                        <p className="text-sm pl-6">
                          {currentQuestion.correct_answer.join(", ")}
                        </p>
                      </div>
                    )}

                    {currentQuestion.sample_answer && (
                      <div>
                        <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                          <BookOpen className="h-4 w-4 text-primary" />
                          Sample Answer / Explanation:
                        </h4>
                        <p className="text-sm pl-6 whitespace-pre-wrap">
                          {currentQuestion.sample_answer}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePreviousQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>

          {submitted && (
            <Button onClick={handleNextQuestion}>
              {currentQuestionIndex < questions.length - 1 ? (
                <>
                  Next Question
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  View Summary
                  <TrendingUp className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
