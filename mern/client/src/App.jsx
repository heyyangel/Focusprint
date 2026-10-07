import { Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import { Spinner } from './components/common';
import Login from './pages/Login';
import Overview from './pages/Overview';
import Delegation from './pages/Delegation';
import Checklist from './pages/Checklist';
import Tasks from './pages/Tasks';

/** Blocks unauthenticated access and enforces the per-role module entitlement. */
function Protected({ module, children }) {
  const { isAuthenticated, checking, can } = useAuth();

  if (checking) return <Spinner label="Restoring your session…" className="py-32" />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  // "overview" is always available; the API-issued modules gate the rest.
  if (module && !can(module)) return <Navigate to="/overview" replace />;
  return children;
}

function LandingRedirect() {
  const { isAuthenticated, checking } = useAuth();
  if (checking) return <Spinner label="Loading…" className="py-32" />;
  return <Navigate to={isAuthenticated ? '/overview' : '/login'} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/overview" element={<Overview />} />
        <Route
          path="/delegation"
          element={
            <Protected module="delegation">
              <Delegation />
            </Protected>
          }
        />
        <Route
          path="/checklist"
          element={
            <Protected module="checklist">
              <Checklist />
            </Protected>
          }
        />
        <Route
          path="/tasks"
          element={
            <Protected module="tasks">
              <Tasks />
            </Protected>
          }
        />
      </Route>

      <Route path="/" element={<LandingRedirect />} />
      <Route path="*" element={<LandingRedirect />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppRoutes />
    </AuthProvider>
  );
}
