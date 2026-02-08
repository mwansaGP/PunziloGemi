import { useState, useEffect } from "react";
import { Navigation } from "@/components/Navigation";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, BookOpen, MessageCircle, ChevronRight } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type GradeLevel = "Seven" | "Nine" | "Twelve" | "GCE";

interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

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

const Study = () => {
  const [gradeLevel, setGradeLevel] = useState<GradeLevel | "">("");
  const [subjectId, setSubjectId] = useState<string>("");
  const [topicId, setTopicId] = useState<string>("");
  const [subjects, setSubjects] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [notes, setNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [studentName, setStudentName] = useState<string | null>(null);
  const [studentSchool, setStudentSchool] = useState<string | null>(null);

  useEffect(() => {
    // Load basic profile info so Gemini can personalize responses
    const loadProfile = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) return;

        const { data: profileData } = await supabase
          .from("profiles")
          .select("name, school_name, grade_level")
          .eq("id", session.user.id)
          .maybeSingle();

        if (profileData) {
          setStudentName(profileData.name || null);
          setStudentSchool(profileData.school_name || null);
          // If grade level is set in the profile and not already chosen in filters, prefer it
          if (!gradeLevel && profileData.grade_level) {
            setGradeLevel(profileData.grade_level as GradeLevel);
          }
        }
      } catch (error) {
        console.error("Error loading profile for Gemini context", error);
      }
    };

    loadProfile();
  }, []);

  useEffect(() => {
    if (gradeLevel) {
      loadSubjects();
    } else {
      setSubjects([]);
      setSubjectId("");
    }
  }, [gradeLevel]);

  useEffect(() => {
    if (subjectId) {
      loadTopics();
    } else {
      setTopics([]);
      setTopicId("");
    }
  }, [subjectId]);

  useEffect(() => {
    if (topicId) {
      loadNotes();
    } else {
      setNotes([]);
    }
  }, [topicId]);

  const loadSubjects = async () => {
    if (!gradeLevel) return;
    const { data } = await supabase
      .from("subjects")
      .select("*")
      .eq("grade_level", gradeLevel as GradeLevel)
      .order("name");
    if (data) setSubjects(data);
  };

  const loadTopics = async () => {
    const { data } = await supabase
      .from("topics")
      .select("*")
      .eq("subject_id", subjectId)
      .order("name");
    if (data) setTopics(data);
  };

  const loadNotes = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("study_notes")
      .select("*")
      .eq("topic_id", topicId)
      .order("display_order");
    if (data) setNotes(data);
    setLoading(false);
  };

  const callGemini = async (userQuestion: string) => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;

    if (!apiKey) {
      throw new Error("Gemini API key is not configured.");
    }

    const selectedTopic = topics.find((t) => t.id === topicId);
    const selectedSubject = subjects.find((s) => s.id === subjectId);

    const historyText = chatMessages
      .map((message) => `${message.sender === "user" ? "Student" : "Tutor"}: ${message.content}`)
      .join("\n");

    const systemPrompt = `You are a helpful study assistant for Zed Past Prep students in Zambia. ` +
      `Always give clear, step-by-step explanations that match the student's grade level and syllabus. ` +
      `The student's name is ${studentName || "unknown"}. When it feels natural, you may address them as "${
        studentName || "student"
      }" in your explanations. ` +
      `Grade level: ${gradeLevel || "Unknown"}. Subject: ${selectedSubject?.name || "Unknown"}. ` +
      `Topic: ${selectedTopic?.name || "Unknown"}. ` +
      (studentSchool
        ? `The student attends ${studentSchool}. `
        : "") +
      `Explain the answer in a way that helps this specific student understand the relationship between this topic and their subject. ` +
      `If the question is outside the syllabus, still help but mention it briefly.`;

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
                historyText
                  ? { text: `Conversation so far:\n${historyText}` }
                  : { text: "This is the first question in the conversation." },
                { text: `Student question: ${userQuestion}` },
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
        .join("\n")?.trim() ||
      "I'm sorry, I couldn't generate a response right now.";

    return cleanGeminiText(rawReply);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const newMessage: ChatMessage = {
      id: crypto.randomUUID(),
      content: chatInput,
      sender: "user",
      timestamp: new Date(),
    };

    setChatMessages((prev) => [...prev, newMessage]);
    setChatInput("");
    setChatLoading(true);

    try {
      const reply = await callGemini(chatInput.trim());
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content: reply,
        sender: "assistant",
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
    } catch (error: any) {
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        content:
          error?.message ||
          "Sorry, I couldn't reach the study assistant. Please try again in a moment.",
        sender: "assistant",
        timestamp: new Date(),
      };
      setChatMessages((prev) => [...prev, assistantMessage]);
    } finally {
      setChatLoading(false);
    }
  };

  const selectedTopic = topics.find((t) => t.id === topicId);
  const selectedSubject = subjects.find((s) => s.id === subjectId);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-4 md:p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold mb-2">Study Notes</h1>
          <p className="text-muted-foreground">
            Select a topic to view study materials and ask questions
          </p>
        </div>

        {/* Filters */}
        <Card className="p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="grade">Grade Level</Label>
              <Select
                value={gradeLevel}
                onValueChange={(value: GradeLevel) => setGradeLevel(value)}
              >
                <SelectTrigger id="grade">
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
                value={subjectId}
                onValueChange={setSubjectId}
                disabled={!gradeLevel}
              >
                <SelectTrigger id="subject">
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

            <div>
              <Label htmlFor="topic">Topic</Label>
              <Select
                value={topicId}
                onValueChange={setTopicId}
                disabled={!subjectId}
              >
                <SelectTrigger id="topic">
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
        </Card>

        {/* Main Content Area */}
        {topicId ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Notes Section */}
            <div className="lg:col-span-2">
              <Card className="h-[calc(100vh-320px)] flex flex-col">
                <div className="p-4 border-b bg-muted/50">
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    <div>
                      <h2 className="font-semibold">{selectedTopic?.name}</h2>
                      <p className="text-sm text-muted-foreground">
                        {selectedSubject?.name} • {gradeLevel}
                      </p>
                    </div>
                  </div>
                </div>
                <ScrollArea className="flex-1 p-4">
                  {loading ? (
                    <div className="flex items-center justify-center h-full">
                      <p className="text-muted-foreground">Loading notes...</p>
                    </div>
                  ) : notes.length > 0 ? (
                    <div className="space-y-6">
                      {notes.map((note) => (
                        <article key={note.id} className="prose prose-sm max-w-none dark:prose-invert">
                          <h3 className="text-lg font-semibold mb-2">{note.title}</h3>
                          <div className="whitespace-pre-wrap text-foreground/90">
                            {note.content}
                          </div>
                          {note.image_urls && note.image_urls.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-4">
                              {note.image_urls.map((url: string, index: number) => (
                                <img
                                  key={index}
                                  src={url}
                                  alt={`Note image ${index + 1}`}
                                  className="rounded-lg max-w-full md:max-w-sm"
                                />
                              ))}
                            </div>
                          )}
                        </article>
                      ))}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <BookOpen className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-muted-foreground">
                        No study notes available for this topic yet.
                      </p>
                      <p className="text-sm text-muted-foreground mt-1">
                        Check back later or try a different topic.
                      </p>
                    </div>
                  )}
                </ScrollArea>
              </Card>
            </div>

            {/* Chat Section */}
            <div className="lg:col-span-1">
              <Card className="h-[calc(100vh-320px)] flex flex-col">
                <div className="p-4 border-b bg-muted/50">
                  <div className="flex items-center gap-2">
                    <MessageCircle className="h-5 w-5 text-primary" />
                    <h2 className="font-semibold">Study Assistant</h2>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Ask questions about this topic
                  </p>
                </div>
                <ScrollArea className="flex-1 p-4">
                  {chatMessages.length > 0 ? (
                    <div className="space-y-4">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${
                            message.sender === "user" ? "justify-end" : "justify-start"
                          }`}
                        >
                          <div
                            className={`max-w-[85%] rounded-lg px-3 py-2 ${
                              message.sender === "user"
                                ? "bg-primary text-primary-foreground"
                                : "bg-muted"
                            }`}
                          >
                            {message.content
                              .split(/\n{2,}/)
                              .filter((para) => para.trim().length > 0)
                              .map((para, idx) => (
                                <p
                                  key={idx}
                                  className={`text-sm ${idx > 0 ? "mt-2" : ""}`}
                                >
                                  {para}
                                </p>
                              ))}
                            <p className="text-xs opacity-70 mt-1">
                              {message.timestamp.toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })}
                            </p>
                          </div>
                        </div>
                      ))}
                      {chatLoading && (
                        <div className="flex justify-start">
                          <div className="max-w-[85%] rounded-lg px-3 py-2 bg-muted text-sm text-muted-foreground">
                            Thinking...
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <MessageCircle className="h-10 w-10 text-muted-foreground/50 mb-3" />
                      <p className="text-sm text-muted-foreground">
                        Ask a question about this topic
                      </p>
                    </div>
                  )}
                </ScrollArea>
                <form onSubmit={handleSendMessage} className="p-4 border-t">
                  <div className="flex gap-2">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      placeholder="Type your question..."
                      className="flex-1"
                      disabled={chatLoading}
                    />
                    <Button type="submit" size="icon" disabled={chatLoading || !chatInput.trim()}>
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </Card>
            </div>
          </div>
        ) : (
          <Card className="p-12 text-center">
            <div className="max-w-md mx-auto">
              <BookOpen className="h-16 w-16 text-muted-foreground/50 mx-auto mb-4" />
              <h2 className="text-xl font-semibold mb-2">Select a Topic to Start</h2>
              <p className="text-muted-foreground mb-4">
                Choose your grade level, subject, and topic from the filters above to view study notes.
              </p>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <span>Grade</span>
                <ChevronRight className="h-4 w-4" />
                <span>Subject</span>
                <ChevronRight className="h-4 w-4" />
                <span>Topic</span>
              </div>
            </div>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Study;
