import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { FeaturesProvider } from './contexts/FeaturesContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ConversationFormProvider } from './contexts/ConversationFormContext';
import { NotificationProvider } from './contexts/NotificationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';
import EmailVerificationBanner from './components/EmailVerificationBanner';
import MaintenanceBanner from './components/MaintenanceBanner';
import { ToastContainer } from './components/Toast';
import PostHogIdentifier from './components/PostHogIdentifier';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ForgotPasswordPage from './pages/ForgotPasswordPage';
import ResetPasswordPage from './pages/ResetPasswordPage';
import VerifyEmailPage from './pages/VerifyEmailPage';
import DashboardPage from './pages/DashboardPage';
import ConversationsPage from './pages/ConversationsPage';
import TemplatesPage from './pages/TemplatesPage';

// Multi-step conversation creation
import ConversationFormLayout from './components/ConversationFormLayout';
import EditConversationLoader from './components/EditConversationLoader';
import LegacyEditRedirect from './components/LegacyEditRedirect';
import TemplateConversationLoader from './components/TemplateConversationLoader';
import IntentStep from './pages/create/IntentStep';
import DetailsStep from './pages/create/DetailsStep';
import PrivacyStep from './pages/create/PrivacyStep';
import QuestionsStep from './pages/create/QuestionsStep';
import TimingStep from './pages/create/TimingStep';
import NotificationsStep from './pages/create/NotificationsStep';
import ReviewStep from './pages/create/ReviewStep';
import ConversationDetailPage from './pages/ConversationDetailPage';
import ManageInvitationsPage from './pages/ManageInvitationsPage';
import JoinPage from './pages/JoinPage';
import PreviewPage from './pages/PreviewPage';
import AnalysisPage from './pages/AnalysisPage';
import PeriodicAnalysisPage from './pages/PeriodicAnalysisPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import AdminPortalPage from './pages/AdminPortalPage';
import AdminUserDetailPage from './pages/AdminUserDetailPage';
import AdminConversationDetailPage from './pages/AdminConversationDetailPage';
import AdminEmailPreviewPage from './pages/AdminEmailPreviewPage';
import AdminTestGenerationPage from './pages/AdminTestGenerationPage';
import AdminSchedulerPage from './pages/AdminSchedulerPage';
import AdminFeaturesPage from './pages/AdminFeaturesPage';
import AdminJournalTemplatesPage from './pages/AdminJournalTemplatesPage';
import AdminSubscriptionsPage from './pages/AdminSubscriptionsPage';
import AdminPlanTiersPage from './pages/AdminPlanTiersPage';
import AdminCostEstimatorPage from './pages/AdminCostEstimatorPage';
import AdminAnalyticsPage from './pages/AdminAnalyticsPage';
import AdminLLMUsagePage from './pages/AdminLLMUsagePage';
import AdminEmailLogsPage from './pages/AdminEmailLogsPage';
import AdminInviteCodesPage from './pages/AdminInviteCodesPage';
import AdminPlatformSettingsPage from './pages/AdminPlatformSettingsPage';
import AdminAuditLogPage from './pages/AdminAuditLogPage';
import RequestAccessPage from './pages/RequestAccessPage';
import TemplateDetailPage from './pages/TemplateDetailPage';
import OrganizationsPage from './pages/OrganizationsPage';
import CreateOrganizationPage from './pages/CreateOrganizationPage';
import OrganizationDetailPage from './pages/OrganizationDetailPage';
import OrgSettingsLayout from './pages/org-settings/OrgSettingsLayout';
import OrgSettingsGeneralPage from './pages/org-settings/OrgSettingsGeneralPage';
import OrgSettingsMembersPage from './pages/org-settings/OrgSettingsMembersPage';
import OrgSettingsUsagePage from './pages/org-settings/OrgSettingsUsagePage';
import OrgSettingsBrandingPage from './pages/org-settings/OrgSettingsBrandingPage';
import OrgSettingsIntegrationsPage from './pages/org-settings/OrgSettingsIntegrationsPage';
import OrgSettingsDangerPage from './pages/org-settings/OrgSettingsDangerPage';
import InviteMembersPage from './pages/InviteMembersPage';
import AcceptOrganizationInvitePage from './pages/AcceptOrganizationInvitePage';
import CollectionsPage from './pages/CollectionsPage';
import CollectionDetailPage from './pages/CollectionDetailPage';
import JournalsPage from './pages/JournalsPage';
import JournalCreatePage from './pages/JournalCreatePage';
import JournalDetailPage from './pages/JournalDetailPage';
import JournalInsightsPage from './pages/JournalInsightsPage';
import JournalSettingsPage from './pages/JournalSettingsPage';
import SharedJournalDetailPage from './pages/SharedJournalDetailPage';
import SharedAnalysisPage from './pages/SharedAnalysisPage';
import AcceptJournalSharePage from './pages/AcceptJournalSharePage';
import SpacesPage from './pages/SpacesPage';
import SpaceDetailPage from './pages/SpaceDetailPage';
import SpaceSettingsPage from './pages/SpaceSettingsPage';
import SpaceActivityPage from './pages/SpaceActivityPage';
import WorkspaceActivityPage from './pages/WorkspaceActivityPage';
import SpaceSnapshotPage from './pages/SpaceSnapshotPage';
import AcceptSpaceInvitePage from './pages/AcceptSpaceInvitePage';
import SearchResultsPage from './pages/SearchResultsPage';
import HelpPage from './pages/HelpPage';
import ExplorePage from './pages/ExplorePage';
import ExploreScenarioPage from './pages/ExploreScenarioPage';
import ProfilePage from './pages/ProfilePage';
import SettingsLayout from './pages/settings/SettingsLayout';
import SettingsNotificationsPage from './pages/settings/SettingsNotificationsPage';
import SettingsSecurityPage from './pages/settings/SettingsSecurityPage';
import SettingsUsagePage from './pages/settings/SettingsUsagePage';
import SettingsReferralPage from './pages/settings/SettingsReferralPage';
import CreatingConversationsHelp from './pages/help/CreatingConversationsHelp';
import InvitingParticipantsHelp from './pages/help/InvitingParticipantsHelp';
import RespondingHelp from './pages/help/RespondingHelp';
import ClosingConversationsHelp from './pages/help/ClosingConversationsHelp';
import AnalysisHelp from './pages/help/AnalysisHelp';
import FollowUpsHelp from './pages/help/FollowUpsHelp';
import RecurringConversationsHelp from './pages/help/RecurringConversationsHelp';
import OrganizationsHelp from './pages/help/OrganizationsHelp';
import CollectionsHelp from './pages/help/CollectionsHelp';
import SlackIntegrationHelp from './pages/help/SlackIntegrationHelp';
import JournalsHelp from './pages/help/JournalsHelp';
import SpacesHelp from './pages/help/SpacesHelp';
import { SlackCallbackPage } from './pages/SlackCallbackPage';
import { AnalysisViewPage } from './pages/AnalysisViewPage';
import NotFoundPage from './pages/NotFoundPage';

import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <OrganizationProvider>
            <FeaturesProvider>
            <NotificationProvider>
            <PostHogIdentifier />
            <div className="App">
              <Header />
              <EmailVerificationBanner />
              <MaintenanceBanner />
              <main className="main-content">
              <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
            <Route path="/verify-email" element={<VerifyEmailPage />} />
            <Route path="/auth/callback" element={<LoginPage />} />
            <Route path="/join/:accessCode" element={<JoinPage />} />
            <Route path="/join" element={<JoinPage />} />
            <Route path="/shared/analysis/:token" element={<SharedAnalysisPage />} />
            <Route
              path="/preview/:accessCode"
              element={
                <ProtectedRoute>
                  <PreviewPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/profile"
              element={
                <ProtectedRoute>
                  <ProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Settings with nested routes */}
            <Route
              path="/settings/*"
              element={
                <ProtectedRoute>
                  <SettingsLayout />
                </ProtectedRoute>
              }
            >
              <Route path="notifications" element={<SettingsNotificationsPage />} />
              <Route path="security" element={<SettingsSecurityPage />} />
              <Route path="usage" element={<SettingsUsagePage />} />
              <Route path="referral" element={<SettingsReferralPage />} />
              <Route index element={<Navigate to="notifications" replace />} />
            </Route>

            <Route
              path="/conversations"
              element={
                <ProtectedRoute>
                  <ConversationsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/templates"
              element={
                <ProtectedRoute>
                  <TemplatesPage />
                </ProtectedRoute>
              }
            />

            {/* Multi-step conversation creation */}
            <Route
              path="/create/conversation/*"
              element={
                <ProtectedRoute>
                  <ConversationFormProvider>
                    <ConversationFormLayout />
                  </ConversationFormProvider>
                </ProtectedRoute>
              }
            >
              <Route path="intent" element={<IntentStep />} />
              <Route path="details" element={<DetailsStep />} />
              <Route path="privacy" element={<PrivacyStep />} />
              <Route path="questions" element={<QuestionsStep />} />
              <Route path="timing" element={<TimingStep />} />
              <Route path="notifications" element={<NotificationsStep />} />
              <Route path="review" element={<ReviewStep />} />
              <Route index element={<Navigate to="intent" replace />} />
            </Route>

            {/* Legacy route - redirect to new flow */}
            <Route
              path="/conversations/new"
              element={<Navigate to="/create/conversation/intent" replace />}
            />

            {/* Multi-step conversation editing */}
            <Route
              path="/edit/conversation/:id/*"
              element={
                <ProtectedRoute>
                  <ConversationFormProvider>
                    <EditConversationLoader>
                      <ConversationFormLayout />
                    </EditConversationLoader>
                  </ConversationFormProvider>
                </ProtectedRoute>
              }
            >
              <Route path="details" element={<DetailsStep />} />
              <Route path="privacy" element={<PrivacyStep />} />
              <Route path="questions" element={<QuestionsStep />} />
              <Route path="timing" element={<TimingStep />} />
              <Route path="notifications" element={<NotificationsStep />} />
              <Route path="review" element={<ReviewStep />} />
              <Route index element={<Navigate to="details" replace />} />
            </Route>

            {/* Legacy edit route - redirect to new flow */}
            <Route
              path="/conversations/:id/edit"
              element={<LegacyEditRedirect />}
            />

            {/* Create conversation from template */}
            <Route
              path="/create/from-template/*"
              element={
                <ProtectedRoute>
                  <ConversationFormProvider>
                    <TemplateConversationLoader>
                      <ConversationFormLayout />
                    </TemplateConversationLoader>
                  </ConversationFormProvider>
                </ProtectedRoute>
              }
            >
              <Route path="details" element={<DetailsStep />} />
              <Route path="privacy" element={<PrivacyStep />} />
              <Route path="questions" element={<QuestionsStep />} />
              <Route path="timing" element={<TimingStep />} />
              <Route path="notifications" element={<NotificationsStep />} />
              <Route path="review" element={<ReviewStep />} />
              <Route index element={<Navigate to="review" replace />} />
            </Route>

            <Route
              path="/conversations/:id"
              element={
                <ProtectedRoute>
                  <ConversationDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/conversations/:id/invitations"
              element={
                <ProtectedRoute>
                  <ManageInvitationsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/conversations/:id/analysis"
              element={
                <ProtectedRoute>
                  <AnalysisPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/conversations/:id/analysis/history/:analysisId"
              element={
                <ProtectedRoute>
                  <AnalysisPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/conversations/:id/analysis/:periodLabel"
              element={
                <ProtectedRoute>
                  <PeriodicAnalysisPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/templates/:id"
              element={
                <ProtectedRoute>
                  <TemplateDetailPage />
                </ProtectedRoute>
              }
            />

            {/* Legacy template edit route - redirect to new flow */}
            <Route
              path="/templates/:id/edit"
              element={<LegacyEditRedirect />}
            />

            <Route
              path="/organizations"
              element={
                <ProtectedRoute>
                  <OrganizationsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/organizations/new"
              element={
                <ProtectedRoute>
                  <CreateOrganizationPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/organizations/:id"
              element={
                <ProtectedRoute>
                  <OrganizationDetailPage />
                </ProtectedRoute>
              }
            />

            {/* Organization Settings with nested routes */}
            <Route
              path="/organizations/:id/settings/*"
              element={
                <ProtectedRoute>
                  <OrgSettingsLayout />
                </ProtectedRoute>
              }
            >
              <Route index element={<OrgSettingsGeneralPage />} />
              <Route path="members" element={<OrgSettingsMembersPage />} />
              <Route path="usage" element={<OrgSettingsUsagePage />} />
              <Route path="branding" element={<OrgSettingsBrandingPage />} />
              <Route path="integrations" element={<OrgSettingsIntegrationsPage />} />
              <Route path="danger" element={<OrgSettingsDangerPage />} />
            </Route>

            <Route
              path="/organizations/:id/invite"
              element={
                <ProtectedRoute>
                  <InviteMembersPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/organizations/accept-invite/:token"
              element={
                <ProtectedRoute>
                  <AcceptOrganizationInvitePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/collections"
              element={
                <ProtectedRoute>
                  <CollectionsPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/collections/:id"
              element={
                <ProtectedRoute>
                  <CollectionDetailPage />
                </ProtectedRoute>
              }
            />

            {/* Journals (individual mode) */}
            <Route
              path="/journals"
              element={
                <ProtectedRoute>
                  <JournalsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/journals/new"
              element={
                <ProtectedRoute>
                  <JournalCreatePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/journals/accept-share/:token"
              element={
                <ProtectedRoute>
                  <AcceptJournalSharePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/journals/shared/:id"
              element={
                <ProtectedRoute>
                  <SharedJournalDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/journals/:id"
              element={
                <ProtectedRoute>
                  <JournalDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/journals/:id/settings"
              element={
                <ProtectedRoute>
                  <JournalSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/journals/:id/insights"
              element={
                <ProtectedRoute>
                  <JournalInsightsPage />
                </ProtectedRoute>
              }
            />

            {/* Spaces */}
            <Route
              path="/spaces"
              element={
                <ProtectedRoute>
                  <SpacesPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/spaces/:id"
              element={
                <ProtectedRoute>
                  <SpaceDetailPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/spaces/:id/settings"
              element={
                <ProtectedRoute>
                  <SpaceSettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="/spaces/:id/activity"
              element={
                <ProtectedRoute>
                  <SpaceActivityPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/spaces/:id/snapshots/:snapshotId"
              element={
                <ProtectedRoute>
                  <SpaceSnapshotPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/spaces/accept-invite/:token"
              element={
                <ProtectedRoute>
                  <AcceptSpaceInvitePage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/activity"
              element={
                <ProtectedRoute>
                  <WorkspaceActivityPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/search"
              element={
                <ProtectedRoute>
                  <SearchResultsPage />
                </ProtectedRoute>
              }
            />

            {/* Slack OAuth callback */}
            <Route path="/slack/callback" element={<SlackCallbackPage />} />

            {/* Direct analysis view for participants */}
            <Route
              path="/analysis/:id"
              element={
                <ProtectedRoute>
                  <AnalysisViewPage />
                </ProtectedRoute>
              }
            />

            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/adminportal" element={<AdminPortalPage />} />
            <Route path="/adminportal/scheduler" element={<AdminSchedulerPage />} />
            <Route path="/adminportal/:tab" element={<AdminPortalPage />} />
            <Route path="/adminportal/user/:id" element={<AdminUserDetailPage />} />
            <Route path="/adminportal/conversation/:id" element={<AdminConversationDetailPage />} />
            <Route path="/adminportal/email-preview" element={<AdminEmailPreviewPage />} />
            <Route path="/adminportal/test-generation" element={<AdminTestGenerationPage />} />
            <Route path="/adminportal/features" element={<AdminFeaturesPage />} />
            <Route path="/adminportal/journal-templates" element={<AdminJournalTemplatesPage />} />
            <Route path="/adminportal/subscriptions" element={<AdminSubscriptionsPage />} />
            <Route path="/adminportal/plan-tiers" element={<AdminPlanTiersPage />} />
            <Route path="/adminportal/cost-estimator" element={<AdminCostEstimatorPage />} />
            <Route path="/adminportal/analytics" element={<AdminAnalyticsPage />} />
            <Route path="/adminportal/llm-usage" element={<AdminLLMUsagePage />} />
            <Route path="/adminportal/email-logs" element={<AdminEmailLogsPage />} />
            <Route path="/adminportal/invite-codes" element={<AdminInviteCodesPage />} />
            <Route path="/adminportal/platform-settings" element={<AdminPlatformSettingsPage />} />
            <Route path="/adminportal/audit-log" element={<AdminAuditLogPage />} />

            {/* Request Access (public waitlist) */}
            <Route path="/request-access" element={<RequestAccessPage />} />

            {/* Help Pages */}
            <Route path="/help" element={<HelpPage />} />
            <Route path="/help/creating-conversations" element={<CreatingConversationsHelp />} />
            <Route path="/help/inviting-participants" element={<InvitingParticipantsHelp />} />
            <Route path="/help/responding" element={<RespondingHelp />} />
            <Route path="/help/closing-conversations" element={<ClosingConversationsHelp />} />
            <Route path="/help/analysis" element={<AnalysisHelp />} />
            <Route path="/help/follow-ups" element={<FollowUpsHelp />} />
            <Route path="/help/recurring-conversations" element={<RecurringConversationsHelp />} />
            <Route path="/help/organizations" element={<OrganizationsHelp />} />
            <Route path="/help/collections" element={<CollectionsHelp />} />
            <Route path="/help/slack-integration" element={<SlackIntegrationHelp />} />
            <Route path="/help/journals" element={<JournalsHelp />} />
            <Route path="/help/spaces" element={<SpacesHelp />} />

            {/* Explore / Sandbox (public, no auth required) */}
            <Route path="/explore" element={<ExplorePage />} />
            <Route path="/explore/:scenarioId" element={<ExploreScenarioPage />} />

            {/* 404 catch-all */}
            <Route path="*" element={<NotFoundPage />} />
              </Routes>
              </main>
              <ToastContainer />
            </div>
            </NotificationProvider>
            </FeaturesProvider>
            </OrganizationProvider>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
