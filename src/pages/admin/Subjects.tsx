import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAdmin } from "@/hooks/useAdmin";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Trash2, Plus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export default function AdminSubjects() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<any>(null);
  const [formData, setFormData] = useState({
    name: "",
    grade_level: "Seven" as "Seven" | "Nine" | "Twelve" | "GCE",
    is_compulsory: false,
  });

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadSubjects();
    }
  }, [isAdmin]);

  const loadSubjects = async () => {
    setLoading(true);
    const { data } = await supabase.from("subjects").select("*").order("name");
    if (data) {
      setSubjects(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (editingSubject) {
      const { error } = await supabase
        .from("subjects")
        .update(formData)
        .eq("id", editingSubject.id);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to update subject",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Success", description: "Subject updated successfully" });
    } else {
      const { error } = await supabase.from("subjects").insert([formData]);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to create subject",
          variant: "destructive",
        });
        return;
      }

      toast({ title: "Success", description: "Subject created successfully" });
    }

    setDialogOpen(false);
    setEditingSubject(null);
    setFormData({ name: "", grade_level: "Seven", is_compulsory: false });
    loadSubjects();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this subject?")) return;

    const { error } = await supabase.from("subjects").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to delete subject",
        variant: "destructive",
      });
      return;
    }

    toast({ title: "Success", description: "Subject deleted successfully" });
    loadSubjects();
  };

  const openDialog = (subject?: any) => {
    if (subject) {
      setEditingSubject(subject);
      setFormData({
        name: subject.name,
        grade_level: subject.grade_level,
        is_compulsory: subject.is_compulsory,
      });
    } else {
      setEditingSubject(null);
      setFormData({ name: "", grade_level: "Seven", is_compulsory: false });
    }
    setDialogOpen(true);
  };

  if (adminLoading || loading) {
    return (
      <div className="min-h-screen bg-muted/30">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <Navigation />

      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground mb-2">Manage Subjects</h1>
            <p className="text-muted-foreground">Add, edit, or delete subjects</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()} className="bg-primary hover:bg-primary-dark">
                <Plus className="h-4 w-4 mr-2" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingSubject ? "Edit Subject" : "Add New Subject"}</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Subject Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="grade">Grade Level</Label>
                  <Select
                    value={formData.grade_level}
                    onValueChange={(value: "Seven" | "Nine" | "Twelve" | "GCE") =>
                      setFormData({ ...formData, grade_level: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Seven">Grade 7</SelectItem>
                      <SelectItem value="Nine">Grade 9</SelectItem>
                      <SelectItem value="Twelve">Grade 12</SelectItem>
                      <SelectItem value="GCE">GCE</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="compulsory"
                    checked={formData.is_compulsory}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_compulsory: checked === true })
                    }
                  />
                  <Label htmlFor="compulsory">Compulsory Subject</Label>
                </div>
                <Button type="submit" className="w-full">
                  {editingSubject ? "Update" : "Create"} Subject
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>All Subjects ({subjects.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {subjects.map((subject) => (
                <div
                  key={subject.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50"
                >
                  <div>
                    <h3 className="font-medium">{subject.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {subject.grade_level === "Seven"
                        ? "Grade 7"
                        : subject.grade_level === "Nine"
                        ? "Grade 9"
                        : subject.grade_level === "Twelve"
                        ? "Grade 12"
                        : "GCE"}{" "}
                      • {subject.is_compulsory ? "Compulsory" : "Optional"}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openDialog(subject)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(subject.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
