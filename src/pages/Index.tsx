import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Navigation } from "@/components/Navigation";
import { CheckCircle, Search, Smartphone } from "lucide-react";
import heroImage from "@/assets/hero-student.jpg";
import punziloLogo from "@/assets/punzilo-logo.png";
import { useTranslation } from "react-i18next";

export default function Index() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero text-primary-foreground">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-primary-dark/90"></div>
        <div className="container relative mx-auto px-4 py-20 md:py-32">
          <div className="grid gap-12 md:grid-cols-2 items-center">
            <div className="space-y-6 animate-fade-in">
              <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight">
                {t('home.heroTitle')}
              </h1>
              <p className="text-lg md:text-xl text-primary-foreground/90 max-w-xl">
                {t('home.heroSubtitle')}
              </p>
              <div className="flex flex-wrap gap-4 pt-4">
                <Button size="lg" className="bg-secondary hover:bg-secondary/90 text-secondary-foreground shadow-hover" asChild>
                  <Link to="/signup">{t('home.getStarted')}</Link>
                </Button>
                <Button size="lg" variant="outline" className="bg-white/10 text-white border-white/20 hover:bg-white/20" asChild>
                  <Link to="/papers">{t('home.browsePapers')}</Link>
                </Button>
              </div>
            </div>
            <div className="animate-slide-up">
              <img src={heroImage} alt="Student studying ECZ past papers with confidence" className="rounded-2xl shadow-hover w-full" />
            </div>
          </div>
        </div>
      </section>

      {/* App Download Banner */}
      <section className="py-12 bg-primary">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6 max-w-5xl mx-auto">
            <div className="flex items-center gap-4 text-primary-foreground">
              <div className="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center flex-shrink-0">
                <Smartphone className="h-8 w-8" />
              </div>
              <div>
                <h3 className="text-xl md:text-2xl font-bold mb-1">{t('home.downloadApp')}</h3>
                <p className="text-primary-foreground/90">{t('home.practiceOnGo')}</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-hover" asChild>
                <a href="https://play.google.com/store" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3,20.5V3.5C3,2.91 3.34,2.39 3.84,2.15L13.69,12L3.84,21.85C3.34,21.6 3,21.09 3,20.5M16.81,15.12L6.05,21.34L14.54,12.85L16.81,15.12M20.16,10.81C20.5,11.08 20.75,11.5 20.75,12C20.75,12.5 20.53,12.9 20.18,13.18L17.89,14.5L15.39,12L17.89,9.5L20.16,10.81M6.05,2.66L16.81,8.88L14.54,11.15L6.05,2.66Z" />
                  </svg>
                  {t('home.googlePlay')}
                </a>
              </Button>
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 shadow-hover" asChild>
                <a href="https://apps.apple.com" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2">
                  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z" />
                  </svg>
                  {t('home.appStore')}
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid gap-12 md:grid-cols-2 items-center max-w-6xl mx-auto">
            <div className="space-y-6">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">
                {t('home.whyChooseUs')}
              </h2>
              <div className="space-y-4">
                <div className="flex gap-3">
                  <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{t('home.authenticPapers')}</h3>
                    <p className="text-muted-foreground">
                      {t('home.authenticPapersDesc')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{t('home.freeToUse')}</h3>
                    <p className="text-muted-foreground">
                      {t('home.freeToUseDesc')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{t('home.comprehensiveCoverage')}</h3>
                    <p className="text-muted-foreground">
                      {t('home.comprehensiveCoverageDesc')}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <CheckCircle className="h-6 w-6 text-primary flex-shrink-0 mt-1" />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{t('home.smartSearch')}</h3>
                    <p className="text-muted-foreground">
                      {t('home.smartSearchDesc')}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <Card className="shadow-hover">
              <CardHeader>
                <CardTitle className="text-2xl">{t('home.readyToStart')}</CardTitle>
                <CardDescription className="text-base">
                  {t('home.joinStudents')}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button size="lg" className="w-full bg-primary hover:bg-primary-dark" asChild>
                  <Link to="/signup">{t('home.createFreeAccount')}</Link>
                </Button>
                <Button size="lg" variant="outline" className="w-full" asChild>
                  <Link to="/papers">
                    <Search className="mr-2 h-4 w-4" />
                    {t('home.explorePapers')}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-2">
              <img src={punziloLogo} alt="Punzilo" className="h-8 w-8" />
              <span className="text-lg font-bold text-foreground">Punzilo</span>
            </div>
            <p className="text-sm text-muted-foreground text-center">
              © 2025 Punzilo. {t('home.footerText')}
            </p>
            <div className="flex gap-4">
              <Link to="/papers" className="text-sm text-muted-foreground hover:text-primary">
                {t('home.browse')}
              </Link>
              <Link to="/login" className="text-sm text-muted-foreground hover:text-primary">
                {t('nav.login')}
              </Link>
              <Link to="/signup" className="text-sm text-muted-foreground hover:text-primary">
                {t('nav.signup')}
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
