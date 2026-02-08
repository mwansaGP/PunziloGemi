import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useAdmin } from "@/hooks/useAdmin";
import { toast } from "sonner";
import { Globe, CheckCircle2, XCircle, Loader2, RefreshCw, Save, Trash2 } from "lucide-react";

interface ApiConfig {
  id: string;
  name: string;
  rootUrl: string;
  status: "connected" | "disconnected" | "checking" | "unknown";
  lastChecked?: Date;
}

export default function AdminApiManagement() {
  const { isAdmin, loading: adminLoading } = useAdmin();
  const navigate = useNavigate();
  const [apis, setApis] = useState<ApiConfig[]>([]);
  const [newApiName, setNewApiName] = useState("");
  const [newApiUrl, setNewApiUrl] = useState("");
  const [isAdding, setIsAdding] = useState(false);

  useEffect(() => {
    if (!adminLoading && !isAdmin) {
      navigate("/dashboard");
    }
  }, [isAdmin, adminLoading, navigate]);

  useEffect(() => {
    // Load saved APIs from localStorage
    const savedApis = localStorage.getItem("admin_api_configs");
    if (savedApis) {
      const parsed = JSON.parse(savedApis);
      setApis(parsed.map((api: ApiConfig) => ({ ...api, status: "unknown" })));
    }
  }, []);

  const saveApisToStorage = (apiList: ApiConfig[]) => {
    localStorage.setItem("admin_api_configs", JSON.stringify(apiList));
  };

  const checkApiConnection = async (apiId: string) => {
    // Get the api from current state first
    let apiToCheck: ApiConfig | undefined;
    
    setApis(prev => {
      apiToCheck = prev.find(a => a.id === apiId);
      return prev.map(api => 
        api.id === apiId ? { ...api, status: "checking" } : api
      );
    });

    // Wait for state update
    await new Promise(resolve => setTimeout(resolve, 0));
    
    if (!apiToCheck) return;
    
    const api = apiToCheck;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout

    try {
      // Try to fetch the root URL with a health check endpoint
      const response = await fetch(`${api.rootUrl}/health`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (response.ok) {
        const data = await response.json().catch(() => ({}));
        setApis(prev => prev.map(a => 
          a.id === apiId ? { ...a, status: "connected", lastChecked: new Date() } : a
        ));
        toast.success(`${api.name} is connected!${data.status ? ` Status: ${data.status}` : ""}`);
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      
      // Try without /health endpoint
      const controller2 = new AbortController();
      const timeoutId2 = setTimeout(() => controller2.abort(), 10000);
      
      try {
        const response = await fetch(api.rootUrl, {
          method: "GET",
          signal: controller2.signal,
        });

        clearTimeout(timeoutId2);

        if (response.ok || response.status < 500) {
          setApis(prev => prev.map(a => 
            a.id === apiId ? { ...a, status: "connected", lastChecked: new Date() } : a
          ));
          toast.success(`${api.name} is reachable!`);
        } else {
          throw new Error(`HTTP ${response.status}`);
        }
      } catch (innerError) {
        clearTimeout(timeoutId2);
        setApis(prev => prev.map(a => 
          a.id === apiId ? { ...a, status: "disconnected", lastChecked: new Date() } : a
        ));
        const errorMessage = innerError instanceof Error && innerError.name === "AbortError" 
          ? "Connection timed out" 
          : "Failed to connect";
        toast.error(`${api.name}: ${errorMessage}`);
      }
    }
  };

  const handleAddApi = () => {
    if (!newApiName.trim() || !newApiUrl.trim()) {
      toast.error("Please enter both API name and URL");
      return;
    }

    // Validate URL format
    try {
      new URL(newApiUrl);
    } catch {
      toast.error("Please enter a valid URL");
      return;
    }

    const newApi: ApiConfig = {
      id: Date.now().toString(),
      name: newApiName.trim(),
      rootUrl: newApiUrl.trim().replace(/\/$/, ""), // Remove trailing slash
      status: "unknown",
    };

    const updatedApis = [...apis, newApi];
    setApis(updatedApis);
    saveApisToStorage(updatedApis);
    setNewApiName("");
    setNewApiUrl("");
    setIsAdding(false);
    toast.success("API endpoint added successfully");
  };

  const handleDeleteApi = (apiId: string) => {
    const updatedApis = apis.filter(api => api.id !== apiId);
    setApis(updatedApis);
    saveApisToStorage(updatedApis);
    toast.success("API endpoint removed");
  };

  const handleCheckAll = () => {
    apis.forEach(api => checkApiConnection(api.id));
  };

  const getStatusBadge = (status: ApiConfig["status"]) => {
    switch (status) {
      case "connected":
        return (
          <Badge className="bg-green-500/10 text-green-600 border-green-500/20">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Connected
          </Badge>
        );
      case "disconnected":
        return (
          <Badge variant="destructive" className="bg-destructive/10 text-destructive border-destructive/20">
            <XCircle className="h-3 w-3 mr-1" />
            Disconnected
          </Badge>
        );
      case "checking":
        return (
          <Badge variant="secondary">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Checking...
          </Badge>
        );
      default:
        return (
          <Badge variant="outline">
            Unknown
          </Badge>
        );
    }
  };

  if (adminLoading) {
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
            <h1 className="text-3xl font-bold text-foreground mb-2">API Management</h1>
            <p className="text-muted-foreground">Configure and monitor external API connections</p>
          </div>
          {apis.length > 0 && (
            <Button onClick={handleCheckAll} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Check All
            </Button>
          )}
        </div>

        {/* Add New API */}
        <Card className="mb-8 shadow-soft">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Globe className="h-5 w-5" />
              Add API Endpoint
            </CardTitle>
            <CardDescription>Add a new external API to monitor</CardDescription>
          </CardHeader>
          <CardContent>
            {isAdding ? (
              <div className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="api-name">API Name</Label>
                    <Input
                      id="api-name"
                      placeholder="e.g., Essay Grading API"
                      value={newApiName}
                      onChange={(e) => setNewApiName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="api-url">Root URL</Label>
                    <Input
                      id="api-url"
                      placeholder="e.g., https://api.example.com"
                      value={newApiUrl}
                      onChange={(e) => setNewApiUrl(e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddApi}>
                    <Save className="h-4 w-4 mr-2" />
                    Save API
                  </Button>
                  <Button variant="outline" onClick={() => {
                    setIsAdding(false);
                    setNewApiName("");
                    setNewApiUrl("");
                  }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setIsAdding(true)}>
                Add New API Endpoint
              </Button>
            )}
          </CardContent>
        </Card>

        {/* API List */}
        <Card className="shadow-soft">
          <CardHeader>
            <CardTitle>Configured APIs</CardTitle>
            <CardDescription>
              {apis.length === 0 
                ? "No APIs configured yet" 
                : `${apis.length} API endpoint${apis.length > 1 ? "s" : ""} configured`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {apis.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <Globe className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No API endpoints configured</p>
                <p className="text-sm">Click "Add New API Endpoint" to get started</p>
              </div>
            ) : (
              <div className="space-y-4">
                {apis.map((api) => (
                  <div 
                    key={api.id} 
                    className="flex items-center justify-between p-4 border rounded-lg bg-card"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-medium truncate">{api.name}</h3>
                        {getStatusBadge(api.status)}
                      </div>
                      <p className="text-sm text-muted-foreground truncate">{api.rootUrl}</p>
                      {api.lastChecked && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Last checked: {new Date(api.lastChecked).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2 ml-4">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => checkApiConnection(api.id)}
                        disabled={api.status === "checking"}
                      >
                        {api.status === "checking" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDeleteApi(api.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
