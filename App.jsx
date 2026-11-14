import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import SessionError from '@/components/SessionError';
import ScrollToTop from './components/ScrollToTop';
import Login from '@/pages/Login';
import Register from '@/pages/Register';
import ForgotPassword from '@/pages/ForgotPassword';
import ResetPassword from '@/pages/ResetPassword';
import ProtectedRoute from '@/components/ProtectedRoute';
import { HomeownerGuard, WorkerGuard } from '@/components/RoleGuard';
import AppLayout from '@/components/AppLayout';
import AppRouter from '@/pages/AppRouter';
import Welcome from '@/pages/Welcome';
import SafetyCenter from '@/pages/SafetyCenter';
import AccountType from '@/pages/AccountType';
import PhoneVerification from '@/pages/PhoneVerification';
import IdentityVerification from '@/pages/IdentityVerification';
import ProfileSetup from '@/pages/ProfileSetup';
import HomeownerDashboard from '@/pages/HomeownerDashboard';
import WorkerDashboard from '@/pages/WorkerDashboard';
import PostJob from '@/pages/PostJob';
import JobDetail from '@/pages/JobDetail';
import Applicants from '@/pages/Applicants';
import BrowseWorkers from '@/pages/BrowseWorkers';
import NearbyJobs from '@/pages/NearbyJobs';
import ChatList from '@/pages/ChatList';
import ChatRoom from '@/pages/ChatRoom';
import ThankYou from '@/pages/ThankYou';
import Receipt from '@/pages/Receipt';
import Profile from '@/pages/Profile';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isLoadingPublicSettings, authError, navigateToLogin } = useAuth();

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
    // Unknown error (timeout, network) — show retry instead of a blank page
    return <SessionError message={authError.message} />;
  }

  // Render the main app
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/safety" element={<SafetyCenter />} />
      <Route path="/role" element={<AccountType />} />
      <Route element={<ProtectedRoute unauthenticatedElement={<Navigate to="/welcome" replace />} />}>
        <Route path="/" element={<AppRouter />} />
        <Route path="/verify-phone" element={<PhoneVerification />} />
        <Route path="/verify-identity" element={<IdentityVerification />} />
        <Route path="/profile-setup" element={<ProfileSetup />} />
        <Route path="/thank-you" element={<ThankYou />} />
        <Route path="/receipt/:id" element={<Receipt />} />
        <Route element={<AppLayout />}>
          <Route path="/homeowner" element={<HomeownerGuard><HomeownerDashboard /></HomeownerGuard>} />
          <Route path="/worker" element={<WorkerGuard><WorkerDashboard /></WorkerGuard>} />
          <Route path="/nearby-jobs" element={<WorkerGuard><NearbyJobs /></WorkerGuard>} />
          <Route path="/post-job" element={<HomeownerGuard><PostJob /></HomeownerGuard>} />
          <Route path="/job/:id" element={<JobDetail />} />
          <Route path="/job/:id/applicants" element={<HomeownerGuard><Applicants /></HomeownerGuard>} />
          <Route path="/browse-workers" element={<HomeownerGuard><BrowseWorkers /></HomeownerGuard>} />
          <Route path="/chat" element={<ChatList />} />
          <Route path="/chat/:id" element={<ChatRoom />} />
          <Route path="/profile" element={<Profile />} />
        </Route>
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};


function App() {

  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <ScrollToTop />
          <AuthenticatedApp />
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
