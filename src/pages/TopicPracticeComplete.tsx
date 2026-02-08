import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { 
  CheckCircle2, 
  XCircle, 
  TrendingUp,
  RotateCcw,
  BookOpen,
  Home,
  BarChart3
} from "lucide-react";

type AttemptResult = {
  questionId: string;
  userAnswer: string;
  isCorrect: boolean;
  marksAwarded: number;
  maxMarks: number;
};

export default function TopicPracticeComplete() {
  const location = useLocation();
  const navigate = useNavigate();
  const { id: topicId } = useParams();
  const results = (location.state?.results || []) as AttemptResult[];

  if (results.length === 0) {
    navigate("/topics");
    return null;
  }

  const totalQuestions = results.length;
  const correctAnswers = results.filter(r => r.isCorrect).length;
  const totalMarksEarned = results.reduce((sum, r) => sum + r.marksAwarded, 0);
  const totalMarksPossible = results.reduce((sum, r) => sum + r.maxMarks, 0);
  const accuracy = (correctAnswers / totalQuestions) * 100;
  const scorePercentage = (totalMarksEarned / totalMarksPossible) * 100;

  const getPerformanceBadge = () => {
    if (accuracy >= 80) return { label: "Excellent!", color: "bg-green-600" };
    if (accuracy >= 60) return { label: "Good Job!", color: "bg-yellow-600" };
    return { label: "Keep Practicing", color: "bg-red-600" };
  };

  const performanceBadge = getPerformanceBadge();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Success Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
            <CheckCircle2 className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-4xl font-bold text-foreground mb-2">
            Practice Complete!
          </h1>
          <p className="text-muted-foreground">
            Great job! Here's how you performed
          </p>
        </div>

        {/* Performance Summary */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Performance Summary
              </CardTitle>
              <Badge className={performanceBadge.color}>
                {performanceBadge.label}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Accuracy */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Accuracy</span>
                <span className="text-2xl font-bold">{accuracy.toFixed(1)}%</span>
              </div>
              <Progress value={accuracy} className="h-3" />
              <p className="text-xs text-muted-foreground mt-1">
                {correctAnswers} out of {totalQuestions} questions correct
              </p>
            </div>

            {/* Score */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium">Score</span>
                <span className="text-2xl font-bold">
                  {totalMarksEarned.toFixed(1)}/{totalMarksPossible}
                </span>
              </div>
              <Progress value={scorePercentage} className="h-3" />
              <p className="text-xs text-muted-foreground mt-1">
                {scorePercentage.toFixed(1)}% of total marks
              </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span className="text-2xl font-bold text-green-600">
                    {correctAnswers}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Correct</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <XCircle className="h-4 w-4 text-red-600" />
                  <span className="text-2xl font-bold text-red-600">
                    {totalQuestions - correctAnswers}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Incorrect</p>
              </div>
              <div className="text-center">
                <div className="flex items-center justify-center gap-2 mb-1">
                  <BookOpen className="h-4 w-4 text-primary" />
                  <span className="text-2xl font-bold text-primary">
                    {totalQuestions}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Performance Feedback */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>What's Next?</CardTitle>
            <CardDescription>
              {accuracy >= 80 
                ? "Excellent work! You've mastered this topic. Consider reviewing other topics or trying more challenging questions."
                : accuracy >= 60
                ? "Good progress! Review the questions you got wrong and try practicing this topic again to improve your score."
                : "Keep practicing! Review the explanations carefully and try this topic again. Focus on understanding the concepts."
              }
            </CardDescription>
          </CardHeader>
        </Card>

        {/* Action Buttons */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button
            onClick={() => navigate(`/topic-practice/${topicId}`)}
            variant="default"
            className="h-auto py-4"
          >
            <RotateCcw className="h-5 w-5 mr-2" />
            <div className="text-left">
              <div className="font-semibold">Practice Again</div>
              <div className="text-xs opacity-90">Improve your score</div>
            </div>
          </Button>

          <Button
            onClick={() => navigate("/topics")}
            variant="outline"
            className="h-auto py-4"
          >
            <BookOpen className="h-5 w-5 mr-2" />
            <div className="text-left">
              <div className="font-semibold">Browse Topics</div>
              <div className="text-xs opacity-90">Try another topic</div>
            </div>
          </Button>

          <Button
            onClick={() => navigate("/topic-analytics")}
            variant="outline"
            className="h-auto py-4"
          >
            <BarChart3 className="h-5 w-5 mr-2" />
            <div className="text-left">
              <div className="font-semibold">View Analytics</div>
              <div className="text-xs opacity-90">Track your progress</div>
            </div>
          </Button>

          <Button
            onClick={() => navigate("/dashboard")}
            variant="outline"
            className="h-auto py-4"
          >
            <Home className="h-5 w-5 mr-2" />
            <div className="text-left">
              <div className="font-semibold">Dashboard</div>
              <div className="text-xs opacity-90">Go to home</div>
            </div>
          </Button>
        </div>
      </main>
    </div>
  );
}
