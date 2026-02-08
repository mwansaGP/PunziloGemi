import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, Search, FileText, Upload } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { paperFormSchema, questionFormSchema } from "@/lib/validation";

export default function AdminPapers() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [papers, setPapers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPaper, setEditingPaper] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [gradeFilter, setGradeFilter] = useState("all");
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [selectedPaperId, setSelectedPaperId] = useState<string>("");
  const [topics, setTopics] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [questionForm, setQuestionForm] = useState({
    question_text: "",
    question_type: "MCQ" as "MCQ" | "ShortAnswer" | "Essay",
    question_number: 1,
    marks: 1,
    difficulty: "Medium" as "Easy" | "Medium" | "Hard",
    topic_id: "",
    options: ["", "", "", ""],
    correct_answer: [""],
    sample_answer: "",
    image_url: "",
  });
  const [formData, setFormData] = useState({
    name: "",
    year: new Date().getFullYear().toString(),
    subject_id: "",
    grade_level: "Seven" as "Seven" | "Nine" | "Twelve" | "GCE",
    paper_type: "none" as "none" | "Paper1" | "Paper2" | "Paper3",
    duration: "",
    total_score: 0,
    is_writable: true,
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadData();
    }
  }, [isAdmin]);

  const loadData = async () => {
    setLoading(true);
    const [papersRes, subjectsRes, topicsRes] = await Promise.all([
      supabase.from("past_papers").select("*, subjects(name, grade_level)").order("year", { ascending: false }),
      supabase.from("subjects").select("*").order("name"),
      supabase.from("topics").select("*").order("name"),
    ]);

    if (papersRes.data) setPapers(papersRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (topicsRes.data) setTopics(topicsRes.data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = paperFormSchema.safeParse({
      ...formData,
      total_score: Number(formData.total_score),
    });

    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const errorMessages = Object.entries(errors).map(([field, msgs]) => `${field}: ${msgs?.join(", ")}`);
      toast({ 
        title: "Validation Error", 
        description: errorMessages.join("; "), 
        variant: "destructive" 
      });
      return;
    }

    // Use custom name if provided, otherwise generate from subject, year, and paper type
    const subject = subjects.find(s => s.id === result.data.subject_id);
    const generatedName = `${subject?.name} ${result.data.year}${result.data.paper_type !== "none" ? ' ' + result.data.paper_type : ''}`;
    const paperName = formData.name.trim() || generatedName;

    const dataToSubmit = {
      year: result.data.year,
      subject_id: result.data.subject_id,
      grade_level: result.data.grade_level,
      paper_type: result.data.paper_type === "none" ? null : result.data.paper_type,
      duration: result.data.duration,
      total_score: result.data.total_score,
      is_writable: result.data.is_writable,
      name: paperName,
    };

    if (editingPaper) {
      const { error } = await supabase
        .from("past_papers")
        .update(dataToSubmit)
        .eq("id", editingPaper.id);

      if (error) {
        toast({ title: "Error", description: "Failed to update paper", variant: "destructive" });
        return;
      }

      toast({ title: "Success", description: "Paper updated successfully" });
    } else {
      const { error } = await supabase.from("past_papers").insert([dataToSubmit]);

      if (error) {
        toast({ title: "Error", description: "Failed to create paper", variant: "destructive" });
        return;
      }

      toast({ title: "Success", description: "Paper created successfully" });
    }

    setDialogOpen(false);
    setEditingPaper(null);
    resetForm();
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure? This will also delete all questions in this paper.")) return;

    const { error } = await supabase.from("past_papers").delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete paper", variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Paper deleted successfully" });
    loadData();
  };

  const resetForm = () => {
    setFormData({
      name: "",
      year: new Date().getFullYear().toString(),
      subject_id: "",
      grade_level: "Seven",
      paper_type: "none",
      duration: "",
      total_score: 0,
      is_writable: true,
    });
  };

  const openDialog = (paper?: any) => {
    if (paper) {
      setEditingPaper(paper);
      setFormData({
        name: paper.name || "",
        year: paper.year,
        subject_id: paper.subject_id,
        grade_level: paper.grade_level,
        paper_type: paper.paper_type || "none",
        duration: paper.duration,
        total_score: paper.total_score,
        is_writable: paper.is_writable ?? true,
      });
    } else {
      setEditingPaper(null);
      resetForm();
    }
    setDialogOpen(true);
  };

  const openQuestionDialog = (paperId: string) => {
    setSelectedPaperId(paperId);
    setQuestionDialogOpen(true);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be less than 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    const fileExt = file.name.split(".").pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage.from("question-images").upload(filePath, file);

    if (uploadError) {
      toast({ title: "Error", description: "Failed to upload image", variant: "destructive" });
      setUploading(false);
      return;
    }

    const { data } = supabase.storage.from("question-images").getPublicUrl(filePath);
    setQuestionForm({ ...questionForm, image_url: data.publicUrl });
    setUploading(false);
    toast({ title: "Success", description: "Image uploaded successfully" });
  };

  const resetQuestionForm = () => {
    setQuestionForm({
      question_text: "",
      question_type: "MCQ",
      question_number: 1,
      marks: 1,
      difficulty: "Medium",
      topic_id: "",
      options: ["", "", "", ""],
      correct_answer: [""],
      sample_answer: "",
      image_url: "",
    });
  };

  const handleQuestionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const paper = papers.find((p) => p.id === selectedPaperId);
    if (!paper) return;

    const dataToSubmit = {
      past_paper_id: selectedPaperId,
      subject_id: paper.subject_id,
      topic_id: questionForm.topic_id || undefined,
      question_text: questionForm.question_text,
      question_type: questionForm.question_type,
      question_number: questionForm.question_number,
      marks: Number(questionForm.marks),
      difficulty: questionForm.difficulty,
      options: questionForm.question_type === "MCQ" ? questionForm.options.filter(o => o.trim()) : undefined,
      correct_answer: questionForm.correct_answer.filter(a => a.trim()),
      sample_answer: questionForm.sample_answer || undefined,
      image_url: questionForm.image_url || undefined,
    };

    const result = questionFormSchema.safeParse(dataToSubmit);
    if (!result.success) {
      const errors = result.error.flatten().fieldErrors;
      const errorMessages = Object.entries(errors).map(([field, msgs]) => `${field}: ${msgs?.join(", ")}`);
      toast({ 
        title: "Validation Error", 
        description: errorMessages.join("; "), 
        variant: "destructive" 
      });
      return;
    }

    const { error } = await supabase.from("questions").insert([{
      past_paper_id: result.data.past_paper_id,
      subject_id: result.data.subject_id,
      question_text: result.data.question_text,
      question_type: result.data.question_type,
      question_number: result.data.question_number,
      marks: result.data.marks,
      correct_answer: result.data.correct_answer,
      difficulty: result.data.difficulty,
      topic_id: result.data.topic_id || null,
      options: result.data.options || null,
      sample_answer: result.data.sample_answer || null,
      image_url: result.data.image_url || null,
    }]);

    if (error) {
      toast({ title: "Error", description: "Failed to add question", variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Question added successfully" });
    setQuestionDialogOpen(false);
    resetQuestionForm();
  };

  const filteredPapers = papers.filter((paper) => {
    const matchesSearch = paper.year.includes(searchTerm);
    const matchesGrade = gradeFilter === "all" || paper.grade_level === gradeFilter;
    return matchesSearch && matchesGrade;
  });

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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Manage Past Papers</h1>
            <p className="text-muted-foreground">Add, edit, or delete past papers</p>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => navigate("/admin/bulk-import")}
            >
              <Upload className="h-4 w-4 mr-2" />
              Bulk Import
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openDialog()} className="bg-primary hover:bg-primary-dark">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Paper
                </Button>
              </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingPaper ? "Edit Paper" : "Add New Paper"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Paper Name (optional - auto-generated if empty)</Label>
                  <Input
                    id="name"
                    placeholder="e.g., Mathematics 2024 Paper 1"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="year">Year</Label>
                    <Select
                      value={formData.year}
                      onValueChange={(value) => setFormData({ ...formData, year: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 25 }, (_, i) => 2025 - i).map((year) => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      placeholder="e.g., 120"
                      value={formData.duration}
                      onChange={(e) => setFormData({ ...formData, duration: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="grade">Grade Level</Label>
                  <Select
                    value={formData.grade_level}
                    onValueChange={(value: any) => setFormData({ ...formData, grade_level: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Seven">Grade 7</SelectItem>
                      <SelectItem value="Nine">Grade 9</SelectItem>
                      <SelectItem value="Twelve">Grade 12</SelectItem>
                      <SelectItem value="GCE">GCE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="subject">Subject</Label>
                  <Select
                    value={formData.subject_id}
                    onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name} ({subject.grade_level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="type">Paper Type</Label>
                    <Select
                      value={formData.paper_type}
                      onValueChange={(value: any) => setFormData({ ...formData, paper_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select paper type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        <SelectItem value="Paper1">Paper 1</SelectItem>
                        <SelectItem value="Paper2">Paper 2</SelectItem>
                        <SelectItem value="Paper3">Paper 3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="score">Total Score</Label>
                    <Input
                      id="score"
                      type="number"
                      value={formData.total_score}
                      onChange={(e) => setFormData({ ...formData, total_score: Number(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="is_writable"
                    checked={formData.is_writable}
                    onCheckedChange={(checked) => setFormData({ ...formData, is_writable: checked as boolean })}
                  />
                  <Label htmlFor="is_writable" className="text-sm font-normal cursor-pointer">
                    Can be attempted as written exam (disable for papers involving physical activities)
                  </Label>
                </div>
                <Button type="submit" className="w-full">
                  {editingPaper ? "Update" : "Create"} Paper
                </Button>
              </form>
            </DialogContent>
          </Dialog>
          </div>
        </div>

        {/* Search and Filter */}
        <Card className="mb-6 shadow-soft">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by year..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={gradeFilter} onValueChange={setGradeFilter}>
                <SelectTrigger className="w-full md:w-48">
                  <SelectValue placeholder="Filter by grade" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Grades</SelectItem>
                  <SelectItem value="Seven">Grade 7</SelectItem>
                  <SelectItem value="Nine">Grade 9</SelectItem>
                  <SelectItem value="Twelve">Grade 12</SelectItem>
                  <SelectItem value="GCE">GCE</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>All Papers ({filteredPapers.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {filteredPapers.map((paper) => (
                <div
                  key={paper.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <Link to={`/papers/${paper.id}`} className="flex-1 cursor-pointer">
                    <h3 className="font-medium hover:text-primary transition-colors">{paper.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {paper.subjects?.name} • {paper.year} • {paper.paper_type} • {paper.duration} •{" "}
                      {paper.total_score} marks
                    </p>
                  </Link>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openQuestionDialog(paper.id)}>
                      <Plus className="h-4 w-4" />
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => openDialog(paper)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(paper.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Add Question Dialog */}
        <Dialog open={questionDialogOpen} onOpenChange={setQuestionDialogOpen}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add Question</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleQuestionSubmit} className="space-y-4">
              <div>
                <Label htmlFor="question_text">Question Text</Label>
                <Textarea
                  id="question_text"
                  value={questionForm.question_text}
                  onChange={(e) => setQuestionForm({ ...questionForm, question_text: e.target.value })}
                  required
                  rows={4}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="question_type">Question Type</Label>
                  <Select
                    value={questionForm.question_type}
                    onValueChange={(value: any) => setQuestionForm({ ...questionForm, question_type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="MCQ">Multiple Choice</SelectItem>
                      <SelectItem value="ShortAnswer">Short Answer</SelectItem>
                      <SelectItem value="Essay">Essay</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="difficulty">Difficulty</Label>
                  <Select
                    value={questionForm.difficulty}
                    onValueChange={(value: any) => setQuestionForm({ ...questionForm, difficulty: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Easy">Easy</SelectItem>
                      <SelectItem value="Medium">Medium</SelectItem>
                      <SelectItem value="Hard">Hard</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="question_number">Question Number</Label>
                  <Input
                    id="question_number"
                    type="number"
                    min="1"
                    value={questionForm.question_number}
                    onChange={(e) => setQuestionForm({ ...questionForm, question_number: Number(e.target.value) })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="marks">Marks</Label>
                  <Input
                    id="marks"
                    type="number"
                    min="1"
                    value={questionForm.marks}
                    onChange={(e) => setQuestionForm({ ...questionForm, marks: Number(e.target.value) })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="topic_id">Topic (Optional)</Label>
                  <Select
                    value={questionForm.topic_id}
                    onValueChange={(value) => setQuestionForm({ ...questionForm, topic_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>
                          {topic.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {questionForm.question_type === "MCQ" && (
                <div className="space-y-2">
                  <Label>Options</Label>
                  {questionForm.options.map((option, idx) => (
                    <Input
                      key={idx}
                      placeholder={`Option ${idx + 1}`}
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...questionForm.options];
                        newOptions[idx] = e.target.value;
                        setQuestionForm({ ...questionForm, options: newOptions });
                      }}
                    />
                  ))}
                </div>
              )}

              <div>
                <Label htmlFor="correct_answer">Correct Answer(s)</Label>
                <Textarea
                  id="correct_answer"
                  placeholder="Enter correct answer(s), one per line"
                  value={questionForm.correct_answer.join("\n")}
                  onChange={(e) =>
                    setQuestionForm({ ...questionForm, correct_answer: e.target.value.split("\n") })
                  }
                  required
                  rows={2}
                />
              </div>

              <div>
                <Label htmlFor="sample_answer">Sample Answer (Optional)</Label>
                <Textarea
                  id="sample_answer"
                  value={questionForm.sample_answer}
                  onChange={(e) => setQuestionForm({ ...questionForm, sample_answer: e.target.value })}
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label>Question Image (Optional)</Label>
                <Input
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  disabled={uploading}
                  className="cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  {uploading ? "Uploading..." : "Upload an image (max 5MB)"}
                </p>
                {questionForm.image_url && (
                  <div className="mt-2">
                    <img 
                      src={questionForm.image_url} 
                      alt="Question preview" 
                      className="max-w-full h-auto rounded-lg border"
                    />
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full">
                Add Question
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
