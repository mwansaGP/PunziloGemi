import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { questionFormSchema } from "@/lib/validation";

export default function AdminQuestions() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [questions, setQuestions] = useState<any[]>([]);
  const [papers, setPapers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [options, setOptions] = useState<string[]>([""]);
  const [correctAnswers, setCorrectAnswers] = useState<string[]>([""]);
  const [uploading, setUploading] = useState(false);
  const [formData, setFormData] = useState({
    past_paper_id: "",
    subject_id: "",
    topic_id: "",
    question_text: "",
    question_type: "MCQ" as "MCQ" | "ShortAnswer" | "Essay",
    sample_answer: "",
    difficulty: "Medium" as "Easy" | "Medium" | "Hard",
    question_number: 1,
    marks: 1,
    image_url: "",
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
    const [questionsRes, papersRes, subjectsRes, topicsRes] = await Promise.all([
      supabase
        .from("questions")
        .select("*, past_papers(name), subjects(name), topics(name)")
        .order("question_number"),
      supabase.from("past_papers").select("*, subjects(name)").order("year", { ascending: false }),
      supabase.from("subjects").select("*").order("name"),
      supabase.from("topics").select("*").order("name"),
    ]);

    if (questionsRes.data) setQuestions(questionsRes.data);
    if (papersRes.data) setPapers(papersRes.data);
    if (subjectsRes.data) setSubjects(subjectsRes.data);
    if (topicsRes.data) setTopics(topicsRes.data);
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const dataToSubmit = {
      ...formData,
      topic_id: formData.topic_id || undefined,
      options: formData.question_type === "MCQ" ? options.filter(o => o.trim()) : undefined,
      correct_answer: correctAnswers.filter(a => a.trim()),
      sample_answer: formData.sample_answer || undefined,
      image_url: formData.image_url || undefined,
      marks: Number(formData.marks),
      question_number: Number(formData.question_number),
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

    if (editingQuestion) {
      const { error } = await supabase
        .from("questions")
        .update({
          ...result.data,
          topic_id: result.data.topic_id || null,
          options: result.data.options || null,
          sample_answer: result.data.sample_answer || null,
          image_url: result.data.image_url || null,
        })
        .eq("id", editingQuestion.id);

      if (error) {
        toast({ title: "Error", description: "Failed to update question", variant: "destructive" });
        return;
      }

      toast({ title: "Success", description: "Question updated successfully" });
    } else {
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
        toast({ title: "Error", description: "Failed to create question", variant: "destructive" });
        return;
      }

      toast({ title: "Success", description: "Question created successfully" });
    }

    setDialogOpen(false);
    setEditingQuestion(null);
    resetForm();
    loadData();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this question?")) return;

    const { error } = await supabase.from("questions").delete().eq("id", id);

    if (error) {
      toast({ title: "Error", description: "Failed to delete question", variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Question deleted successfully" });
    loadData();
  };

  const resetForm = () => {
    setFormData({
      past_paper_id: "",
      subject_id: "",
      topic_id: "",
      question_text: "",
      question_type: "MCQ",
      sample_answer: "",
      difficulty: "Medium",
      question_number: 1,
      marks: 1,
      image_url: "",
    });
    setOptions([""]);
    setCorrectAnswers([""]);
  };

  const openDialog = (question?: any) => {
    if (question) {
      setEditingQuestion(question);
      setFormData({
        past_paper_id: question.past_paper_id,
        subject_id: question.subject_id,
        topic_id: question.topic_id || "",
        question_text: question.question_text,
        question_type: question.question_type,
        sample_answer: question.sample_answer || "",
        difficulty: question.difficulty || "Medium",
        question_number: question.question_number,
        marks: question.marks,
        image_url: question.image_url || "",
      });
      setOptions(question.options || [""]);
      setCorrectAnswers(question.correct_answer || [""]);
    } else {
      setEditingQuestion(null);
      resetForm();
    }
    setDialogOpen(true);
  };

  const addOption = () => setOptions([...options, ""]);
  const removeOption = (index: number) => setOptions(options.filter((_, i) => i !== index));
  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setOptions(newOptions);
  };

  const addCorrectAnswer = () => setCorrectAnswers([...correctAnswers, ""]);
  const removeCorrectAnswer = (index: number) => setCorrectAnswers(correctAnswers.filter((_, i) => i !== index));
  const updateCorrectAnswer = (index: number, value: string) => {
    const newAnswers = [...correctAnswers];
    newAnswers[index] = value;
    setCorrectAnswers(newAnswers);
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast({ title: "Error", description: "Please upload an image file", variant: "destructive" });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({ title: "Error", description: "Image must be less than 5MB", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from("question-images")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("question-images")
        .getPublicUrl(filePath);

      setFormData({ ...formData, image_url: publicUrl });
      toast({ title: "Success", description: "Image uploaded successfully" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
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
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Manage Questions</h1>
            <p className="text-muted-foreground">Add, edit, or delete questions for past papers</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()} className="bg-primary hover:bg-primary-dark">
                <Plus className="h-4 w-4 mr-2" />
                Add Question
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingQuestion ? "Edit Question" : "Add New Question"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="past_paper">Past Paper *</Label>
                    <Select
                      value={formData.past_paper_id}
                      onValueChange={(value) => setFormData({ ...formData, past_paper_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select paper" />
                      </SelectTrigger>
                      <SelectContent>
                        {papers.map((paper) => (
                          <SelectItem key={paper.id} value={paper.id}>
                            {paper.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="subject">Subject *</Label>
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
                            {subject.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="topic">Topic (Optional)</Label>
                    <Select
                      value={formData.topic_id}
                      onValueChange={(value) => setFormData({ ...formData, topic_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select topic" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No Topic</SelectItem>
                        {topics.map((topic) => (
                          <SelectItem key={topic.id} value={topic.id}>
                            {topic.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="question_type">Question Type *</Label>
                    <Select
                      value={formData.question_type}
                      onValueChange={(value: any) => setFormData({ ...formData, question_type: value })}
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
                </div>

                <div>
                  <Label htmlFor="question_text">Question Text *</Label>
                  <Textarea
                    id="question_text"
                    placeholder="Enter the question"
                    value={formData.question_text}
                    onChange={(e) => setFormData({ ...formData, question_text: e.target.value })}
                    required
                    rows={4}
                  />
                </div>

                {formData.question_type === "MCQ" && (
                  <div>
                    <Label>Options</Label>
                    <div className="space-y-2">
                      {options.map((option, index) => (
                        <div key={index} className="flex gap-2">
                          <Input
                            placeholder={`Option ${index + 1}`}
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="icon"
                            onClick={() => removeOption(index)}
                            disabled={options.length === 1}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      <Button type="button" variant="outline" size="sm" onClick={addOption}>
                        <Plus className="h-4 w-4 mr-2" />
                        Add Option
                      </Button>
                    </div>
                  </div>
                )}

                <div>
                  <Label>Correct Answer(s) *</Label>
                  <div className="space-y-2">
                    {correctAnswers.map((answer, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          placeholder={`Answer ${index + 1}`}
                          value={answer}
                          onChange={(e) => updateCorrectAnswer(index, e.target.value)}
                          required
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          onClick={() => removeCorrectAnswer(index)}
                          disabled={correctAnswers.length === 1}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button type="button" variant="outline" size="sm" onClick={addCorrectAnswer}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Answer
                    </Button>
                  </div>
                </div>

                <div>
                  <Label htmlFor="sample_answer">Sample Answer (Optional)</Label>
                  <Textarea
                    id="sample_answer"
                    placeholder="Enter a sample answer"
                    value={formData.sample_answer}
                    onChange={(e) => setFormData({ ...formData, sample_answer: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="difficulty">Difficulty</Label>
                    <Select
                      value={formData.difficulty}
                      onValueChange={(value: any) => setFormData({ ...formData, difficulty: value })}
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

                  <div>
                    <Label htmlFor="question_number">Question Number *</Label>
                    <Input
                      id="question_number"
                      type="number"
                      min="1"
                      value={formData.question_number}
                      onChange={(e) => setFormData({ ...formData, question_number: Number(e.target.value) })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="marks">Marks *</Label>
                    <Input
                      id="marks"
                      type="number"
                      step="0.5"
                      min="0"
                      value={formData.marks}
                      onChange={(e) => setFormData({ ...formData, marks: Number(e.target.value) })}
                      required
                    />
                  </div>
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
                  {formData.image_url && (
                    <div className="mt-2">
                      <img 
                        src={formData.image_url} 
                        alt="Question preview" 
                        className="max-w-xs rounded border"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                    </div>
                  )}
                </div>

                <Button type="submit" className="w-full">
                  {editingQuestion ? "Update" : "Create"} Question
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>All Questions ({questions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {questions.map((question) => (
                <div
                  key={question.id}
                  className="flex items-start justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div className="flex-1">
                    <h3 className="font-medium">
                      Q{question.question_number}. {question.question_text.substring(0, 100)}
                      {question.question_text.length > 100 ? "..." : ""}
                    </h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      {question.past_papers?.name} • {question.subjects?.name} • {question.question_type} •{" "}
                      {question.difficulty} • {question.marks} marks
                      {question.topics?.name && ` • ${question.topics.name}`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => openDialog(question)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(question.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
