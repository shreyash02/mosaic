import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ConversationFormProvider } from './contexts/ConversationFormContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
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
import ReviewStep from './pages/create/ReviewStep';
import ConversationDetailPage from './pages/ConversationDetailPage';
import ManageInvitationsPage from './pages/ManageInvitationsPage';
import JoinPage from './pages/JoinPage';
import AnalysisPage from './pages/AnalysisPage';
import PeriodicAnalysisPage from './pages/PeriodicAnalysisPage';
import TermsOfServicePage from './pages/TermsOfServicePage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import AdminPortalPage from './pages/AdminPortalPage';
import AdminUserDetailPage from './pages/AdminUserDetailPage';
import AdminConversationDetailPage from './pages/AdminConversationDetailPage';
import TemplateDetailPage from './pages/TemplateDetailPage';
import OrganizationsPage from './pages/OrganizationsPage';
import CreateOrganizationPage from './pages/CreateOrganizationPage';
import OrganizationDetailPage from './pages/OrganizationDetailPage';
import OrganizationSettingsPage from './pages/OrganizationSettingsPage';
import InviteMembersPage from './pages/InviteMembersPage';
import AcceptOrganizationInvitePage from './pages/AcceptOrganizationInvitePage';
import CollectionsPage from './pages/CollectionsPage';
import CollectionDetailPage from './pages/CollectionDetailPage';
import HelpPage from './pages/HelpPage';
import CreatingConversationsHelp from './pages/help/CreatingConversationsHelp';
import InvitingParticipantsHelp from './pages/help/InvitingParticipantsHelp';
import RespondingHelp from './pages/help/RespondingHelp';
import ClosingConversationsHelp from './pages/help/ClosingConversationsHelp';
import AnalysisHelp from './pages/help/AnalysisHelp';
import FollowUpsHelp from './pages/help/FollowUpsHelp';
import RecurringConversationsHelp from './pages/help/RecurringConversationsHelp';
import OrganizationsHelp from './pages/help/OrganizationsHelp';
import CollectionsHelp from './pages/help/CollectionsHelp';
import { SlackCallbackPage } from './pages/SlackCallbackPage';
import { AnalysisViewPage } from './pages/AnalysisViewPage';

import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AuthProvider>
          <Router>
            <OrganizationProvider>
            <div className="App">
              <Header />
              <main className="main-content">
              <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/auth/callback" element={<LoginPage />} />
            <Route path="/join/:accessCode" element={<JoinPage />} />
            <Route path="/join" element={<JoinPage />} />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <DashboardPage />
                </ProtectedRoute>
              }
            />

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

            <Route
              path="/organizations/:id/settings"
              element={
                <ProtectedRoute>
                  <OrganizationSettingsPage />
                </ProtectedRoute>
              }
            />

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
            <Route path="/adminportal/:tab" element={<AdminPortalPage />} />
            <Route path="/adminportal/user/:id" element={<AdminUserDetailPage />} />
            <Route path="/adminportal/conversation/:id" element={<AdminConversationDetailPage />} />

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
              </Routes>
              </main>
            </div>
            </OrganizationProvider>
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
