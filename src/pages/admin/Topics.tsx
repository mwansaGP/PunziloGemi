import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Trash2, Upload } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Navigation } from "@/components/Navigation";

const AdminTopics = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [topics, setTopics] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTopic, setEditingTopic] = useState<any>(null);
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [formData, setFormData] = useState({
    name: "",
    subject_id: "",
  });

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  const checkAuthAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      navigate("/login");
      return;
    }

    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", session.user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      navigate("/dashboard");
      return;
    }

    loadTopics();
    loadSubjects();
  };

  const loadTopics = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("topics")
      .select("*, subjects(name, grade_level)")
      .order("name");

    if (error) {
      toast({
        title: "Error loading topics",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      setTopics(data);
    }
    setLoading(false);
  };

  const loadSubjects = async () => {
    const { data, error } = await supabase
      .from("subjects")
      .select("*")
      .order("name");

    if (error) {
      toast({
        title: "Error loading subjects",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      setSubjects(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name || !formData.subject_id) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    if (editingTopic) {
      const { error } = await supabase
        .from("topics")
        .update({ name: formData.name, subject_id: formData.subject_id })
        .eq("id", editingTopic.id);

      if (error) {
        toast({
          title: "Error updating topic",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Topic updated successfully",
        });
        loadTopics();
        setDialogOpen(false);
        setEditingTopic(null);
        setFormData({ name: "", subject_id: "" });
      }
    } else {
      const { error } = await supabase
        .from("topics")
        .insert([{ name: formData.name, subject_id: formData.subject_id }]);

      if (error) {
        toast({
          title: "Error creating topic",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Topic created successfully",
        });
        loadTopics();
        setDialogOpen(false);
        setFormData({ name: "", subject_id: "" });
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this topic?")) return;

    const { error } = await supabase.from("topics").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting topic",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Topic deleted successfully",
      });
      loadTopics();
    }
  };

  const openDialog = (topic: any = null) => {
    if (topic) {
      setEditingTopic(topic);
      setFormData({
        name: topic.name,
        subject_id: topic.subject_id,
      });
    } else {
      setEditingTopic(null);
      setFormData({ name: "", subject_id: "" });
    }
    setDialogOpen(true);
  };

  const filteredTopics = filterSubject === "all" 
    ? topics 
    : topics.filter(topic => topic.subject_id === filterSubject);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="container mx-auto p-6">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="container mx-auto p-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Manage Topics</h1>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => navigate("/admin/bulk-topic-import")}
            >
              <Upload className="h-4 w-4 mr-2" />
              Bulk Import
            </Button>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => openDialog()}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Topic
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingTopic ? "Edit Topic" : "Add New Topic"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <Label htmlFor="name">Topic Name</Label>
                    <Input
                      id="name"
                      value={formData.name}
                      onChange={(e) =>
                        setFormData({ ...formData, name: e.target.value })
                      }
                      placeholder="Enter topic name"
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="subject">Subject</Label>
                    <Select
                      value={formData.subject_id}
                      onValueChange={(value) =>
                        setFormData({ ...formData, subject_id: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjects.map((subject) => (
                          <SelectItem key={subject.id} value={subject.id}>
                            {subject.name} ({subject.grade_level})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingTopic ? "Update" : "Create"}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        <div className="mb-6">
          <Label htmlFor="filter">Filter by Subject</Label>
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-full md:w-64">
              <SelectValue placeholder="All subjects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All subjects</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name} ({subject.grade_level})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-4">
          {filteredTopics.map((topic) => (
            <Card key={topic.id} className="p-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold text-lg">{topic.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {topic.subjects?.name} • {topic.subjects?.grade_level}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDialog(topic)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(topic.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {filteredTopics.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              No topics found. Click "Add Topic" to create one.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminTopics;
