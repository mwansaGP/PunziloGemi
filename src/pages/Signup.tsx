import { useState, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { BookOpen } from "lucide-react";
import { z } from "zod";
import { useTranslation } from "react-i18next";

const signupSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters").max(100, "Name too long"),
  schoolName: z.string().trim().min(2, "School name must be at least 2 characters").max(200, "School name too long"),
  email: z.string().trim().email("Invalid email address").max(255, "Email too long"),
  password: z.string()
    .min(8, "Password must be at least 8 characters")
    .max(100, "Password too long")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one number"),
  confirmPassword: z.string(),
  gradeLevel: z.enum(["Seven", "Nine", "Twelve", "GCE"], { required_error: "Please select a grade level" }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export default function Signup() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [email, setEmail] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [subjects, setSubjects] = useState<any[]>([]);
  const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingSubjects, setIsLoadingSubjects] = useState(false);
  const [step, setStep] = useState(1);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        navigate("/dashboard");
      }
    });
  }, [navigate]);

  useEffect(() => {
    if (gradeLevel) {
      fetchSubjects();
    }
  }, [gradeLevel]);

  const fetchSubjects = async () => {
    if (!gradeLevel) return;
    
    setIsLoadingSubjects(true);
    setSubjects([]);
    setSelectedSubjects([]);
    
    const { data } = await supabase
      .from("subjects")
      .select("*")
      .eq("grade_level", gradeLevel as "Seven" | "Nine" | "Twelve" | "GCE")
      .order("is_compulsory", { ascending: false });
    
    if (data) {
      setSubjects(data);
      setSelectedSubjects(data.filter(s => s.is_compulsory).map(s => s.id));
    }
    
    setIsLoadingSubjects(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (step === 1) {
      const result = signupSchema.safeParse({
        name,
        schoolName,
        email,
        password,
        confirmPassword,
        gradeLevel,
      });

      if (!result.success) {
        const errors = result.error.flatten().fieldErrors;
        const errorMessages = Object.values(errors).flat();
        toast({
          variant: "destructive",
          title: t('auth.validationError'),
          description: errorMessages.join(", "),
        });
        return;
      }
      
      setStep(2);
      return;
    }

    setIsLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
        },
      });

      if (authError) throw authError;

      if (authData.user && gradeLevel) {
        const { error: profileError } = await supabase
          .from("profiles")
          .insert([{ 
            id: authData.user.id, 
            grade_level: gradeLevel as "Seven" | "Nine" | "Twelve" | "GCE",
            name: name,
            school_name: schoolName
          }]);

        if (profileError) throw profileError;

        if (selectedSubjects.length > 0) {
          const subjectInserts = selectedSubjects.map(subjectId => ({
            profile_id: authData.user!.id,
            subject_id: subjectId,
          }));

          const { error: subjectsError } = await supabase
            .from("profile_subjects")
            .insert(subjectInserts);

          if (subjectsError) throw subjectsError;
        }

        toast({
          title: t('auth.accountCreated'),
          description: t('auth.welcomeMessage'),
        });
        navigate("/dashboard");
      }
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: t('auth.signupFailed'),
        description: error.message || "Could not create account",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSubject = (subjectId: string) => {
    setSelectedSubjects(prev =>
      prev.includes(subjectId)
        ? prev.filter(id => id !== subjectId)
        : [...prev, subjectId]
    );
  };

  const getGradeDisplay = () => {
    if (gradeLevel === "Seven") return "7";
    if (gradeLevel === "Nine") return "9";
    if (gradeLevel === "Twelve") return "12";
    return "GCE";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 px-4 py-8">
      <Card className="w-full max-w-md shadow-soft">
        <CardHeader className="space-y-3 text-center">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary/10 p-3">
              <BookOpen className="h-8 w-8 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{t('auth.createAccount')}</CardTitle>
          <CardDescription>
            {step === 1 ? t('auth.startJourney') : t('auth.selectSubjects')}
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSignup}>
          <CardContent className="space-y-4">
            {step === 1 ? (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">{t('auth.fullName')}</Label>
                  <Input
                    id="name"
                    type="text"
                    placeholder={t('auth.fullNamePlaceholder')}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="schoolName">{t('auth.schoolName')}</Label>
                  <Input
                    id="schoolName"
                    type="text"
                    placeholder={t('auth.schoolNamePlaceholder')}
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('auth.email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">{t('auth.gradeLevel')}</Label>
                  <Select value={gradeLevel} onValueChange={setGradeLevel} required>
                    <SelectTrigger id="grade">
                      <SelectValue placeholder={t('auth.selectGrade')} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Seven">{t('settings.profile.grades.seven')}</SelectItem>
                      <SelectItem value="Nine">{t('settings.profile.grades.nine')}</SelectItem>
                      <SelectItem value="Twelve">{t('settings.profile.grades.twelve')}</SelectItem>
                      <SelectItem value="GCE">{t('settings.profile.grades.gce')}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">{t('auth.password')}</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">{t('auth.confirmPassword')}</Label>
                  <Input
                    id="confirmPassword"
                    type="password"
                    placeholder="••••••••"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                  />
                </div>
              </>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  {t('auth.selectSubjectsDesc', { grade: getGradeDisplay() })}
                </p>
                {isLoadingSubjects ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">{t('auth.loadingSubjects')}</div>
                  </div>
                ) : subjects.length > 0 ? (
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {subjects.map((subject) => (
                      <div key={subject.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={subject.id}
                          checked={selectedSubjects.includes(subject.id)}
                          onCheckedChange={() => toggleSubject(subject.id)}
                          disabled={subject.is_compulsory}
                        />
                        <label
                          htmlFor={subject.id}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {subject.name}
                          {subject.is_compulsory && (
                            <span className="ml-2 text-xs text-muted-foreground">({t('common.required')})</span>
                          )}
                        </label>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex items-center justify-center py-8">
                    <div className="text-sm text-muted-foreground">{t('auth.noSubjectsAvailable')}</div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <CardFooter className="flex flex-col gap-3">
            {step === 2 && (
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => setStep(1)}
              >
                {t('common.back')}
              </Button>
            )}
            <Button
              type="submit"
              className="w-full bg-primary hover:bg-primary-dark"
              disabled={isLoading}
            >
              {isLoading ? t('auth.creatingAccount') : step === 1 ? t('auth.continue') : t('auth.createAccount')}
            </Button>
            {step === 1 && (
              <p className="text-sm text-center text-muted-foreground">
                {t('auth.haveAccount')}{" "}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  {t('auth.loginHere')}
                </Link>
              </p>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  );
}
