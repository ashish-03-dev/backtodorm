import { Navigate } from "react-router-dom";
import { useFirebase } from "../context/FirebaseContext";
import { Spinner } from "react-bootstrap";

export default function ProtectedRoute({ children }) {
  const { user, authLoading, loadingUserData } = useFirebase();

  // Show loading state while authentication or user data is loading
  if (authLoading || loadingUserData) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" variant="primary" />
        <p className="mt-2">Loading...</p>
      </div>
    );
  }

  // Render children if user exists, otherwise redirect to /login
  return user ? children : <Navigate to="/login" />;
}