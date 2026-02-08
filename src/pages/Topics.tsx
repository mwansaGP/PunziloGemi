import { useEffect, useState } from "react";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { BookOpen, GraduationCap, FileText } from "lucide-react";
import { toast } from "sonner";
import { useTranslation } from "react-i18next";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

type Topic = {
  id: string;
  name: string;
  subject_id: string;
  question_count: number;
};

type Subject = {
  id: string;
  name: string;
  grade_level: string;
};

export default function Topics() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [topics, setTopics] = useState<Topic[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedGrade, setSelectedGrade] = useState<string>("Seven");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [expandedTopics, setExpandedTopics] = useState<Record<string, any[]>>({});

  useEffect(() => {
    checkUser();
    loadSubjects();
  }, []);

  useEffect(() => {
    loadTopics();
  }, [selectedGrade, selectedSubject]);

  useEffect(() => {
    setSelectedTopic("all");
  }, [selectedGrade, selectedSubject]);

  const checkUser = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user ?? null);
  };

  const loadSubjects = async () => {
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .order("name");

    if (error) {
      toast.error(t('common.error'));
      return;
    }

    setSubjects(data || []);
  };

  const loadTopics = async () => {
    setLoading(true);
    
    let query = supabase
      .from("topics")
      .select(`
        id,
        name,
        subject_id,
        subjects!inner(
          id,
          name,
          grade_level
        )
      `)
      .eq("subjects.grade_level", selectedGrade as "Seven" | "Nine" | "Twelve");

    if (selectedSubject !== "all") {
      query = query.eq("subject_id", selectedSubject);
    }

    const { data, error } = await query.order("name");

    if (error) {
      console.error("Error loading topics:", error);
      toast.error(t('common.error'));
      setLoading(false);
      return;
    }

    const topicsWithCounts = await Promise.all(
      (data || []).map(async (topic: any) => {
        const { count } = await supabase
          .from("questions")
          .select("*", { count: "exact", head: true })
          .eq("topic_id", topic.id);

        return {
          id: topic.id,
          name: topic.name,
          subject_id: topic.subject_id,
          question_count: count || 0,
        };
      })
    );

    setTopics(topicsWithCounts);
    setLoading(false);
  };

  const loadTopicQuestions = async (topicId: string) => {
    if (expandedTopics[topicId]) {
      const newExpanded = { ...expandedTopics };
      delete newExpanded[topicId];
      setExpandedTopics(newExpanded);
      return;
    }

    const { data, error } = await supabase
      .from("questions")
      .select(`
        id,
        question_text,
        question_type,
        marks,
        difficulty,
        question_number,
        past_papers!inner(
          id,
          name,
          year
        )
      `)
      .eq("topic_id", topicId)
      .order("question_number");

    if (error) {
      toast.error(t('common.error'));
      return;
    }

    setExpandedTopics({
      ...expandedTopics,
      [topicId]: data || [],
    });
  };

  const handleViewPaper = (paperId: string) => {
    navigate(`/papers/${paperId}`);
  };

  const handleAttemptTopic = (topicId: string) => {
    if (!user) {
      toast.error(t('topics.loginRequired'));
      navigate("/login");
      return;
    }
    
    navigate(`/topic-practice/${topicId}`);
  };

  const filteredSubjects = subjects.filter(s => s.grade_level === selectedGrade);
  const filteredTopics = selectedTopic === "all" ? topics : topics.filter(t => t.id === selectedTopic);

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-foreground mb-2">{t('topics.title')}</h1>
          <p className="text-muted-foreground">
            {t('topics.subtitle')}
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              {t('topics.filterTitle')}
            </CardTitle>
            <CardDescription>
              {t('topics.filterDesc')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">{t('topics.gradeLevel')}</label>
                <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={t('topics.gradeLevel')} />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="Seven">{t('settings.profile.grades.seven')}</SelectItem>
                    <SelectItem value="Nine">{t('settings.profile.grades.nine')}</SelectItem>
                    <SelectItem value="Twelve">{t('settings.profile.grades.twelve')}</SelectItem>
                    <SelectItem value="GCE">{t('settings.profile.grades.gce')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">{t('topics.subject')}</label>
                <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={t('topics.subject')} />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="all">{t('topics.allSubjects')}</SelectItem>
                    {filteredSubjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">{t('topics.topic')}</label>
                <Select value={selectedTopic} onValueChange={setSelectedTopic}>
                  <SelectTrigger className="bg-background">
                    <SelectValue placeholder={t('topics.topic')} />
                  </SelectTrigger>
                  <SelectContent className="bg-background z-50">
                    <SelectItem value="all">{t('topics.allTopics')}</SelectItem>
                    {topics.map((topic) => (
                      <SelectItem key={topic.id} value={topic.id}>
                        {topic.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {loading ? (
          <div className="text-center py-12">
            <p className="text-muted-foreground">{t('topics.loadingTopics')}</p>
          </div>
        ) : topics.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">{t('topics.noTopicsFound')}</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredTopics.map((topic) => (
              <Card key={topic.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="flex items-center gap-2 mb-2">
                        <BookOpen className="h-5 w-5 text-primary" />
                        {topic.name}
                      </CardTitle>
                      <CardDescription className="flex items-center gap-4">
                        <span className="flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          {t('topics.questionsCount', { count: topic.question_count })}
                        </span>
                      </CardDescription>
                    </div>
                    <Button
                      onClick={() => handleAttemptTopic(topic.id)}
                      disabled={topic.question_count === 0}
                    >
                      {t('topics.practiceTopic')}
                    </Button>
                  </div>
                </CardHeader>

                {topic.question_count > 0 && (
                  <CardContent>
                    <Accordion type="single" collapsible className="w-full">
                      <AccordionItem value="questions" className="border-none">
                        <AccordionTrigger
                          onClick={() => loadTopicQuestions(topic.id)}
                          className="hover:no-underline"
                        >
                          <span className="text-sm font-medium">
                            {expandedTopics[topic.id] ? t('topics.hideQuestions') : t('topics.viewQuestions')}
                          </span>
                        </AccordionTrigger>
                        <AccordionContent>
                          {expandedTopics[topic.id] && (
                            <div className="space-y-3 pt-2">
                              {expandedTopics[topic.id].map((question: any) => (
                                <Card key={question.id} className="bg-muted/50">
                                  <CardContent className="pt-4">
                                    <div className="flex items-start justify-between gap-4">
                                      <div className="flex-1">
                                        <p className="text-sm font-medium mb-2">
                                          Q{question.question_number}. {question.question_text.substring(0, 150)}
                                          {question.question_text.length > 150 && "..."}
                                        </p>
                                        <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                          <span>{question.question_type}</span>
                                          <span>•</span>
                                          <span>{question.marks} {t('common.marks')}</span>
                                          <span>•</span>
                                          <span>{question.difficulty}</span>
                                          <span>•</span>
                                          <span>{question.past_papers.year}</span>
                                        </div>
                                      </div>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleViewPaper(question.past_papers.id)}
                                      >
                                        {t('topics.viewPaper')}
                                      </Button>
                                    </div>
                                  </CardContent>
                                </Card>
                              ))}
                            </div>
                          )}
                        </AccordionContent>
                      </AccordionItem>
                    </Accordion>
                  </CardContent>
                )}
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
