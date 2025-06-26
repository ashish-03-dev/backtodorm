import React, { useState } from "react";
import { Link, useNavigate } from 'react-router-dom';
import { useFirebase } from "../context/FirebaseContext";

export default function PhoneLogin() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const { setUpRecaptcha, verifyOtp, googleLogin, createUser, user } = useFirebase();

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await setUpRecaptcha("recaptcha-container", phone);
      setStep(2);
    } catch (err) {
      alert("Failed to send OTP: " + err.message);
    }
    setLoading(false);
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyOtp(otp);
      setStep(3); // Move to name entry step
    } catch (err) {
      alert("Invalid OTP: " + err.message);
    }
    setLoading(false);
  };

  const handleNameSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (!name.trim()) {
        throw new Error("Name is required");
      }

      await createUser({ name: name.trim() });
      navigate("/");
    } catch (err) {
      console.error("Create user failed:", err);

      if (err.code === "already-exists") {
        alert("User already exists. Try logging in.");
      } else if (err.code === "permission-denied") {
        alert("Permission denied. Please try again later.");
      } else if (err.code === "unauthenticated") {
        alert("You must be signed in to complete this action.");
      } else {
        alert("Failed to save name or create user: " + err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      const result = await googleLogin();
      const nameToUse = result.user.displayName || "";
      await createUser({ name: nameToUse });
      if (!nameToUse) {
        setStep(3); // Move to name entry if no displayName
      } else {
        navigate("/");
      }
    } catch (err) {
      alert("Google login failed: " + err.message);
    }
  };

  return (
    <div className="container d-flex align-items-center justify-content-center vh-100 bg-white">
      <div className="card shadow-lg p-4" style={{ maxWidth: "400px", width: "100%" }}>
        <div className="text-center mb-2">
          <a href="/">
            <img
              src="/android-chrome-192x192.png"
              alt="backtodorm logo"
              style={{
                width: "50px",
                height: "50px",
                marginRight: "10px",
                borderRadius: "50%",
                objectFit: "cover"
              }}
            />
          </a>
          <h4 className="fw-bold mt-3">Welcome</h4>
          <p className="text-muted">
            {step === 3 ? "Enter your name" : "Sign in with your phone number"}
          </p>
        </div>

        {step === 1 && (
          <form onSubmit={handlePhoneSubmit}>
            <div className="mb-3">
              <label className="form-label">Phone Number</label>
              <input
                type="tel"
                className="form-control"
                placeholder="Enter 10-digit number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            <div id="recaptcha-container" className="mb-3"></div>
            <button type="submit" className="btn btn-danger w-100" disabled={loading}>
              {loading ? "Sending OTP..." : "Send OTP"}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleOtpSubmit}>
            <div className="mb-3">
              <label className="form-label">Enter OTP</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-danger w-100" disabled={loading}>
              {loading ? "Verifying..." : "Verify OTP"}
            </button>
          </form>
        )}

        {step === 3 && (
          <form onSubmit={handleNameSubmit}>
            <div className="mb-3">
              <label className="form-label">Your Name</label>
              <input
                type="text"
                className="form-control"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="btn btn-danger w-100" disabled={loading}>
              {loading ? "Saving..." : "Save Name"}
            </button>
          </form>
        )}

        {step !== 3 && (
          <>
            <div className="text-center my-3">OR</div>
            <button onClick={handleGoogleLogin} className="btn border w-100 mb-4">
              <img
                src="https://developers.google.com/identity/images/g-logo.png"
                alt="Google"
                style={{ width: "20px", marginRight: "10px" }}
              />
              Continue with Google
            </button>
          </>
        )}

        <p className="mb-0 text-center" style={{ fontSize: ".90em" }}>
          By continuing, you agree to our <Link to="/terms-and-conditions">Terms & Conditions</Link>
        </p>
      </div>
    </div>
  );
}