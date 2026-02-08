import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import { useAdmin } from "@/hooks/useAdmin";
import { Loader2, Upload, FileJson } from "lucide-react";

export default function BulkImport() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAdmin, loading: adminLoading } = useAdmin();
  const [jsonInput, setJsonInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!isAdmin) {
    navigate("/");
    return null;
  }

  const handleImport = async () => {
    if (!jsonInput.trim()) {
      toast({
        title: "Error",
        description: "Please enter JSON data",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    try {
      const data = JSON.parse(jsonInput);

      // Validate structure
      if (!data.papers || !Array.isArray(data.papers)) {
        throw new Error("JSON must contain a 'papers' array");
      }

      let totalPapers = 0;
      let totalQuestions = 0;

      // Process each paper
      for (const paper of data.papers) {
        // Insert paper
        const { data: insertedPaper, error: paperError } = await supabase
          .from("past_papers")
          .insert({
            year: paper.year,
            subject_id: paper.subject_id,
            grade_level: paper.grade_level,
            paper_type: paper.paper_type || null,
            duration: paper.duration,
            total_score: paper.total_score,
            is_writable: paper.is_writable ?? true,
            name: paper.name,
          })
          .select()
          .single();

        if (paperError) throw paperError;
        totalPapers++;

        // Insert questions if they exist
        if (paper.questions && Array.isArray(paper.questions)) {
          for (const question of paper.questions) {
            const { error: questionError } = await supabase
              .from("questions")
              .insert({
                past_paper_id: insertedPaper.id,
                subject_id: question.subject_id,
                topic_id: question.topic_id || null,
                question_text: question.question_text,
                question_type: question.question_type,
                sample_answer: question.sample_answer || null,
                difficulty: question.difficulty || "Medium",
                question_number: question.question_number,
                marks: question.marks,
                image_url: question.image_url || null,
                options: question.options || null,
                correct_answer: question.correct_answer,
              });

            if (questionError) throw questionError;
            totalQuestions++;
          }
        }
      }

      toast({
        title: "Import Successful",
        description: `Imported ${totalPapers} paper(s) and ${totalQuestions} question(s)`,
      });

      setJsonInput("");
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Failed",
        description: error.message || "Invalid JSON format",
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const exampleFormat = {
    papers: [
      {
        name: "2023 Mathematics Paper 1",
        year: "2023",
        subject_id: "uuid-of-subject",
        grade_level: "Twelve",
        paper_type: "Paper1",
        duration: "180",
        total_score: 100,
        is_writable: true,
        questions: [
          {
            subject_id: "uuid-of-subject",
            topic_id: "uuid-of-topic-optional",
            question_text: "What is 2 + 2?",
            question_type: "MCQ",
            question_number: 1,
            marks: 1,
            difficulty: "Easy",
            options: ["3", "4", "5", "6"],
            correct_answer: ["4"],
            sample_answer: "The answer is 4 because 2 + 2 equals 4",
            image_url: "https://example.com/image.png"
          }
        ]
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Bulk Import</h1>
          <p className="text-muted-foreground">
            Import past papers and questions using JSON format
          </p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileJson className="h-5 w-5" />
                JSON Format Guide
              </CardTitle>
              <CardDescription>
                Use this format for your JSON data. All papers and their questions will be imported.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Alert>
                <AlertDescription className="font-mono text-xs whitespace-pre overflow-x-auto">
                  {JSON.stringify(exampleFormat, null, 2)}
                </AlertDescription>
              </Alert>
              <div className="mt-4 space-y-2 text-sm text-muted-foreground">
                <p><strong>Field Notes:</strong></p>
                <ul className="list-disc list-inside space-y-1">
                  <li><strong>grade_level:</strong> "Seven", "Nine", "Twelve", or "GCE"</li>
                  <li><strong>paper_type:</strong> "Paper1", "Paper2", "Paper3", or null</li>
                  <li><strong>question_type:</strong> "MCQ", "ShortAnswer", or "Essay"</li>
                  <li><strong>difficulty:</strong> "Easy", "Medium", or "Hard"</li>
                  <li><strong>options:</strong> Required for MCQ type, array of strings</li>
                  <li><strong>correct_answer:</strong> Array of strings (for MCQ, should match one or more options)</li>
                  <li><strong>topic_id, sample_answer, image_url:</strong> Optional fields</li>
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Import Data
              </CardTitle>
              <CardDescription>
                Paste your JSON data below and click import
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={jsonInput}
                onChange={(e) => setJsonInput(e.target.value)}
                placeholder="Paste your JSON data here..."
                className="min-h-[400px] font-mono text-sm"
              />
              <Button
                onClick={handleImport}
                disabled={isProcessing || !jsonInput.trim()}
                className="w-full"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Import JSON Data
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
