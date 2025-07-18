import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useFirebase } from "../context/FirebaseContext";

export default function Login() {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const navigate = useNavigate();

  const { setUpRecaptcha, verifyOtp, googleLogin } = useFirebase();

  const handlePhoneSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!/^[0-9]{10}$/.test(phone)) {
      alert("Please enter a valid 10-digit phone number.");
      setLoading(false);
      return;
    }

    try {
      await setUpRecaptcha("recaptcha-container", phone);
      setStep(2);
    } catch (err) {
      alert(`Failed to send OTP: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOtpSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      await verifyOtp(otp);
      navigate("/");
    } catch (err) {
      const errorMessages = {
        "auth/invalid-verification-code": "The OTP is incorrect. Please try again.",
        "auth/code-expired": "OTP has expired. Please request a new one.",
        "auth/too-many-requests": "Too many attempts. Please wait and try again later.",
        "auth/invalid-verification-id": "Verification session expired. Please request a new OTP.",
      };
      alert(errorMessages[err.code] || `Verification failed: ${err.message}`);
      if (err.code === "auth/code-expired" || err.code === "auth/invalid-verification-id") {
        setStep(1);
        setOtp("");
        const container = document.getElementById("recaptcha-container");
        if (container) container.innerHTML = "";
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      await googleLogin();
      navigate("/");
    } catch (err) {
      if (err.code !== "auth/popup-closed-by-user") {
        console.error("Google login failed:", err.message);
      }
    }
  };

  const handleCancel = () => {
    setPhone("");
    setOtp("");
    setStep(1);
    const container = document.getElementById("recaptcha-container");
    if (container) container.innerHTML = "";
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
                objectFit: "cover",
              }}
            />
          </a>
          <h4 className="fw-bold mt-3">Welcome</h4>
          <p className="text-muted">Sign in with your phone number</p>
        </div>

        {step === 1 && (
          <form onSubmit={handlePhoneSubmit}>
            <div className="mb-3">
              <label className="form-label">Phone Number</label>
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">+91</span>
                <input
                  type="tel"
                  className="form-control border-start-0"
                  placeholder="Enter 10-digit number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  pattern="[0-9]{10}"
                  maxLength="10"
                />
              </div>
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
            <div className="d-flex gap-2">
              <button type="submit" className="btn btn-danger w-100" disabled={loading}>
                {loading ? "Verifying..." : "Verify OTP"}
              </button>
              <button
                type="button"
                className="btn btn-secondary w-100"
                onClick={handleCancel}
                disabled={loading}
              >
                Cancel
              </button>
            </div>
          </form>
        )}

        <div className="text-center my-3">OR</div>
        <button onClick={handleGoogleLogin} className="btn border w-100 mb-4">
          <img
            src="https://developers.google.com/identity/images/g-logo.png"
            alt="Google"
            style={{ width: "20px", marginRight: "10px" }}
          />
          Continue with Google
        </button>

        <p className="mb-0 text-center" style={{ fontSize: ".90em" }}>
          By continuing, you agree to our <Link to="/terms-and-conditions">Terms & Conditions</Link>
        </p>
      </div>
    </div>
  );
}