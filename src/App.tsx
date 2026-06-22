import React, { lazy } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate, useParams } from "react-router-dom";
import { AuthProvider, useAuth } from "./hooks/useAuth";
import Layout from "./components/Layout";
import AdminLayout from "./components/AdminLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import PersonalDashboard from "./pages/PersonalDashboard";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ResetPassword from "./pages/ResetPassword";
import NotFound from "./pages/NotFound";
import Unauthorized from "./pages/Unauthorized";
import ActionsTasks from "./pages/ActionsTasks";
import TaskViewPage from "./pages/bd/TaskViewPage";
import MyTasksPage from "./pages/bd/MyTasksPage";
import EODSubmission from "./pages/EODSubmission";
import MyEODSubmissions from "./pages/MyEODSubmissions";
import DHSSubmission from "./pages/DHSSubmission";
import MyDHSSubmissions from "./pages/MyDHSSubmissions";
import UserManagement from "./pages/admin/UserManagement";
import IntegrationManager from "./pages/admin/IntegrationManager";
import PerplexityIntegration from "./pages/admin/PerplexityIntegration";
import AdminSettings from "./pages/admin/AdminSettings";
import EODManagement from "./pages/admin/EODManagement";
import DHSManagement from "./pages/admin/DHSManagement";
import UserDetail from "./pages/admin/UserDetail";
import AdminPanel from "./pages/admin/AdminPanel";
import BDManagerReports from "./pages/admin/BDManagerReports";
import UsageAnalytics from "./pages/admin/UsageAnalytics";
import UsageAnalyticsTeam from "./pages/admin/UsageAnalyticsTeam";
import UsageAnalyticsMemberDetail from "./pages/admin/UsageAnalyticsMemberDetail";
import AnalyticsApiConsumers from "./pages/admin/AnalyticsApiConsumers";

import UserProfile from "./pages/UserProfile";
import NicheManagement from "./pages/bd/NicheManagement";
import CampaignManagement from "./pages/bd/CampaignManagement";
import CampaignDetail from "./pages/bd/CampaignDetail";
import CampaignTasksPage from "./pages/bd/CampaignTasksPage";
import SequenceManagement from "./pages/bd/SequenceManagement";
import CampaignContactDetail from "./pages/bd/CampaignContactDetail";
import CompanyDetail from "./pages/bd/CompanyDetail";
import PODManagement from "./pages/admin/PODManagement";

import Prospecting from "./pages/bd/pipeline/Prospecting";
import Qualification from "./pages/bd/pipeline/Qualification";
import Proposal from "./pages/bd/pipeline/Proposal";
import ProposalManagement from "./pages/bd/ProposalManagement";
import ProposalAnalytics from "./pages/bd/ProposalAnalytics";
import PerformanceReports from "./pages/bd/PerformanceReports";
import Negotiation from "./pages/bd/pipeline/Negotiation";
import Clients from "./pages/bd/pipeline/Clients";
import BusinessOpportunities from "./pages/BusinessOpportunities";
import BDDashboard from "./pages/bd/Dashboard";
import ProductManagement from "./pages/bd/ProductManagement";
import FollowUps from "./pages/bd/FollowUps";
import UserSettings from "./pages/bd/UserSettings";
import AutomationSettings from "./pages/admin/AutomationSettings";
import LinkedInAgentConfig from "./pages/admin/LinkedInAgentConfig";
import LLMConfig from "./pages/admin/ai/LLMConfig";
import AIAgents from "./pages/AIAgents";
import AIChat from "./pages/AIChat";
import DealDetail from "./pages/bd/DealDetail";
import DealFiles from "./pages/bd/DealFiles";
import ClientDetail from "./pages/bd/ClientDetail";
import ChecklistTemplateManager from "./pages/admin/ChecklistTemplateManager";
import DataSyncCenter from "./pages/admin/DataSyncCenter";
import SQLQueryExecutor from "./pages/admin/SQLQueryExecutor";
import LeadDetail from "./pages/bd/LeadDetail";
import AnalyticsDashboard from "./pages/analytics/Dashboard";
import TeamPerformance from "./pages/analytics/TeamPerformance";
import CampaignROI from "./pages/bd/CampaignROI";
import TestEmailPage from "./pages/TestEmailPage";
import SigningDocuments from "./pages/bd/SigningDocuments";
import SigningDocumentDetail from "./pages/bd/SigningDocumentDetail";
import NotificationsPage from "./pages/NotificationsPage";
import AccountabilityChart from "./pages/bd/AccountabilityChart";
import AccountabilityGoalDetail from "./pages/bd/AccountabilityGoalDetail";

const queryClient = new QueryClient();

// Lazy load Documentation, Feedback, and Vision pages
const Documentation = lazy(() => import("./pages/admin/Documentation"));
const FeedbackSubmitPage = lazy(() => import("./pages/feedback/SubmitFeedback"));
const FeedbackDashboard = lazy(() => import("./pages/feedback/FeedbackDashboard"));
const FeedbackDetailPage = lazy(() => import("./pages/feedback/FeedbackDetail"));
const CampaignImportHistory = lazy(() => import("./pages/bd/CampaignImportHistory"));
const Vision = lazy(() => import("./pages/Vision"));

// Smart redirect component - send everyone to BD Dashboard
function DashboardRedirect() {
  const { user } = useAuth();

  if (!user) return <Navigate to="/login" replace />;

  // All users go to BD Dashboard as main entry point
  return <Navigate to="/bd/dashboard" replace />;
}

function TaskViewRedirect() {
  const { taskId } = useParams<{ taskId: string }>();
  return <Navigate to={`/bd/actions/tasks/${taskId}`} replace />;
}

function FeedbackAdminRedirect() {
  const { id } = useParams<{ id: string }>();
  return <Navigate to={`/feedback/${id}`} replace />;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/unauthorized" element={<Unauthorized />} />
            <Route path="/" element={<DashboardRedirect />} />
            <Route path="/dashboard" element={<DashboardRedirect />} />
            
            {/* Global User Profile Route */}
            <Route path="/my-profile" element={
              <ProtectedRoute requiredMinimumRole="team_member">
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<UserProfile />} />
            </Route>
            
            {/* Personal Performance Dashboard */}
            <Route path="/my-performance" element={
              <ProtectedRoute requiredMinimumRole="team_member">
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<PersonalDashboard />} />
            </Route>
            
            {/* Admin Panel Routes - Admin and Super Admin */}
            <Route path="/adminpanel/*" element={
              <ProtectedRoute requiredMinimumRole="admin">
                <AdminLayout />
              </ProtectedRoute>
            }>
              <Route index element={<AdminPanel />} />
              <Route path="feedback" element={<Navigate to="/feedback" replace />} />
              <Route path="feedback/:id" element={<FeedbackAdminRedirect />} />
              <Route path="users" element={<UserManagement />} />
              <Route path="users/:userId" element={<UserDetail />} />
              <Route path="integrations" element={<IntegrationManager />} />
              <Route path="data-sync" element={<DataSyncCenter />} />
              <Route path="integrations/control-tower-sync" element={<Navigate to="/adminpanel/data-sync" replace />} />
              <Route path="documentation" element={<React.Suspense fallback={<div>Loading...</div>}><Documentation /></React.Suspense>} />
              <Route path="settings" element={<AdminSettings />} />
              <Route path="eod-management" element={<EODManagement />} />
              <Route path="dhs-management" element={<DHSManagement />} />
              <Route path="pods" element={<PODManagement />} />
              <Route path="ai/agents" element={<LinkedInAgentConfig />} />
              <Route path="ai/agent-manager" element={<AIAgents />} />
              <Route path="ai/llm-config" element={<LLMConfig />} />
              <Route path="ai/chat" element={<AIChat />} />
              <Route path="bd-reports" element={<BDManagerReports />} />
              <Route path="usage-analytics" element={<UsageAnalytics />} />
              <Route path="usage-analytics/members" element={<UsageAnalyticsTeam />} />
              <Route path="usage-analytics/members/:userId" element={<UsageAnalyticsMemberDetail />} />
              <Route path="analytics-api-consumers" element={<AnalyticsApiConsumers />} />
              <Route path="strategy/products" element={<ProductManagement />} />
              <Route path="strategy/niches" element={<NicheManagement />} />
              <Route path="strategy/checklist-templates" element={<ChecklistTemplateManager />} />
              <Route path="sql-executor" element={<SQLQueryExecutor />} />
            </Route>

            {/* Feedback Module */}
            <Route path="/feedback/*" element={
              <ProtectedRoute requiredMinimumRole="team_member">
                <Layout />
              </ProtectedRoute>
            }>
              <Route
                index
                element={<React.Suspense fallback={<div>Loading...</div>}><FeedbackDashboard /></React.Suspense>}
              />
              <Route
                path="submit"
                element={<React.Suspense fallback={<div>Loading...</div>}><FeedbackSubmitPage /></React.Suspense>}
              />
              <Route
                path=":id"
                element={<React.Suspense fallback={<div>Loading...</div>}><FeedbackDetailPage /></React.Suspense>}
              />
            </Route>

            {/* Vision Module */}
            <Route path="/vision" element={
              <ProtectedRoute requiredMinimumRole="team_member">
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<React.Suspense fallback={<div>Loading...</div>}><Vision /></React.Suspense>} />
            </Route>

            {/* Legacy Task Routes */}
            <Route
              path="/actions/tasks"
              element={<Navigate to="/bd/actions/tasks" replace />}
            />
            <Route
              path="/actions/tasks/:taskId"
              element={<TaskViewRedirect />}
            />

            {/* BD Portal Routes - Available to all users */}
            <Route path="/bd/*" element={
              <ProtectedRoute requiredMinimumRole="team_member">
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/bd/dashboard" replace />} />
              <Route path="dashboard" element={<BDDashboard />} />
              
              {/* Legacy route - redirect to dashboard */}
              <Route path="my-agents" element={<Navigate to="/bd/dashboard" replace />} />
              
              {/* Redirect old campaign URLs */}
              <Route path="strategy/campaigns" element={<Navigate to="/campaigns" replace />} />
              <Route path="strategy/campaigns/:campaignId" element={<Navigate to="/campaigns" replace />} />
              
              {/* Performance */}
              <Route path="performance/personal" element={<PersonalDashboard />} />
              <Route path="performance/reports" element={<PerformanceReports />} />
              
              {/* Actions */}
              <Route path="actions/tasks" element={<ActionsTasks />} />
              <Route path="actions/my-tasks" element={<MyTasksPage />} />
              <Route path="actions/tasks/:taskId" element={<TaskViewPage />} />
              <Route path="actions/eod" element={<EODSubmission />} />
              <Route path="actions/eod-history" element={<MyEODSubmissions />} />
              <Route path="actions/dhs" element={<DHSSubmission />} />
              <Route path="actions/dhs-history" element={<MyDHSSubmissions />} />

              {/* Notifications */}
              <Route path="notifications" element={<NotificationsPage />} />

              {/* Accountability Chart */}
              <Route path="accountability" element={<AccountabilityChart />} />
              <Route path="accountability/:goalId" element={<AccountabilityGoalDetail />} />

              {/* Admin */}
              <Route path="admin/documentation" element={<React.Suspense fallback={<div>Loading...</div>}><Documentation /></React.Suspense>} />
              <Route path="admin/settings" element={<UserSettings />} />
            </Route>

            {/* Business Opportunities */}
            <Route path="/business-opportunities" element={
              <ProtectedRoute requiredMinimumRole="team_member">
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<BusinessOpportunities />} />
            </Route>

            <Route
              path="/business-opportunities/deals/:slug"
              element={
                <ProtectedRoute requiredMinimumRole="team_member">
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DealDetail />} />
              <Route path="files" element={<DealFiles />} />
            </Route>

            {/* Legacy pipeline redirects */}
            <Route path="/prospecting" element={<Navigate to="/business-opportunities?tab=pipeline&stage=lead" replace />} />
            <Route path="/qualification" element={<Navigate to="/business-opportunities?tab=pipeline&stage=discovery" replace />} />
            <Route path="/proposal" element={<Navigate to="/business-opportunities?tab=pipeline&stage=estimation" replace />} />
            <Route path="/negotiation" element={<Navigate to="/business-opportunities?tab=pipeline&stage=proposal" replace />} />

            <Route path="/clients" element={
              <ProtectedRoute requiredMinimumRole="team_member">
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Clients />} />
            </Route>

<Route path="/clients/:slug" element={
  <ProtectedRoute requiredMinimumRole="team_member">
    <Layout />
  </ProtectedRoute>
}>
  <Route index element={<ClientDetail />} />
</Route>

<Route path="/clients/:clientSlug/intelligence" element={
  <ProtectedRoute requiredMinimumRole="manager">
    <React.Suspense fallback={<div>Loading...</div>}>
      {React.createElement(lazy(() => import("./pages/bd/ClientIntelligenceChat")))}
    </React.Suspense>
  </ProtectedRoute>
} />

{/* Follow-Ups Route */}
<Route path="/follow-ups" element={
  <ProtectedRoute requiredMinimumRole="team_member">
    <Layout />
  </ProtectedRoute>
}>
  <Route index element={<FollowUps />} />
</Route>

<Route path="/leads/:slug" element={
  <ProtectedRoute requiredMinimumRole="team_member">
    <Layout />
  </ProtectedRoute>
}>
  <Route index element={<LeadDetail />} />
</Route>
            
            <Route
              path="/:stage/:slug"
              element={
                <ProtectedRoute requiredMinimumRole="team_member">
                  <Layout />
                </ProtectedRoute>
              }
            >
              <Route index element={<DealDetail />} />
              <Route path="files" element={<DealFiles />} />
            </Route>

            {/* Analytics Routes */}
            <Route path="/analytics" element={<ProtectedRoute requiredMinimumRole="team_member"><AnalyticsDashboard /></ProtectedRoute>} />
            <Route path="/analytics/team" element={<ProtectedRoute requiredMinimumRole="manager"><TeamPerformance /></ProtectedRoute>} />
            
            {/* Campaigns at root level */}
            <Route path="/campaigns" element={
              <ProtectedRoute requiredMinimumRole="team_member">
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<CampaignManagement />} />
              <Route path="import-history" element={<React.Suspense fallback={<div>Loading...</div>}><CampaignImportHistory /></React.Suspense>} />
              <Route path=":slug" element={<CampaignDetail />} />
              <Route path=":slug/tasks" element={<CampaignTasksPage />} />
              <Route path=":slug/roi" element={<CampaignROI />} />
              <Route path=":campaignSlug/contacts/:contactSlug" element={<CampaignContactDetail />} />
            </Route>

            {/* Sequences */}
            <Route path="/sequences" element={
              <ProtectedRoute requiredMinimumRole="team_member">
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<SequenceManagement />} />
            </Route>

            {/* Test Email - for testing email automation system */}
            <Route path="/test-email" element={
              <ProtectedRoute requiredMinimumRole="team_member">
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<TestEmailPage />} />
            </Route>

            {/* Proposals */}
            <Route path="/proposals" element={
              <ProtectedRoute requiredMinimumRole="team_member">
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<ProposalManagement />} />
              <Route path="analytics" element={<ProposalAnalytics />} />
            </Route>

            {/* Signing Documents */}
            <Route path="/signing-documents" element={
              <ProtectedRoute requiredMinimumRole="team_member">
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<SigningDocuments />} />
              <Route path=":id" element={<SigningDocumentDetail />} />
            </Route>

            {/* Also support /bd/signing-documents path */}
            <Route path="/bd/signing-documents" element={
              <ProtectedRoute requiredMinimumRole="team_member">
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<SigningDocuments />} />
              <Route path=":id" element={<SigningDocumentDetail />} />
            </Route>

            {/* Companies */}
            <Route path="/companies/:slug" element={
              <ProtectedRoute requiredMinimumRole="team_member">
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<CompanyDetail />} />
            </Route>

            {/* Catch-all route */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
