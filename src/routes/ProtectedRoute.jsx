import { Navigate } from "react-router-dom";
import { useFirebase } from "../context/FirebaseContext";

export default function ProtectedRoute({ children }) {
  const { user, loadingUserData } = useFirebase();

  // Show loading state while authentication or user data is loading
  if (loadingUserData) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "calc(100svh - 65px)" }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  // Render children if user exists, otherwise redirect to /login
  return user ? children : <Navigate to="/login" />;
}