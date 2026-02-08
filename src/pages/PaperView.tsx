import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Pencil, X } from "lucide-react";
import eczLogo from "@/assets/ecz-logo.png";
import { useAdmin } from "@/hooks/useAdmin";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

export default function PaperView() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const { toast } = useToast();
  const [paper, setPaper] = useState<any>(null);
  const [questions, setQuestions] = useState<any[]>([]);
  const [topicsById, setTopicsById] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<any>(null);
  const [geminiLoadingId, setGeminiLoadingId] = useState<string | null>(null);
  const [geminiAnswers, setGeminiAnswers] = useState<Record<string, string>>({});

  const cleanGeminiText = (text: string): string => {
    if (!text) return text;

    let cleaned = text.replace(/\r\n/g, "\n");

    // Remove trailing whitespace
    cleaned = cleaned.replace(/[ \t]+$/gm, "");

    // Collapse 3+ blank lines into a maximum of 2
    cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

    // Remove leading markdown bullet markers (*, -) at the start of lines
    cleaned = cleaned.replace(/^\s*[\*-]\s+/gm, "");

    // Remove markdown emphasis asterisks like *text* or **text**
    cleaned = cleaned.replace(/\*{1,3}([^*\n]+)\*{1,3}/g, "$1");

    return cleaned.trim();
  };

  useEffect(() => {
    loadPaperData();
  }, [id]);

  const loadPaperData = async () => {
    setLoading(true);

    const [paperRes, questionsRes] = await Promise.all([
      supabase
        .from("past_papers")
        .select("*, subjects(name, grade_level)")
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("questions")
        .select("*")
        .eq("past_paper_id", id)
        .order("question_number"),
    ]);

    const paperData = paperRes.data;
    const questionData = questionsRes.data || [];

    if (paperData) setPaper(paperData);
    if (questionData) setQuestions(questionData);

    // Load topics for the questions so Gemini can reference the topic name
    const topicIds = Array.from(
      new Set(
        (questionData || [])
          .map((q: any) => q.topic_id)
          .filter((id: string | null | undefined): id is string => Boolean(id))
      )
    );

    if (topicIds.length > 0) {
      const { data: topicsData } = await supabase
        .from("topics")
        .select("*")
        .in("id", topicIds);

      if (topicsData) {
        const map: Record<string, any> = {};
        topicsData.forEach((topic: any) => {
          map[topic.id] = topic;
        });
        setTopicsById(map);
      } else {
        setTopicsById({});
      }
    } else {
      setTopicsById({});
    }

    setLoading(false);
  };

  const openEditDialog = (question: any) => {
    setEditingQuestion(question);
    setEditDialogOpen(true);
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
    setEditingQuestion({ ...editingQuestion, image_url: data.publicUrl });
    setUploading(false);
    toast({ title: "Success", description: "Image uploaded successfully" });
  };

  const handleUpdateQuestion = async (e: React.FormEvent) => {
    e.preventDefault();

    const { error } = await supabase
      .from("questions")
      .update({
        question_text: editingQuestion.question_text,
        question_type: editingQuestion.question_type,
        question_number: editingQuestion.question_number,
        options: editingQuestion.options,
        correct_answer: editingQuestion.correct_answer,
        marks: editingQuestion.marks,
        difficulty: editingQuestion.difficulty,
        image_url: editingQuestion.image_url,
        sample_answer: editingQuestion.sample_answer,
      })
      .eq("id", editingQuestion.id);

    if (error) {
      toast({ title: "Error", description: "Failed to update question", variant: "destructive" });
      return;
    }

    toast({ title: "Success", description: "Question updated successfully" });
    setEditDialogOpen(false);
    loadPaperData();
  };

  const handleAskGemini = async (question: any) => {
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

    const subjectName = paper?.subjects?.name || "Unknown";
    const gradeLevel = paper?.grade_level || paper?.subjects?.grade_level || "Unknown";
    const topic = question.topic_id ? topicsById[question.topic_id] : null;
    const topicName = topic?.name || "Unknown";

    let questionDetails = `Question ${question.question_number} (${subjectName}, Grade ${gradeLevel}).`;
    questionDetails += `\nTopic: ${topicName}.`;
    questionDetails += `\n\nQuestion text: ${question.question_text}`;

    if (question.question_type === "MCQ" && question.options) {
      const optionsList = (question.options as string[]).map(
        (option: string, idx: number) => `${String.fromCharCode(65 + idx)}. ${option}`
      );
      const correctLetter = question.correct_answer?.[0];
      const correctIndex =
        typeof correctLetter === "string" ? correctLetter.charCodeAt(0) - 65 : -1;
      const correctText =
        correctIndex >= 0 && correctIndex < question.options.length
          ? question.options[correctIndex]
          : undefined;

      questionDetails += `\n\nOptions:\n${optionsList.join("\n")}`;
      questionDetails += `\n\nCorrect answer letter: ${correctLetter || "Unknown"}.`;
      if (correctText) {
        questionDetails += `\nCorrect answer text: ${correctText}.`;
      }
    } else {
      const sampleAnswer = question.sample_answer || question.correct_answer?.join(", ");
      if (sampleAnswer) {
        questionDetails += `\n\nSample / correct answer: ${sampleAnswer}`;
      }
    }

    const systemPrompt =
      "You are a helpful exam tutor for Zed Past Prep students in Zambia. " +
      "Explain clearly, step by step, why the given correct answer is correct and, for multiple choice questions, why the other options are wrong. " +
      "Use language appropriate for the student's grade level. Start your response by stating the topic in the form 'Topic: <topic name>'.";

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
                  { text: questionDetails },
                  {
                    text:
                      "Explain to the student why this is the correct answer. If relevant, briefly connect this to the underlying concept or topic.",
                  },
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

      // Ensure the topic is visible in the response even if the model ignores the instruction
      const explanation = `Topic: ${topicName}\n\n${reply}`;

      setGeminiAnswers((prev) => ({
        ...prev,
        [question.id]: explanation,
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

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!paper) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Paper not found</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navigation />

      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-6">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        {/* ECZ Paper Header */}
        <Card className="mb-8 shadow-soft bg-muted/10">
          <CardContent className="pt-8 pb-8">
            {/* Logo and Title */}
            <div className="text-center space-y-6 border-b-2 border-foreground/20 pb-8 mb-8">
              <div className="flex justify-center mb-4">
                <img 
                  src={eczLogo} 
                  alt="ECZ Logo" 
                  className="h-24 w-24 object-contain"
                />
              </div>
              
              <div className="space-y-2 sm:space-y-4">
                <h1 className="font-serif text-sm sm:text-xl font-bold tracking-wide">
                  EXAMINATIONS COUNCIL OF ZAMBIA
                </h1>
                
                <h2 className="font-serif text-xs sm:text-lg font-bold tracking-wider">
                  GRADE {paper.grade_level === "Seven" ? "SEVEN" : paper.grade_level === "Nine" ? "NINE" : "TWELVE"} COMPOSITE EXAMINATION {paper.year}
                </h2>
                
                <h3 className="font-serif text-xl sm:text-3xl font-bold mt-2 sm:mt-4">
                  {paper.subjects?.name}
                </h3>
              </div>
              
              <div className="flex justify-between items-center text-xs sm:text-base font-semibold mt-4 sm:mt-6 px-2 sm:px-4">
                <div className="text-left">
                  <span className="font-serif">Subject: {paper.paper_type || 'General'}</span>
                </div>
                <div className="text-right">
                  <span className="font-serif">{paper.duration} min</span>
                </div>
              </div>
              
              <div className="text-xs sm:text-sm font-medium">
                <span className="font-serif">TD/{paper.paper_type || 'GEN'}/{paper.grade_level === "Seven" ? "G7" : paper.grade_level === "Nine" ? "G9" : "G12"}/{paper.year}</span>
              </div>
            </div>

            {/* Instructions */}
            <div className="space-y-2 sm:space-y-4 px-2 sm:px-4">
              <ol className="space-y-2 sm:space-y-3 text-xs sm:text-base">
                <li className="flex gap-2 sm:gap-3">
                  <span className="font-bold min-w-[1rem] sm:min-w-[1.5rem]">1</span>
                  <span>Read these instructions carefully.</span>
                </li>
                <li className="flex gap-2 sm:gap-3">
                  <span className="font-bold min-w-[1rem] sm:min-w-[1.5rem]">2</span>
                  <span><span className="font-bold">DO NOT</span> turn this page before you are told.</span>
                </li>
                <li className="flex gap-2 sm:gap-3">
                  <span className="font-bold min-w-[1rem] sm:min-w-[1.5rem]">3</span>
                  <span>There are <span className="font-bold">{questions.length}</span> questions. Time: <span className="font-bold">{paper.duration} min</span>.</span>
                </li>
                <li className="flex gap-2 sm:gap-3">
                  <span className="font-bold min-w-[1rem] sm:min-w-[1.5rem]">4</span>
                  <span>For each question, choose the <span className="font-bold">best</span> answer and shade it on your Answer Sheet.</span>
                </li>
                <li className="flex gap-2 sm:gap-3">
                  <span className="font-bold min-w-[1rem] sm:min-w-[1.5rem]">5</span>
                  <span><span className="font-bold">Shade completely</span> using an HB pencil. Erase neatly if changing.</span>
                </li>
                <li className="flex gap-2 sm:gap-3">
                  <span className="font-bold min-w-[1rem] sm:min-w-[1.5rem]">6</span>
                  <span>Continue without waiting. Check your work if time permits.</span>
                </li>
              </ol>
            </div>
          </CardContent>
        </Card>

        {/* Questions */}
        {questions.length === 0 ? (
          <Card className="shadow-soft">
            <CardContent className="text-center py-12">
              <p className="text-muted-foreground">No questions added yet</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4 sm:space-y-6">
            {questions.map((question) => (
              <Card key={question.id} className="shadow-soft">
                <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                  <div className="space-y-3 sm:space-y-4">
                    <div className="flex items-start gap-2 sm:gap-3">
                      <div className="font-bold min-w-[1.5rem] sm:min-w-[3rem] text-sm sm:text-base">
                        {question.question_number}.
                      </div>
                      <div className="flex-1 space-y-3 sm:space-y-4">
                        <div>
                          <p className="whitespace-pre-wrap text-sm sm:text-base">{question.question_text}</p>
                          {question.image_url && (
                            <img
                              src={question.image_url}
                              alt="Question diagram"
                              className="mt-3 sm:mt-4 max-w-full rounded-lg"
                            />
                          )}
                        </div>

                        {question.question_type === "MCQ" && question.options && (
                          <div className="space-y-1.5 sm:space-y-2 ml-2 sm:ml-4">
                            {question.options.map((option: string, idx: number) => (
                              <div key={idx} className="flex gap-1.5 sm:gap-2 text-sm sm:text-base">
                                <span className="font-medium">
                                  {String.fromCharCode(65 + idx)}.
                                </span>
                                <span>{option}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-2 border-t flex-wrap gap-2">
                          <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                            <span className="font-medium">[{question.marks}]</span>
                            <span className="capitalize">{question.difficulty}</span>
                            <span className="capitalize hidden sm:inline">{question.question_type}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleAskGemini(question)}
                              disabled={geminiLoadingId === question.id}
                              className="h-7 sm:h-9 text-xs sm:text-sm"
                            >
                              {geminiLoadingId === question.id
                                ? "Asking Gemini..."
                                : "Ask Gemini"}
                            </Button>
                            {isAdmin && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => openEditDialog(question)}
                                className="h-7 sm:h-9 text-xs sm:text-sm"
                              >
                                <Pencil className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                Edit
                              </Button>
                            )}
                          </div>
                        </div>

                        {geminiAnswers[question.id] && (
                          <div className="mt-3 sm:mt-4 rounded-md bg-muted/60 p-3 sm:p-4 text-xs sm:text-sm whitespace-pre-wrap text-muted-foreground">
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
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>

      {/* Edit Question Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Question</DialogTitle>
          </DialogHeader>
          {editingQuestion && (
            <form onSubmit={handleUpdateQuestion} className="space-y-4">
              <div>
                <Label htmlFor="question_text">Question Text</Label>
                <Textarea
                  id="question_text"
                  value={editingQuestion.question_text}
                  onChange={(e) => setEditingQuestion({ ...editingQuestion, question_text: e.target.value })}
                  required
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="question_type">Question Type</Label>
                  <Select
                    value={editingQuestion.question_type}
                    onValueChange={(value) => setEditingQuestion({ ...editingQuestion, question_type: value })}
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
                    value={editingQuestion.difficulty}
                    onValueChange={(value) => setEditingQuestion({ ...editingQuestion, difficulty: value })}
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

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="question_number">Question Number</Label>
                  <Input
                    id="question_number"
                    type="number"
                    value={editingQuestion.question_number}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, question_number: parseInt(e.target.value) })}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="marks">Marks</Label>
                  <Input
                    id="marks"
                    type="number"
                    step="0.5"
                    value={editingQuestion.marks}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, marks: parseFloat(e.target.value) })}
                    required
                  />
                </div>
              </div>

              {editingQuestion.question_type === "MCQ" && (
                <>
                  <div>
                    <Label>Options (4 required)</Label>
                    {[0, 1, 2, 3].map((idx) => (
                      <Input
                        key={idx}
                        placeholder={`Option ${String.fromCharCode(65 + idx)}`}
                        value={editingQuestion.options?.[idx] || ""}
                        onChange={(e) => {
                          const newOptions = [...(editingQuestion.options || ["", "", "", ""])];
                          newOptions[idx] = e.target.value;
                          setEditingQuestion({ ...editingQuestion, options: newOptions });
                        }}
                        className="mt-2"
                        required
                      />
                    ))}
                  </div>

                  <div>
                    <Label htmlFor="correct_answer">Correct Answer</Label>
                    <Select
                      value={editingQuestion.correct_answer?.[0] || ""}
                      onValueChange={(value) => setEditingQuestion({ ...editingQuestion, correct_answer: [value] })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select correct answer" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                        <SelectItem value="D">D</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}

              {editingQuestion.question_type !== "MCQ" && (
                <div>
                  <Label htmlFor="sample_answer">Sample Answer</Label>
                  <Textarea
                    id="sample_answer"
                    value={editingQuestion.sample_answer || ""}
                    onChange={(e) => setEditingQuestion({ ...editingQuestion, sample_answer: e.target.value })}
                    rows={3}
                  />
                </div>
              )}

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
                {editingQuestion.image_url && (
                  <div className="mt-2">
                    <img 
                      src={editingQuestion.image_url} 
                      alt="Question preview" 
                      className="max-w-full h-auto rounded-lg border"
                    />
                  </div>
                )}
              </div>

              <Button type="submit" className="w-full">Update Question</Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
