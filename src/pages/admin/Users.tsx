import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAdmin } from "@/hooks/useAdmin";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function AdminUsers() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [gradeFilter, setGradeFilter] = useState<string>("all");

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    if (isAdmin) {
      loadUsers();
    }
  }, [isAdmin, gradeFilter]);

  const loadUsers = async () => {
    setLoading(true);

    let query = supabase.from("profiles").select("*");

    if (gradeFilter !== "all") {
      query = query.eq("grade_level", gradeFilter as "Seven" | "Nine" | "Twelve");
    }

    const { data: profilesData } = await query;

    if (profilesData) {
      // Get attempt counts for each user
      const usersWithStats = await Promise.all(
        profilesData.map(async (profile) => {
          const { count } = await supabase
            .from("user_attempts")
            .select("*", { count: "exact", head: true })
            .eq("user_id", profile.id);

          return {
            ...profile,
            attemptCount: count || 0,
          };
        })
      );

      setUsers(usersWithStats);
    }

    setLoading(false);
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">User Analytics</h1>
          <p className="text-muted-foreground">View all registered users and their activity</p>
        </div>

        {/* Grade Filter */}
        <Card className="mb-6 shadow-soft">
          <CardHeader>
            <CardTitle>Filter by Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={gradeFilter} onValueChange={setGradeFilter}>
              <SelectTrigger className="w-full md:w-64">
                <SelectValue placeholder="All Grades" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Grades</SelectItem>
                <SelectItem value="Seven">Grade 7</SelectItem>
                <SelectItem value="Nine">Grade 9</SelectItem>
                <SelectItem value="Twelve">Grade 12</SelectItem>
                <SelectItem value="GCE">GCE</SelectItem>
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Users ({users.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left p-4 font-medium">Name</th>
                    <th className="text-left p-4 font-medium">School</th>
                    <th className="text-left p-4 font-medium">Grade Level</th>
                    <th className="text-left p-4 font-medium">Attempts</th>
                    <th className="text-left p-4 font-medium">Joined</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user) => (
                    <tr key={user.id} className="border-b hover:bg-muted/50">
                      <td className="p-4">{user.name || "Not set"}</td>
                      <td className="p-4">{user.school_name || "Not set"}</td>
                      <td className="p-4">
                        {user.grade_level === "Seven"
                          ? "Grade 7"
                          : user.grade_level === "Nine"
                          ? "Grade 9"
                          : "Grade 12"}
                      </td>
                      <td className="p-4">{user.attemptCount}</td>
                      <td className="p-4 text-sm text-muted-foreground">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
