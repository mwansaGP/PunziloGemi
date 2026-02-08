import { useEffect, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { FileText, Clock, Calendar, PlayCircle, Search } from "lucide-react";
import { useTranslation } from "react-i18next";

export default function Papers() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [papers, setPapers] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedGrade, setSelectedGrade] = useState<string>("all");
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [showAuthDialog, setShowAuthDialog] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [questionSearch, setQuestionSearch] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  useEffect(() => {
    checkUser();
    loadSubjects();
    loadPapers();
  }, [selectedGrade, selectedSubject]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const handleAttemptExam = (paperId: string) => {
    if (!user) {
      setShowAuthDialog(true);
    } else {
      navigate(`/exam/${paperId}`);
    }
  };

  const loadSubjects = async () => {
    const { data } = await supabase
      .from("subjects")
      .select("*")
      .order("name");
    
    if (data) {
      setSubjects(data);
    }
  };

  const loadPapers = async () => {
    setLoading(true);
    let query = supabase
      .from("past_papers")
      .select("*, subjects(name, grade_level)")
      .order("year", { ascending: false });

    if (selectedGrade !== "all") {
      query = query.eq("grade_level", selectedGrade as "Seven" | "Nine" | "Twelve");
    }

    if (selectedSubject !== "all") {
      query = query.eq("subject_id", selectedSubject);
    }

    const searchQuery = searchParams.get("search");
    if (searchQuery) {
      query = query.ilike("name", `%${searchQuery}%`);
    }

    const { data } = await query;

    if (data) {
      setPapers(data);
    }
    setLoading(false);
  };

  const filteredSubjects = selectedGrade === "all" 
    ? subjects 
    : subjects.filter(s => s.grade_level === selectedGrade);

  const searchQuestions = async (query: string) => {
    if (!query.trim() || query.length < 2) {
      setSearchResults([]);
      return;
    }

    const paperIds = papers.map(p => p.id);
    
    if (paperIds.length === 0) {
      setSearchResults([]);
      return;
    }

    const { data } = await supabase
      .from("questions")
      .select("*, past_papers(name, year, subjects(name))")
      .in("past_paper_id", paperIds)
      .ilike("question_text", `%${query}%`)
      .limit(10);

    if (data) {
      setSearchResults(data);
      setSearchOpen(true);
    }
  };

  const handleQuestionClick = (question: any) => {
    setSelectedQuestion(question);
    setShowQuestionDialog(true);
    setSearchOpen(false);
  };

  return (
    <div className="min-h-screen bg-muted/30">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">{t('papers.title')}</h1>
          <p className="text-muted-foreground">
            {t('papers.subtitle')}
          </p>
        </div>

        {/* Question Search */}
        <div className="mb-8">
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t('papers.searchPlaceholder')}
                  value={questionSearch}
                  onChange={(e) => {
                    setQuestionSearch(e.target.value);
                    searchQuestions(e.target.value);
                  }}
                  className="pl-10"
                />
              </div>
            </PopoverTrigger>
            <PopoverContent 
              className="w-[var(--radix-popover-trigger-width)] p-0" 
              align="start"
              onOpenAutoFocus={(e) => e.preventDefault()}
            >
              {searchResults.length > 0 ? (
                <div className="max-h-[300px] overflow-y-auto">
                  {searchResults.map((question) => (
                    <button
                      key={question.id}
                      onClick={() => handleQuestionClick(question)}
                      className="w-full text-left px-4 py-3 hover:bg-accent transition-colors border-b last:border-b-0"
                    >
                      <div className="font-medium text-sm mb-1">
                        {question.past_papers?.subjects?.name} - {question.past_papers?.name}
                      </div>
                      <div className="text-sm text-muted-foreground line-clamp-2">
                        {question.question_text}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {question.question_type} • {question.marks} {t('common.marks')}
                      </div>
                    </button>
                  ))}
                </div>
              ) : questionSearch.trim().length >= 2 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                  {t('nav.noQuestionsFound')}
                </div>
              ) : null}
            </PopoverContent>
          </Popover>
        </div>

        {/* Filters */}
        <Card className="mb-8 shadow-soft">
          <CardHeader>
            <CardTitle>{t('papers.filterTitle')}</CardTitle>
            <CardDescription>{t('papers.filterDesc')}</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">{t('papers.gradeLevel')}</label>
              <Select value={selectedGrade} onValueChange={setSelectedGrade}>
                <SelectTrigger>
                  <SelectValue placeholder={t('papers.allGrades')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('papers.allGrades')}</SelectItem>
                  <SelectItem value="Seven">{t('settings.profile.grades.seven')}</SelectItem>
                  <SelectItem value="Nine">{t('settings.profile.grades.nine')}</SelectItem>
                  <SelectItem value="Twelve">{t('settings.profile.grades.twelve')}</SelectItem>
                  <SelectItem value="GCE">{t('settings.profile.grades.gce')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">{t('papers.subject')}</label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder={t('papers.allSubjects')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('papers.allSubjects')}</SelectItem>
                  {filteredSubjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name} ({subject.grade_level === "Seven" ? "G7" : 
                                       subject.grade_level === "Nine" ? "G9" : "G12"})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Papers Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="mt-4 text-muted-foreground">{t('papers.loadingPapers')}</p>
          </div>
        ) : papers.length === 0 ? (
          <Card className="text-center py-12 shadow-soft">
            <CardContent>
              <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">{t('papers.noPapersFound')}</h3>
              <p className="text-muted-foreground">
                {t('papers.noPapersDesc')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {papers.map((paper) => (
              <Card 
                key={paper.id} 
                className="shadow-soft hover:shadow-hover transition-all duration-300 hover:-translate-y-1"
              >
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-lg mb-1">{paper.name}</CardTitle>
                      <CardDescription>{paper.subjects?.name}</CardDescription>
                    </div>
                    <div className="bg-primary/10 text-primary px-2 py-1 rounded text-xs font-medium">
                      {paper.grade_level === "Seven" ? "G7" : 
                       paper.grade_level === "Nine" ? "G9" : "G12"}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Calendar className="h-4 w-4" />
                    <span>{paper.year}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{paper.duration}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <FileText className="h-4 w-4" />
                    <span>{paper.paper_type} • {paper.total_score} {t('common.marks')}</span>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <Button 
                      className={paper.is_writable ? "flex-1" : "w-full"} 
                      variant="outline"
                      asChild
                    >
                      <Link to={`/papers/${paper.id}`}>{t('papers.viewQuestions')}</Link>
                    </Button>
                    {paper.is_writable && (
                      <Button 
                        className="flex-1" 
                        onClick={() => handleAttemptExam(paper.id)}
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        {t('papers.attemptExam')}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Dialog open={showAuthDialog} onOpenChange={setShowAuthDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{t('papers.authRequired')}</DialogTitle>
              <DialogDescription>
                {t('papers.authRequiredDesc')}
              </DialogDescription>
            </DialogHeader>
            <div className="flex gap-4 mt-4">
              <Button 
                className="flex-1" 
                variant="outline"
                asChild
              >
                <Link to="/login">{t('nav.login')}</Link>
              </Button>
              <Button 
                className="flex-1"
                asChild
              >
                <Link to="/signup">{t('nav.signup')}</Link>
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showQuestionDialog} onOpenChange={setShowQuestionDialog}>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{t('nav.questionDetails')}</DialogTitle>
              <DialogDescription>
                {selectedQuestion?.past_papers?.subjects?.name} - {selectedQuestion?.past_papers?.name} ({selectedQuestion?.past_papers?.year})
              </DialogDescription>
            </DialogHeader>
            {selectedQuestion && (
              <div className="space-y-4">
                <div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                    <span className="font-medium">{t('nav.question')} {selectedQuestion.question_number}</span>
                    <span>•</span>
                    <span>{selectedQuestion.marks} {t('common.marks')}</span>
                    <span>•</span>
                    <span className="capitalize">{selectedQuestion.difficulty}</span>
                  </div>
                  {selectedQuestion.image_url && (
                    <img 
                      src={selectedQuestion.image_url} 
                      alt="Question" 
                      className="w-full rounded-lg mb-4"
                    />
                  )}
                  <p className="text-foreground whitespace-pre-wrap">
                    {selectedQuestion.question_text}
                  </p>
                </div>
                
                {selectedQuestion.question_type === "MCQ" && selectedQuestion.options && (
                  <div className="space-y-2">
                    <p className="font-medium text-sm">{t('nav.options')}:</p>
                    {selectedQuestion.options.map((option: string, index: number) => (
                      <div 
                        key={index}
                        className="p-3 rounded-lg bg-muted/50 border"
                      >
                        <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                        {option}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
