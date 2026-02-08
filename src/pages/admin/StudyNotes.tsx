import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Pencil, Plus, Trash2, FileText, Image } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";

const AdminStudyNotes = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [notes, setNotes] = useState<any[]>([]);
  const [topics, setTopics] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [filterTopic, setFilterTopic] = useState<string>("all");
  const [filterSubject, setFilterSubject] = useState<string>("all");
  const [formData, setFormData] = useState({
    title: "",
    content: "",
    topic_id: "",
    image_urls: [] as string[],
    display_order: 0,
  });
  const [newImageUrl, setNewImageUrl] = useState("");

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  useEffect(() => {
    if (filterSubject !== "all") {
      loadTopicsBySubject(filterSubject);
    } else {
      loadTopics();
    }
  }, [filterSubject]);

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

    loadNotes();
    loadTopics();
    loadSubjects();
  };

  const loadNotes = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("study_notes")
      .select("*, topics(name, subject_id, subjects(name, grade_level))")
      .order("display_order");

    if (error) {
      toast({
        title: "Error loading notes",
        description: error.message,
        variant: "destructive",
      });
    } else if (data) {
      setNotes(data);
    }
    setLoading(false);
  };

  const loadTopics = async () => {
    const { data } = await supabase
      .from("topics")
      .select("*, subjects(name, grade_level)")
      .order("name");
    if (data) setTopics(data);
  };

  const loadTopicsBySubject = async (subjectId: string) => {
    const { data } = await supabase
      .from("topics")
      .select("*, subjects(name, grade_level)")
      .eq("subject_id", subjectId)
      .order("name");
    if (data) setTopics(data);
  };

  const loadSubjects = async () => {
    const { data } = await supabase
      .from("subjects")
      .select("*")
      .order("name");
    if (data) setSubjects(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.content || !formData.topic_id) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    const noteData = {
      title: formData.title,
      content: formData.content,
      topic_id: formData.topic_id,
      image_urls: formData.image_urls,
      display_order: formData.display_order,
    };

    if (editingNote) {
      const { error } = await supabase
        .from("study_notes")
        .update(noteData)
        .eq("id", editingNote.id);

      if (error) {
        toast({
          title: "Error updating note",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Study note updated successfully",
        });
        loadNotes();
        closeDialog();
      }
    } else {
      const { error } = await supabase.from("study_notes").insert([noteData]);

      if (error) {
        toast({
          title: "Error creating note",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Success",
          description: "Study note created successfully",
        });
        loadNotes();
        closeDialog();
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this note?")) return;

    const { error } = await supabase.from("study_notes").delete().eq("id", id);

    if (error) {
      toast({
        title: "Error deleting note",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "Study note deleted successfully",
      });
      loadNotes();
    }
  };

  const openDialog = (note: any = null) => {
    if (note) {
      setEditingNote(note);
      setFormData({
        title: note.title,
        content: note.content,
        topic_id: note.topic_id,
        image_urls: note.image_urls || [],
        display_order: note.display_order || 0,
      });
    } else {
      setEditingNote(null);
      setFormData({
        title: "",
        content: "",
        topic_id: "",
        image_urls: [],
        display_order: 0,
      });
    }
    setNewImageUrl("");
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditingNote(null);
    setFormData({
      title: "",
      content: "",
      topic_id: "",
      image_urls: [],
      display_order: 0,
    });
    setNewImageUrl("");
  };

  const addImageUrl = () => {
    if (newImageUrl.trim()) {
      setFormData({
        ...formData,
        image_urls: [...formData.image_urls, newImageUrl.trim()],
      });
      setNewImageUrl("");
    }
  };

  const removeImageUrl = (index: number) => {
    setFormData({
      ...formData,
      image_urls: formData.image_urls.filter((_, i) => i !== index),
    });
  };

  const filteredNotes = notes.filter((note) => {
    if (filterTopic !== "all" && note.topic_id !== filterTopic) return false;
    if (filterSubject !== "all" && note.topics?.subject_id !== filterSubject) return false;
    return true;
  });

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
          <h1 className="text-3xl font-bold">Manage Study Notes</h1>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => openDialog()}>
                <Plus className="h-4 w-4 mr-2" />
                Add Study Note
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingNote ? "Edit Study Note" : "Add New Study Note"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="topic">Topic *</Label>
                  <Select
                    value={formData.topic_id}
                    onValueChange={(value) =>
                      setFormData({ ...formData, topic_id: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select topic" />
                    </SelectTrigger>
                    <SelectContent>
                      {topics.map((topic) => (
                        <SelectItem key={topic.id} value={topic.id}>
                          {topic.name} ({topic.subjects?.name} - {topic.subjects?.grade_level})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="title">Title *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="Enter note title"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="content">Content *</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) =>
                      setFormData({ ...formData, content: e.target.value })
                    }
                    placeholder="Enter study note content..."
                    className="min-h-[200px]"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="order">Display Order</Label>
                  <Input
                    id="order"
                    type="number"
                    value={formData.display_order}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        display_order: parseInt(e.target.value) || 0,
                      })
                    }
                    placeholder="0"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Lower numbers appear first
                  </p>
                </div>

                <div>
                  <Label>Images</Label>
                  <div className="flex gap-2 mb-2">
                    <Input
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      placeholder="Enter image URL"
                    />
                    <Button type="button" variant="outline" onClick={addImageUrl}>
                      <Image className="h-4 w-4 mr-1" />
                      Add
                    </Button>
                  </div>
                  {formData.image_urls.length > 0 && (
                    <div className="space-y-2">
                      {formData.image_urls.map((url, index) => (
                        <div
                          key={index}
                          className="flex items-center gap-2 p-2 bg-muted rounded"
                        >
                          <img
                            src={url}
                            alt={`Preview ${index + 1}`}
                            className="h-10 w-10 object-cover rounded"
                          />
                          <span className="flex-1 text-sm truncate">{url}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeImageUrl(index)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button type="button" variant="outline" onClick={closeDialog}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingNote ? "Update" : "Create"}
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div>
            <Label htmlFor="filterSubject">Filter by Subject</Label>
            <Select value={filterSubject} onValueChange={setFilterSubject}>
              <SelectTrigger>
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
          <div>
            <Label htmlFor="filterTopic">Filter by Topic</Label>
            <Select value={filterTopic} onValueChange={setFilterTopic}>
              <SelectTrigger>
                <SelectValue placeholder="All topics" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All topics</SelectItem>
                {topics.map((topic) => (
                  <SelectItem key={topic.id} value={topic.id}>
                    {topic.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4">
          {filteredNotes.map((note) => (
            <Card key={note.id} className="p-4">
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <FileText className="h-4 w-4 text-primary shrink-0" />
                    <h3 className="font-semibold text-lg truncate">{note.title}</h3>
                  </div>
                  <p className="text-sm text-muted-foreground mb-2">
                    {note.topics?.name} • {note.topics?.subjects?.name} • {note.topics?.subjects?.grade_level}
                  </p>
                  <p className="text-sm text-foreground/80 line-clamp-2">
                    {note.content}
                  </p>
                  {note.image_urls && note.image_urls.length > 0 && (
                    <Badge variant="outline" className="mt-2">
                      <Image className="h-3 w-3 mr-1" />
                      {note.image_urls.length} image(s)
                    </Badge>
                  )}
                </div>
                <div className="flex gap-2 ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openDialog(note)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => handleDelete(note.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </Card>
          ))}
          {filteredNotes.length === 0 && (
            <Card className="p-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No study notes found. Click "Add Study Note" to create one.</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminStudyNotes;
