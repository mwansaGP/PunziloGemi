import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import Dashboard from "./pages/Dashboard";
import Settings from "./pages/Settings";
import Papers from "./pages/Papers";
import Topics from "./pages/Topics";
import Study from "./pages/Study";

import TopicPractice from "./pages/TopicPractice";
import TopicPracticeComplete from "./pages/TopicPracticeComplete";
import PaperView from "./pages/PaperView";
import ExamAttempt from "./pages/ExamAttempt";
import ExamComplete from "./pages/ExamComplete";
import ExamHistory from "./pages/ExamHistory";
import NotFound from "./pages/NotFound";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminUsers from "./pages/admin/Users";
import AdminSubjects from "./pages/admin/Subjects";
import AdminPapers from "./pages/admin/Papers";
import AdminQuestions from "./pages/admin/Questions";
import AdminTopics from "./pages/admin/Topics";
import AdminBulkImport from "./pages/admin/BulkImport";
import AdminBulkTopicImport from "./pages/admin/BulkTopicImport";
import AdminApiManagement from "./pages/admin/ApiManagement";
import AdminStudyNotes from "./pages/admin/StudyNotes";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/settings" element={<Settings />} />
          <Route path="/papers" element={<Papers />} />
          <Route path="/topics" element={<Topics />} />
          <Route path="/study" element={<Study />} />
          
          <Route path="/topic-practice/:id" element={<TopicPractice />} />
          <Route path="/topic-practice/:id/complete" element={<TopicPracticeComplete />} />
          <Route path="/papers/:id" element={<PaperView />} />
          <Route path="/exam/:id" element={<ExamAttempt />} />
          <Route path="/exam-complete" element={<ExamComplete />} />
          <Route path="/exam-history" element={<ExamHistory />} />
          <Route path="/admin/dashboard" element={<AdminDashboard />} />
          <Route path="/admin/users" element={<AdminUsers />} />
          <Route path="/admin/subjects" element={<AdminSubjects />} />
          <Route path="/admin/papers" element={<AdminPapers />} />
          <Route path="/admin/questions" element={<AdminQuestions />} />
          <Route path="/admin/topics" element={<AdminTopics />} />
          <Route path="/admin/bulk-import" element={<AdminBulkImport />} />
          <Route path="/admin/bulk-topic-import" element={<AdminBulkTopicImport />} />
          <Route path="/admin/api-management" element={<AdminApiManagement />} />
          <Route path="/admin/study-notes" element={<AdminStudyNotes />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
