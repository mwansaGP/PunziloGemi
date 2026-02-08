import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAdmin } from "@/hooks/useAdmin";
import { Users, FileText, HelpCircle, TrendingUp, BookOpen, ArrowRight, Calendar, Edit, FolderTree, Globe, NotebookText } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function AdminDashboard() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [topSubjects, setTopSubjects] = useState<any[]>([]);
  const [topQuestions, setTopQuestions] = useState<any[]>([]);
  const [examDates, setExamDates] = useState<any[]>([]);
  const [editingDate, setEditingDate] = useState<any>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadDashboardData();
    }
  }, [isAdmin]);

  const loadDashboardData = async () => {
    setLoading(true);

    // Get basic stats
    const { data: statsData } = await supabase.rpc("get_admin_stats");
    if (statsData && statsData.length > 0) {
      setStats(statsData[0]);
    }

    // Get exam dates
    const { data: examDatesData } = await supabase
      .from("exam_dates")
      .select("*")
      .order("grade_level");
    if (examDatesData) {
      setExamDates(examDatesData);
    }

    // Get most attempted subjects
    const { data: subjectsData } = await supabase
      .from("user_attempts")
      .select("question_id, questions(subject_id, subjects(name))")
      .limit(1000);

    if (subjectsData) {
      const subjectCounts: Record<string, { name: string; count: number }> = {};
      subjectsData.forEach((attempt: any) => {
        const subjectName = attempt.questions?.subjects?.name;
        if (subjectName) {
          if (!subjectCounts[subjectName]) {
            subjectCounts[subjectName] = { name: subjectName, count: 0 };
          }
          subjectCounts[subjectName].count++;
        }
      });

      const sorted = Object.values(subjectCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      setTopSubjects(sorted);
    }

    // Get questions with most correct answers
    const { data: questionsData } = await supabase
      .from("user_attempts")
      .select("question_id, is_correct, questions(question_text, question_number)")
      .eq("is_correct", true);

    if (questionsData) {
      const questionCounts: Record<string, { text: string; number: number; count: number }> = {};
      questionsData.forEach((attempt: any) => {
        const qId = attempt.question_id;
        if (qId && attempt.questions) {
          if (!questionCounts[qId]) {
            questionCounts[qId] = {
              text: attempt.questions.question_text?.substring(0, 60) + "...",
              number: attempt.questions.question_number,
              count: 0,
            };
          }
          questionCounts[qId].count++;
        }
      });

      const sorted = Object.values(questionCounts)
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);
      setTopQuestions(sorted);
    }

    setLoading(false);
  };

  const handleUpdateExamDate = async (gradeLevel: any, newDate: string) => {
    const { error } = await supabase
      .from("exam_dates")
      .update({ exam_start_date: newDate })
      .eq("grade_level", gradeLevel);

    if (error) {
      toast.error("Failed to update exam date");
      console.error(error);
    } else {
      toast.success("Exam date updated successfully");
      setDialogOpen(false);
      setEditingDate(null);
      loadDashboardData();
    }
  };

  const formatGradeLevel = (grade: string) => {
    if (grade === "Seven") return "Grade 7";
    if (grade === "Nine") return "Grade 9";
    if (grade === "Twelve") return "Grade 12";
    if (grade === "GCE") return "GCE";
    return grade;
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Admin Dashboard</h1>
          <p className="text-muted-foreground">Manage your platform and view analytics</p>
        </div>

        {/* Stats Overview */}
        <div className="grid gap-6 md:grid-cols-3 mb-8">
          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Users</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_users || 0}</div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Past Papers</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_papers || 0}</div>
            </CardContent>
          </Card>

          <Card className="shadow-soft">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">Total Questions</CardTitle>
              <HelpCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats?.total_questions || 0}</div>
            </CardContent>
          </Card>
        </div>

        {/* Exam Dates */}
        <Card className="mb-8 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Final Exam Dates
            </CardTitle>
            <CardDescription>Set the start dates for final exams by grade level</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {examDates.map((examDate) => (
                <div key={examDate.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div>
                    <p className="font-medium">{formatGradeLevel(examDate.grade_level)}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(examDate.exam_start_date).toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      })}
                    </p>
                  </div>
                  <Dialog open={dialogOpen && editingDate?.id === examDate.id} onOpenChange={(open) => {
                    setDialogOpen(open);
                    if (!open) setEditingDate(null);
                  }}>
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingDate(examDate)}
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Update Exam Date for {formatGradeLevel(examDate.grade_level)}</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4 py-4">
                        <div className="space-y-2">
                          <Label htmlFor="exam-date">Exam Start Date</Label>
                          <Input
                            id="exam-date"
                            type="date"
                            defaultValue={examDate.exam_start_date}
                            onChange={(e) => {
                              setEditingDate({ ...editingDate, exam_start_date: e.target.value });
                            }}
                          />
                        </div>
                        <Button 
                          className="w-full"
                          onClick={() => handleUpdateExamDate(examDate.grade_level, editingDate?.exam_start_date || examDate.exam_start_date)}
                        >
                          Update Date
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Top Subjects */}
        <Card className="mb-8 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Most Attempted Subjects
            </CardTitle>
          </CardHeader>
          <CardContent>
            {topSubjects.length === 0 ? (
              <p className="text-muted-foreground">No attempt data yet</p>
            ) : (
              <div className="space-y-3">
                {topSubjects.map((subject, idx) => (
                  <div key={idx} className="flex items-center justify-between">
                    <span className="font-medium">{subject.name}</span>
                    <span className="text-muted-foreground">{subject.count} attempts</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Questions */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Top 10 Questions with Most Correct Answers</CardTitle>
          </CardHeader>
          <CardContent>
            {topQuestions.length === 0 ? (
              <p className="text-muted-foreground">No correct answers yet</p>
            ) : (
              <div className="space-y-3">
                {topQuestions.map((q, idx) => (
                  <div key={idx} className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <span className="text-sm font-medium">Q{q.number}: </span>
                      <span className="text-sm text-muted-foreground">{q.text}</span>
                    </div>
                    <span className="text-sm font-medium text-primary whitespace-nowrap">
                      {q.count} correct
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mt-8">
          <Card className="shadow-soft hover:shadow-hover transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                User Management
              </CardTitle>
              <CardDescription>View and manage all registered users</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/admin/users">
                  View Users <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-hover transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                Subjects
              </CardTitle>
              <CardDescription>Add, edit, or delete subjects</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/admin/subjects">
                  Manage Subjects <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-hover transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderTree className="h-5 w-5 text-primary" />
                Topics
              </CardTitle>
              <CardDescription>Add, edit, or delete topics for subjects</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/admin/topics">
                  Manage Topics <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-hover transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                Past Papers
              </CardTitle>
              <CardDescription>Manage past papers and questions</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/admin/papers">
                  Manage Papers <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-hover transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5 text-primary" />
                API Management
              </CardTitle>
              <CardDescription>Configure and monitor external APIs</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/admin/api-management">
                  Manage APIs <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-soft hover:shadow-hover transition-all">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <NotebookText className="h-5 w-5 text-primary" />
                Study Notes
              </CardTitle>
              <CardDescription>Add and manage study notes for topics</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="w-full">
                <Link to="/admin/study-notes">
                  Manage Notes <ArrowRight className="h-4 w-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>

        </div>
      </main>
    </div>
  );
}
