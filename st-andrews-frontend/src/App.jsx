import { Toaster } from "@/components/ui/sonner"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import AppLayout from '@/components/layout/AppLayout';
import Dashboard from '@/pages/Dashboard';
import Students from '@/pages/Students';
import Attendance from '@/pages/Attendance';
import Results from '@/pages/Results';
import Reports from '@/pages/Reports';
import StudentProfile from '@/pages/StudentProfile';
import Timetable from '@/pages/Timetable';
import Teachers from '@/pages/Teachers';
import SMS from '@/pages/SMS';
import Login from '@/pages/Login';

const AuthGuard = ({ children }) => {
  const location = useLocation();
  const isAuthenticated = !!localStorage.getItem('access_token');

  if (!isAuthenticated && location.pathname !== '/login') {
    window.location.href = '/login';
    return null;
  }

  return children;
};

const AppContent = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<AppLayout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/students" element={<Students />} />
        <Route path="/attendance" element={<Attendance />} />
        <Route path="/results" element={<Results />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/students/:id" element={<StudentProfile />} />
        <Route path="/timetable" element={<Timetable />} />
        <Route path="/teachers" element={<Teachers />} />
        <Route path="/sms" element={<SMS />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <Router>
        <AuthGuard>
          <AppContent />
        </AuthGuard>
        <Toaster />
      </Router>
    </QueryClientProvider>
  )
}

export default App