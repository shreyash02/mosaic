import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'

function App() {
  return (
    <Router>
      <div className="App">
        <header>
          <h1>Mosaic</h1>
          <p>Anonymous feedback with AI-powered insights</p>
        </header>
        <main>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/join/:inviteCode" element={<JoinPage />} />
          </Routes>
        </main>
      </div>
    </Router>
  )
}

// Placeholder components (to be implemented)
const HomePage = () => <div>Home Page - Coming Soon</div>
const LoginPage = () => <div>Login Page - Coming Soon</div>
const RegisterPage = () => <div>Register Page - Coming Soon</div>
const DashboardPage = () => <div>Dashboard - Coming Soon</div>
const JoinPage = () => <div>Join Conversation - Coming Soon</div>

export default App
