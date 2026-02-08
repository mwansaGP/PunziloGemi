import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ExamHistory() {
  const navigate = useNavigate();
  const [attempts, setAttempts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaper, setSelectedPaper] = useState<string>("all");
  const [availablePapers, setAvailablePapers] = useState<any[]>([]);

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

    await loadAttempts(session.user.id);
    setLoading(false);
  };

  const loadAttempts = async (userId: string) => {
    const { data } = await supabase
      .from("exam_sessions")
      .select(`
        *,
        past_papers (
          id,
          name,
          year,
          grade_level,
          total_score,
          subjects (name)
        )
      `)
      .eq("user_id", userId)
      .order("completed_at", { ascending: false, nullsFirst: false });

    if (data) {
      setAttempts(data);
      
      // Extract unique papers for filter
      const papers = Array.from(new Set(
        data
          .map(a => a.past_papers)
          .filter(Boolean)
      )).filter((paper, index, self) => 
        index === self.findIndex(p => p?.id === paper?.id)
      );
      
      setAvailablePapers(papers as any[]);
    }
  };

  const handleViewExamResults = async (session: any) => {
    // Load user attempts for this session
    const { data: attemptsData } = await supabase
      .from("user_attempts")
      .select(`
        *,
        questions (
          id,
          question_text,
          question_type,
          marks,
          correct_answer,
          sample_answer,
          image_url
        )
      `)
      .eq("exam_session_id", session.id);

    if (attemptsData) {
      const questions = attemptsData.map((a: any) => ({
        id: a.question_id,
        question_text: a.questions?.question_text || "",
        question_type: a.questions?.question_type || "",
        marks: a.questions?.marks || 0,
        correct_answer: a.questions?.correct_answer || [],
        sample_answer: a.questions?.sample_answer || null,
        image_url: a.questions?.image_url || null,
      }));

      navigate("/exam-complete", {
        state: {
          paperId: session.past_paper_id,
          paperName: session.past_papers?.name,
          totalMarks: session.total_possible_score,
          earnedMarks: session.total_score,
          timeTaken: session.duration_seconds || 0,
          attempts: attemptsData,
          questions: questions,
          sessionId: session.id,
        }
      });
    }
  };

  // Calculate scores and filter
  const allExams = attempts.map(session => {
    const percentage = session.total_possible_score > 0 
      ? ((session.total_score / session.total_possible_score) * 100) 
      : 0;
    
    // Determine color based on percentage
    let scoreColor = "text-foreground";
    if (percentage < 50) {
      scoreColor = "text-red-500";
    } else if (percentage >= 70) {
      scoreColor = "text-green-500";
    }
    
    return {
      id: session.id,
      paperId: session.past_paper_id,
      paperName: session.past_papers?.name,
      subjectName: session.past_papers?.subjects?.name,
      year: session.past_papers?.year,
      gradeLevel: session.past_papers?.grade_level,
      earnedMarks: session.total_score,
      totalMarks: session.total_possible_score,
      percentage: percentage.toFixed(1),
      durationSeconds: session.duration_seconds,
      attemptedAt: session.completed_at || session.created_at,
      scoreColor,
      ...session
    };
  });

  const filteredExams = selectedPaper === "all" 
    ? allExams 
    : allExams.filter(exam => exam.past_paper_id === selectedPaper);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading exam history...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Button
            variant="ghost"
            className="mb-4"
            onClick={() => navigate("/dashboard")}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
          
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Exam History</h1>
              <p className="text-muted-foreground">
                Review all your past exam attempts
              </p>
            </div>
            
            <div className="w-64">
              <Select value={selectedPaper} onValueChange={setSelectedPaper}>
                <SelectTrigger>
                  <SelectValue placeholder="Filter by paper" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Papers</SelectItem>
                  {availablePapers.map((paper) => (
                    <SelectItem key={paper.id} value={paper.id}>
                      {paper.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>All Exam Attempts</CardTitle>
            <CardDescription>
              {filteredExams.length} {filteredExams.length === 1 ? "exam" : "exams"} found
            </CardDescription>
          </CardHeader>
          <CardContent>
            {filteredExams.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No exam attempts found
              </div>
            ) : (
              <div className="space-y-4">
                {filteredExams.map((exam, index) => (
                  <div
                    key={`${exam.paperId}-${exam.attemptedAt}-${index}`}
                    className="p-4 rounded-lg border bg-card hover:shadow-soft transition-shadow cursor-pointer"
                    onClick={() => handleViewExamResults(exam)}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-semibold text-foreground">{exam.paperName}</h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          {exam.subjectName} • {exam.year} • Grade {exam.gradeLevel === "Seven" ? "7" : exam.gradeLevel === "Nine" ? "9" : "12"}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(exam.attemptedAt).toLocaleDateString()} at {new Date(exam.attemptedAt).toLocaleTimeString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${exam.scoreColor}`}>
                          {exam.percentage}%
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {exam.earnedMarks.toFixed(1)}/{exam.totalMarks} marks
                        </p>
                        {exam.durationSeconds && (
                          <p className="text-xs text-muted-foreground mt-1">
                            Time: {Math.floor(exam.durationSeconds / 60)}m {exam.durationSeconds % 60}s
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
