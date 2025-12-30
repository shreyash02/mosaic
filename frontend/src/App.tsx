import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Header from './components/Header';

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

import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
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

            <Route path="/terms" element={<TermsOfServicePage />} />
            <Route path="/privacy" element={<PrivacyPolicyPage />} />
            <Route path="/adminportal" element={<AdminPortalPage />} />
            <Route path="/adminportal/user/:id" element={<AdminUserDetailPage />} />
            <Route path="/adminportal/conversation/:id" element={<AdminConversationDetailPage />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
