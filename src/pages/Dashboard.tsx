import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BookOpen, TrendingUp, Target, Calendar } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Dashboard() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<any>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [attempts, setAttempts] = useState<any[]>([]);
  const [examDate, setExamDate] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

    await Promise.all([
      loadProfile(session.user.id),
      loadAttempts(session.user.id),
    ]);
    
    setLoading(false);
  };

  const loadProfile = async (userId: string) => {
    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", userId)
      .single();

    if (profileData) {
      setProfile(profileData);

      const { data: subjectsData } = await supabase
        .from("profile_subjects")
        .select("subject_id, subjects(*)")
        .eq("profile_id", userId);

      if (subjectsData) {
        setSubjects(subjectsData.map((s: any) => s.subjects));
      }

      // Fetch exam date based on grade level
      const { data: examDateData } = await supabase
        .from("exam_dates")
        .select("exam_start_date")
        .eq("grade_level", profileData.grade_level)
        .single();

      if (examDateData) {
        setExamDate(examDateData.exam_start_date);
      }
    }
  };

  const loadAttempts = async (userId: string) => {
    const { data } = await supabase
      .from("user_attempts")
      .select(`
        *,
        questions (
          id,
          past_paper_id,
          question_text,
          question_type,
          marks,
          correct_answer,
          sample_answer,
          image_url,
          past_papers (
            id,
            name,
            subjects (name),
            total_score,
            year,
            grade_level
          )
        )
      `)
      .eq("user_id", userId)
      .order("attempted_at", { ascending: false });

    if (data) {
      setAttempts(data);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  const totalAttempts = attempts.length;
  const correctAttempts = attempts.filter(a => a.is_correct).length;
  const accuracy = totalAttempts > 0 ? ((correctAttempts / totalAttempts) * 100).toFixed(1) : "0";
  const gradeLabel = profile?.grade_level === "Seven" ? "Grade 7" : 
                     profile?.grade_level === "Nine" ? "Grade 9" : "Grade 12";

  // Calculate days to final exam
  const daysToExam = examDate 
    ? Math.ceil((new Date(examDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const handleViewExamResults = (exam: any) => {
    // Create a unique list of questions from all attempts
    const uniqueQuestions = Array.from(
      new Map(
        exam.attempts.map((a: any) => [a.question_id, {
          id: a.question_id,
          question_text: a.questions?.question_text || "",
          question_type: a.questions?.question_type || "",
          marks: a.questions?.marks || 0,
          correct_answer: a.questions?.correct_answer || [],
          sample_answer: a.questions?.sample_answer || null,
          image_url: a.questions?.image_url || null,
        }])
      ).values()
    );

    navigate("/exam-complete", {
      state: {
        paperId: exam.paperId,
        paperName: exam.paperName,
        totalMarks: exam.totalMarks,
        earnedMarks: exam.earnedMarks,
        timeTaken: 0, // Historical data doesn't have time tracking
        attempts: exam.attempts,
        questions: uniqueQuestions
      }
    });
  };

  // Group attempts by exam session (questions answered within 10 minutes = same session)
  const examSessions = attempts.reduce((sessions: any[], attempt: any) => {
    const paperId = attempt.questions?.past_paper_id;
    if (!paperId) return sessions;

    const attemptTime = new Date(attempt.attempted_at).getTime();
    const existingSession = sessions.find(s => 
      s.paperId === paperId && 
      Math.abs(attemptTime - s.lastAttemptTime) < 10 * 60 * 1000 // 10 minutes
    );

    if (existingSession) {
      existingSession.attempts.push(attempt);
      existingSession.lastAttemptTime = Math.max(existingSession.lastAttemptTime, attemptTime);
    } else {
      sessions.push({
        paperId,
        paperName: attempt.questions?.past_papers?.name,
        subjectName: attempt.questions?.past_papers?.subjects?.name,
        year: attempt.questions?.past_papers?.year,
        gradeLevel: attempt.questions?.past_papers?.grade_level,
        totalScore: attempt.questions?.past_papers?.total_score,
        attempts: [attempt],
        lastAttemptTime: attemptTime,
        attemptedAt: attempt.attempted_at
      });
    }
    return sessions;
  }, []);

  // Calculate scores for each session
  const recentExams = examSessions.slice(0, 3).map(session => {
    const earnedMarks = session.attempts.reduce((sum: number, a: any) => sum + a.marks_awarded, 0);
    const totalMarks = session.totalScore || session.attempts.length;
    const percentage = totalMarks > 0 ? ((earnedMarks / totalMarks) * 100) : 0;
    const correctCount = session.attempts.filter((a: any) => a.is_correct).length;
    
    // Determine color based on percentage
    let scoreColor = "text-foreground";
    if (percentage < 50) {
      scoreColor = "text-red-500";
    } else if (percentage >= 70) {
      scoreColor = "text-green-500";
    }
    
    return {
      ...session,
      earnedMarks,
      totalMarks,
      percentage: percentage.toFixed(1),
      correctCount,
      totalQuestions: session.attempts.length,
      scoreColor
    };
  });

  return (
    <div className="min-h-screen bg-muted/30">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Welcome to Your Dashboard</h1>
          <p className="text-muted-foreground">
            {gradeLabel} • Track your progress and keep practicing
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <Card className="shadow-soft hover:shadow-hover transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Days to Final Exam</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">
                {daysToExam !== null ? daysToExam : "—"}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {daysToExam !== null 
                  ? daysToExam > 0 
                    ? `${daysToExam} days remaining`
                    : daysToExam === 0 
                      ? "Exam is today!"
                      : "Exam has passed"
                  : "No exam scheduled"}
              </p>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-hover transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Your Subjects</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{subjects.length}</div>
              <p className="text-xs text-muted-foreground mt-1">Subjects enrolled</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-hover transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Attempts</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{totalAttempts}</div>
              <p className="text-xs text-muted-foreground mt-1">Questions attempted</p>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-hover transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Accuracy</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-primary">{accuracy}%</div>
              <p className="text-xs text-muted-foreground mt-1">
                {correctAttempts} correct out of {totalAttempts}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Subjects Section */}
        <Card className="mb-8 shadow-soft">
          <CardHeader>
            <CardTitle>Your Subjects</CardTitle>
            <CardDescription>Subjects you're currently studying</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="p-4 rounded-lg border bg-card hover:shadow-soft transition-shadow"
                >
                  <h3 className="font-medium text-foreground">{subject.name}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    {subject.is_compulsory ? "Compulsory" : "Elective"}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Exam Attempts */}
        {recentExams.length > 0 && (
          <Card className="mb-8 shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Exam Attempts</CardTitle>
                <CardDescription>Your latest exam results</CardDescription>
              </div>
              <Button
                variant="outline"
                onClick={() => navigate("/exam-history")}
              >
                View More
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentExams.map((exam, index) => (
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
                        <p className="text-xs text-muted-foreground mt-1">
                          {exam.correctCount}/{exam.totalQuestions} correct
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Actions */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Start practicing or explore past papers</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-4">
            <Button
              className="bg-primary hover:bg-primary-dark"
              onClick={() => navigate("/papers")}
            >
              Browse Past Papers
            </Button>
            <Button variant="outline" onClick={() => navigate("/papers?filter=recent")}>
              View Recent Papers
            </Button>
            <Button variant="outline" onClick={() => navigate("/settings")}>
              Settings
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
