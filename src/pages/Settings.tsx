import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "next-themes";
import { User, Globe, Eye, FileText, Moon, Sun } from "lucide-react";

const languageMap: Record<string, string> = {
  english: "en",
  bemba: "bem",
  nyanja: "ny",
  tonga: "ton",
};

const reverseLanguageMap: Record<string, string> = {
  en: "english",
  bem: "bemba",
  ny: "nyanja",
  ton: "tonga",
};

export default function Settings() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, setTheme } = useTheme();
  const { t, i18n } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Profile fields
  const [name, setName] = useState("");
  const [schoolName, setSchoolName] = useState("");
  const [gradeLevel, setGradeLevel] = useState<"Seven" | "Nine" | "Twelve" | "GCE" | "">("");
  
  // Settings
  const [language, setLanguage] = useState(reverseLanguageMap[i18n.language] || "english");
  const [fontSize, setFontSize] = useState("medium");
  const [highContrast, setHighContrast] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    checkAuthAndLoadProfile();
  }, []);

  const checkAuthAndLoadProfile = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      navigate("/login");
      return;
    }

    const { data: profileData } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", session.user.id)
      .single();

    if (profileData) {
      setName(profileData.name || "");
      setSchoolName(profileData.school_name || "");
      setGradeLevel(profileData.grade_level || "");
    }
    
    setLoading(false);
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      toast({
        title: t("common.error"),
        description: t("settings.profile.authError"),
        variant: "destructive",
      });
      setSaving(false);
      return;
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        name,
        school_name: schoolName,
        ...(gradeLevel && { grade_level: gradeLevel }),
      })
      .eq("id", session.user.id);

    if (error) {
      toast({
        title: t("common.error"),
        description: t("settings.profile.saveError"),
        variant: "destructive",
      });
    } else {
      toast({
        title: t("common.success"),
        description: t("settings.profile.saveSuccess"),
      });
    }
    
    setSaving(false);
  };

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    toast({
      title: t("settings.appearance.themeUpdated"),
      description: t("settings.appearance.themeSwitched", { theme: newTheme }),
    });
  };

  const handleLanguageChange = (newLanguage: string) => {
    setLanguage(newLanguage);
    const i18nCode = languageMap[newLanguage] || "en";
    i18n.changeLanguage(i18nCode);
    toast({
      title: t("settings.language.languageChanged"),
      description: t("settings.language.languageSwitched", { language: t(`settings.language.languages.${newLanguage}`) }),
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">{t("common.loading")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">{t("settings.title")}</h1>
          <p className="text-muted-foreground">
            {t("settings.subtitle")}
          </p>
        </div>

        <Tabs defaultValue="profile" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.tabs.profile")}</span>
            </TabsTrigger>
            <TabsTrigger value="appearance" className="flex items-center gap-2">
              <Moon className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.tabs.appearance")}</span>
            </TabsTrigger>
            <TabsTrigger value="language" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.tabs.language")}</span>
            </TabsTrigger>
            <TabsTrigger value="accessibility" className="flex items-center gap-2">
              <Eye className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.tabs.accessibility")}</span>
            </TabsTrigger>
            <TabsTrigger value="terms" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">{t("settings.tabs.terms")}</span>
            </TabsTrigger>
          </TabsList>

          {/* Profile Tab */}
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.profile.title")}</CardTitle>
                <CardDescription>
                  {t("settings.profile.description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="name">{t("settings.profile.fullName")}</Label>
                  <Input
                    id="name"
                    placeholder={t("settings.profile.fullNamePlaceholder")}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="school">{t("settings.profile.schoolName")}</Label>
                  <Input
                    id="school"
                    placeholder={t("settings.profile.schoolNamePlaceholder")}
                    value={schoolName}
                    onChange={(e) => setSchoolName(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="grade">{t("settings.profile.gradeLevel")}</Label>
                  <Select 
                    value={gradeLevel} 
                    onValueChange={(value) => setGradeLevel(value as "Seven" | "Nine" | "Twelve" | "GCE")}
                  >
                    <SelectTrigger id="grade">
                      <SelectValue placeholder={t("settings.profile.gradePlaceholder")} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Seven">{t("settings.profile.grades.seven")}</SelectItem>
                      <SelectItem value="Nine">{t("settings.profile.grades.nine")}</SelectItem>
                      <SelectItem value="Twelve">{t("settings.profile.grades.twelve")}</SelectItem>
                      <SelectItem value="GCE">{t("settings.profile.grades.gce")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Button 
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="w-full sm:w-auto"
                >
                  {saving ? t("common.saving") : t("common.save")}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Appearance Tab */}
          <TabsContent value="appearance">
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.appearance.title")}</CardTitle>
                <CardDescription>
                  {t("settings.appearance.description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-medium mb-4">{t("settings.appearance.theme")}</h3>
                    <div className="grid grid-cols-3 gap-4">
                      <Button
                        variant={theme === "light" ? "default" : "outline"}
                        className="flex flex-col items-center gap-2 h-auto py-4"
                        onClick={() => handleThemeChange("light")}
                      >
                        <Sun className="h-6 w-6" />
                        <span>{t("settings.appearance.light")}</span>
                      </Button>
                      <Button
                        variant={theme === "dark" ? "default" : "outline"}
                        className="flex flex-col items-center gap-2 h-auto py-4"
                        onClick={() => handleThemeChange("dark")}
                      >
                        <Moon className="h-6 w-6" />
                        <span>{t("settings.appearance.dark")}</span>
                      </Button>
                      <Button
                        variant={theme === "system" ? "default" : "outline"}
                        className="flex flex-col items-center gap-2 h-auto py-4"
                        onClick={() => handleThemeChange("system")}
                      >
                        <div className="flex">
                          <Sun className="h-4 w-4" />
                          <Moon className="h-4 w-4" />
                        </div>
                        <span>{t("settings.appearance.system")}</span>
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Language Tab */}
          <TabsContent value="language">
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.language.title")}</CardTitle>
                <CardDescription>
                  {t("settings.language.description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="language">{t("settings.language.interfaceLanguage")}</Label>
                  <Select value={language} onValueChange={handleLanguageChange}>
                    <SelectTrigger id="language">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="english">{t("settings.language.languages.english")}</SelectItem>
                      <SelectItem value="bemba">{t("settings.language.languages.bemba")}</SelectItem>
                      <SelectItem value="nyanja">{t("settings.language.languages.nyanja")}</SelectItem>
                      <SelectItem value="tonga">{t("settings.language.languages.tonga")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Accessibility Tab */}
          <TabsContent value="accessibility">
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.accessibility.title")}</CardTitle>
                <CardDescription>
                  {t("settings.accessibility.description")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="fontSize">{t("settings.accessibility.fontSize")}</Label>
                  <Select value={fontSize} onValueChange={setFontSize}>
                    <SelectTrigger id="fontSize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">{t("settings.accessibility.fontSizes.small")}</SelectItem>
                      <SelectItem value="medium">{t("settings.accessibility.fontSizes.medium")}</SelectItem>
                      <SelectItem value="large">{t("settings.accessibility.fontSizes.large")}</SelectItem>
                      <SelectItem value="x-large">{t("settings.accessibility.fontSizes.xLarge")}</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="highContrast">{t("settings.accessibility.highContrast")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.accessibility.highContrastDescription")}
                    </p>
                  </div>
                  <Switch
                    id="highContrast"
                    checked={highContrast}
                    onCheckedChange={setHighContrast}
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label htmlFor="reducedMotion">{t("settings.accessibility.reducedMotion")}</Label>
                    <p className="text-sm text-muted-foreground">
                      {t("settings.accessibility.reducedMotionDescription")}
                    </p>
                  </div>
                  <Switch
                    id="reducedMotion"
                    checked={reducedMotion}
                    onCheckedChange={setReducedMotion}
                  />
                </div>

                <p className="text-sm text-muted-foreground pt-4">
                  {t("settings.accessibility.note")}
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Terms Tab */}
          <TabsContent value="terms">
            <Card>
              <CardHeader>
                <CardTitle>{t("settings.terms.title")}</CardTitle>
                <CardDescription>
                  {t("settings.terms.lastUpdated")}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="prose prose-sm dark:prose-invert max-w-none">
                  <h3 className="text-lg font-semibold">1. Acceptance of Terms</h3>
                  <p className="text-muted-foreground">
                    By accessing and using Punzilo, you accept and agree to be bound by the terms and provision of this agreement.
                  </p>

                  <h3 className="text-lg font-semibold mt-6">2. Use License</h3>
                  <p className="text-muted-foreground">
                    Permission is granted to temporarily access the materials (information or software) on Punzilo for personal, non-commercial educational use only.
                  </p>

                  <h3 className="text-lg font-semibold mt-6">3. User Accounts</h3>
                  <p className="text-muted-foreground">
                    You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account.
                  </p>

                  <h3 className="text-lg font-semibold mt-6">4. Educational Content</h3>
                  <p className="text-muted-foreground">
                    All past paper questions and educational materials are provided for study purposes only. The content is based on official ECZ examination materials and is meant to help students prepare for their exams.
                  </p>

                  <h3 className="text-lg font-semibold mt-6">5. Privacy</h3>
                  <p className="text-muted-foreground">
                    We collect and use your personal information in accordance with our Privacy Policy. Your data is stored securely and will not be shared with third parties without your consent.
                  </p>

                  <h3 className="text-lg font-semibold mt-6">6. Prohibited Activities</h3>
                  <p className="text-muted-foreground">
                    You may not use Punzilo to share answers during actual examinations, engage in academic dishonesty, or violate any applicable laws or regulations.
                  </p>

                  <h3 className="text-lg font-semibold mt-6">7. Disclaimer</h3>
                  <p className="text-muted-foreground">
                    The materials on Punzilo are provided on an 'as is' basis. Punzilo makes no warranties, expressed or implied, and hereby disclaims and negates all other warranties including, without limitation, implied warranties or conditions of merchantability, fitness for a particular purpose, or non-infringement of intellectual property or other violation of rights.
                  </p>

                  <h3 className="text-lg font-semibold mt-6">8. Limitations</h3>
                  <p className="text-muted-foreground">
                    In no event shall Punzilo or its suppliers be liable for any damages (including, without limitation, damages for loss of data or profit, or due to business interruption) arising out of the use or inability to use the materials on Punzilo.
                  </p>

                  <h3 className="text-lg font-semibold mt-6">9. Changes to Terms</h3>
                  <p className="text-muted-foreground">
                    Punzilo may revise these terms of service at any time without notice. By using this platform you are agreeing to be bound by the then current version of these terms of service.
                  </p>

                  <h3 className="text-lg font-semibold mt-6">10. Contact Information</h3>
                  <p className="text-muted-foreground">
                    If you have any questions about these Terms, please contact us through the platform's support channels.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
