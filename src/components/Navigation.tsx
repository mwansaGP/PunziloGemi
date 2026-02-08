import { Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, LogOut, Shield, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useEffect, useState } from "react";
import { User } from "@supabase/supabase-js";
import { useAdmin } from "@/hooks/useAdmin";
import punziloLogo from "@/assets/punzilo-logo.png";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { z } from "zod";
import { useTranslation } from "react-i18next";

const searchSchema = z.string().trim().min(2, "Search query too short").max(500, "Search query too long");

export const Navigation = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { isAdmin } = useAdmin();
  const [user, setUser] = useState<User | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [showQuestionDialog, setShowQuestionDialog] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  const searchQuestions = async (query: string) => {
    const result = searchSchema.safeParse(query);
    if (!result.success) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    const sanitizedQuery = result.data.replace(/[%_]/g, "\\$&");

    const { data } = await supabase
      .from("questions")
      .select("*, past_papers(name, year, subjects(name))")
      .ilike("question_text", `%${sanitizedQuery}%`)
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
    setSearchQuery("");
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/papers?search=${encodeURIComponent(searchQuery)}`);
    }
  };

  return (
    <nav className="sticky top-0 z-50 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80">
      <div className="container mx-auto px-2 sm:px-4 py-2 sm:py-4">
        <div className="flex items-center justify-between gap-2 sm:gap-4">
          <Link to="/" className="flex items-center gap-1 sm:gap-2 shrink-0">
            <img src={punziloLogo} alt="Punzilo" className="h-8 w-8 sm:h-10 sm:w-10" />
            <span className="text-base sm:text-xl font-bold text-primary hidden xs:inline">Punzilo</span>
          </Link>

          <div className="hidden lg:flex flex-1 max-w-md">
            <Popover open={searchOpen} onOpenChange={setSearchOpen}>
              <PopoverTrigger asChild>
                <div className="relative w-full">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                  <Input
                    type="search"
                    placeholder={t('nav.searchPlaceholder')}
                    className="pl-10 w-full"
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                      searchQuestions(e.target.value);
                    }}
                  />
                </div>
              </PopoverTrigger>
              <PopoverContent 
                className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover z-50" 
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
                ) : searchQuery.trim().length >= 2 ? (
                  <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                    {t('nav.noQuestionsFound')}
                  </div>
                ) : null}
              </PopoverContent>
            </Popover>
          </div>

          <div className="flex items-center gap-1 sm:gap-2">
            <Button variant="ghost" asChild className="hidden sm:inline-flex text-xs sm:text-sm px-2 sm:px-4">
              <Link to="/papers">{t('nav.browsePapers')}</Link>
            </Button>
            <Button variant="ghost" asChild className="hidden md:inline-flex text-xs sm:text-sm px-2 sm:px-4">
              <Link to="/topics">{t('nav.browseTopics')}</Link>
            </Button>
            <Button variant="ghost" asChild className="hidden md:inline-flex text-xs sm:text-sm px-2 sm:px-4">
              <Link to="/study">{t('nav.study')}</Link>
            </Button>
            {user ? (
              <>
                <Button variant="outline" asChild className="text-xs sm:text-sm px-2 sm:px-4">
                  <Link to="/dashboard">{t('nav.dashboard')}</Link>
                </Button>
                {isAdmin && (
                  <Button variant="ghost" asChild className="hidden md:inline-flex px-2 sm:px-4">
                    <Link to="/admin/dashboard" className="text-primary text-xs sm:text-sm">
                      <Shield className="h-4 w-4 mr-1 sm:mr-2" />
                      <span className="hidden sm:inline">{t('nav.admin')}</span>
                    </Link>
                  </Button>
                )}
                <Button variant="ghost" size="icon" asChild className="h-8 w-8 sm:h-10 sm:w-10">
                  <Link to="/settings">
                    <Settings className="h-4 w-4" />
                  </Link>
                </Button>
                <Button variant="ghost" size="icon" onClick={handleLogout} className="h-8 w-8 sm:h-10 sm:w-10">
                  <LogOut className="h-4 w-4" />
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" asChild className="text-xs sm:text-sm px-2 sm:px-4">
                  <Link to="/login">{t('nav.login')}</Link>
                </Button>
                <Button asChild className="bg-primary hover:bg-primary-dark text-xs sm:text-sm px-2 sm:px-4">
                  <Link to="/signup">{t('nav.signup')}</Link>
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Mobile search and nav links */}
        <div className="mt-3 lg:hidden space-y-2">
          <div className="flex gap-2 sm:hidden flex-wrap">
            <Button variant="ghost" asChild className="flex-1 text-xs px-2">
              <Link to="/papers">{t('nav.browsePapers')}</Link>
            </Button>
            <Button variant="ghost" asChild className="flex-1 text-xs px-2">
              <Link to="/topics">{t('nav.browseTopics')}</Link>
            </Button>
            <Button variant="ghost" asChild className="flex-1 text-xs px-2">
              <Link to="/study">{t('nav.study')}</Link>
            </Button>
          </div>
          <Popover open={searchOpen} onOpenChange={setSearchOpen}>
            <PopoverTrigger asChild>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground z-10" />
                <Input
                  type="search"
                  placeholder={t('nav.searchPlaceholder')}
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    searchQuestions(e.target.value);
                  }}
                />
              </div>
            </PopoverTrigger>
            <PopoverContent 
              className="w-[var(--radix-popover-trigger-width)] p-0 bg-popover z-50" 
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
              ) : searchQuery.trim().length >= 2 ? (
                <div className="px-4 py-3 text-sm text-muted-foreground text-center">
                  {t('nav.noQuestionsFound')}
                </div>
              ) : null}
            </PopoverContent>
          </Popover>
        </div>
      </div>

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
    </nav>
  );
};
