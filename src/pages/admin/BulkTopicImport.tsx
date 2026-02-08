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

export default function BulkTopicImport() {
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
      if (!data.topics || !Array.isArray(data.topics)) {
        throw new Error("JSON must contain a 'topics' array");
      }

      let totalTopics = 0;

      // Process each topic
      for (const topic of data.topics) {
        const { error: topicError } = await supabase
          .from("topics")
          .insert({
            name: topic.name,
            subject_id: topic.subject_id,
          });

        if (topicError) throw topicError;
        totalTopics++;
      }

      toast({
        title: "Import Successful",
        description: `Imported ${totalTopics} topic(s)`,
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
    topics: [
      {
        name: "Algebra",
        subject_id: "uuid-of-subject",
      },
      {
        name: "Geometry",
        subject_id: "uuid-of-subject",
      },
      {
        name: "Trigonometry",
        subject_id: "uuid-of-subject",
      }
    ]
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Bulk Topic Import</h1>
          <p className="text-muted-foreground">
            Import multiple topics using JSON format
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
                Use this format for your JSON data. All topics will be imported.
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
                  <li><strong>name:</strong> The name of the topic (required)</li>
                  <li><strong>subject_id:</strong> UUID of the subject this topic belongs to (required)</li>
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