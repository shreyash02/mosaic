import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { OrganizationProvider } from './contexts/OrganizationContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';
import ErrorBoundary from './components/ErrorBoundary';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import CreateConversationPage from './pages/CreateConversationPage';
import EditConversationPage from './pages/EditConversationPage';
import ConversationDetailPage from './pages/ConversationDetailPage';
import ManageInvitationsPage from './pages/ManageInvitationsPage';
import JoinPage from './pages/JoinPage';
import AnalysisPage from './pages/AnalysisPage';
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
import HelpPage from './pages/HelpPage';
import CreatingConversationsHelp from './pages/help/CreatingConversationsHelp';
import InvitingParticipantsHelp from './pages/help/InvitingParticipantsHelp';
import RespondingHelp from './pages/help/RespondingHelp';
import ClosingConversationsHelp from './pages/help/ClosingConversationsHelp';
import AnalysisHelp from './pages/help/AnalysisHelp';
import FollowUpsHelp from './pages/help/FollowUpsHelp';
import RecurringConversationsHelp from './pages/help/RecurringConversationsHelp';
import OrganizationsHelp from './pages/help/OrganizationsHelp';

import './App.css';

function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <OrganizationProvider>
            <div className="App">
              <Header />
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
              path="/conversations/new"
              element={
                <ProtectedRoute>
                  <CreateConversationPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/conversations/:id/edit"
              element={
                <ProtectedRoute>
                  <EditConversationPage />
                </ProtectedRoute>
              }
            />

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
              path="/templates/:id"
              element={
                <ProtectedRoute>
                  <TemplateDetailPage />
                </ProtectedRoute>
              }
            />

            <Route
              path="/templates/:id/edit"
              element={
                <ProtectedRoute>
                  <EditConversationPage />
                </ProtectedRoute>
              }
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

            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/adminportal" element={<AdminPortalPage />} />
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
            </Routes>
            </div>
          </OrganizationProvider>
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}

export default App;
