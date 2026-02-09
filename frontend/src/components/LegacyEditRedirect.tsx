import { Navigate, useParams } from 'react-router-dom';

// Redirect from legacy /conversations/:id/edit and /templates/:id/edit routes
// to the new /edit/conversation/:id/details route
export default function LegacyEditRedirect() {
  const { id } = useParams<{ id: string }>();

  if (!id) {
    // No ID provided, redirect to dashboard
    return <Navigate to="/dashboard" replace />;
  }

  return <Navigate to={`/edit/conversation/${id}/details`} replace />;
}
