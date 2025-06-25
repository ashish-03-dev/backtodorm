import React, { useState } from "react";
import { useFirebase } from "../../context/FirebaseContext";
import { useNavigate } from "react-router-dom";
import { httpsCallable } from 'firebase/functions';

export default function BecomeSeller() {
  const { user, functions, userData, checkUsernameAvailability } = useFirebase();
  const navigate = useNavigate();
  const [sellerUsername, setSellerUsername] = useState("@");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [usernameChecked, setUsernameChecked] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(false);
  const [usernameMessage, setUsernameMessage] = useState("");

  const handleUsernameChange = (e) => {
    let value = e.target.value;
    if (!value.startsWith("@")) {
      value = "@" + value.replace(/^@+/, "");
    }
    setSellerUsername(value);
    setUsernameChecked(false);
    setUsernameAvailable(false);
    setUsernameMessage("");
  };

  const handleCheckUsername = async () => {
    if (sellerUsername.length <= 1) {
      setError("Username must contain at least one character after @");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const { available, message } = await checkUsernameAvailability(sellerUsername);
      setUsernameChecked(true);
      setUsernameAvailable(available);
      setUsernameMessage(message);
    } catch (err) {
      setError(err.message || "Failed to check username availability");
    }
    setLoading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!usernameChecked || !usernameAvailable) {
      setError("Please check username availability first");
      return;
    }

    setLoading(true);
    setError("");
    try {
      console.log(user);
      const becomeSellerFunction = httpsCallable(functions, 'becomeSeller');
      await becomeSellerFunction({ sellerUsername });
      navigate("/seller");
    } catch (err) {
      setError(err.message || "Failed to become a seller");
      setLoading(false);
    }
  };


  if (userData?.isSeller) {
    return (
      <div className="p-4">
        <h3>You are already a seller!</h3>
        <a href="/seller" className="btn btn-primary mt-3">
          Go to Seller Dashboard
        </a>
      </div>
    );
  }

  return (
    <div className="p-4">
      <h3>Become a Seller</h3>
      <p>Start selling your posters and earn revenue by creating a seller account.</p>
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label htmlFor="sellerUsername" className="form-label">
            Seller Username
          </label>
          <div className="input-group">
            <input
              type="text"
              className="form-control"
              id="sellerUsername"
              value={sellerUsername}
              onChange={handleUsernameChange}
              placeholder="@username"
            />
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={handleCheckUsername}
              disabled={loading || sellerUsername.length <= 1}
            >
              {loading ? "Checking..." : "Check Availability"}
            </button>
          </div>
          {usernameChecked && (
            <div className={`form-text ${usernameAvailable ? "text-success" : "text-danger"}`}>
              {usernameMessage}
            </div>
          )}
        </div>
        {error && <div className="alert alert-danger">{error}</div>}
        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || !usernameChecked || !usernameAvailable}
        >
          {loading ? "Processing..." : "Become a Seller"}
        </button>
      </form>
    </div>
  );
}