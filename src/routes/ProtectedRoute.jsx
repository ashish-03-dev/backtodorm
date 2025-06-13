import { Navigate } from "react-router-dom";
import { useFirebase } from "../context/FirebaseContext";

export default function ProtectedRoute({ children }) {
    const { user } = useFirebase();
    return user ? children : <Navigate to="/login" />;
}