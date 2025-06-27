import React, { useState } from "react";
import { Navigate } from 'react-router-dom';
import { useFirebase } from "../../context/FirebaseContext";
import { updateProfile, updateEmail } from 'firebase/auth';

export default function ProfileInfo() {
  const { auth, user, userData, loadingUserData, updateUser, setUpRecaptcha, linkPhoneNumber, linkGoogleAccount } = useFirebase();
  const [tempName, setTempName] = useState(userData?.name || "");
  const [editingName, setEditingName] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [sendingOtp, setSendingOtp] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [isLinkingGoogle, setIsLinkingGoogle] = useState(false);

  const handleSaveName = async () => {
    try {
      await updateUser({ name: tempName });
      setEditingName(false);
      window.location.reload();
    } catch (err) {
      alert("Failed to update profile: " + err.message);
    }
  };

  const handleLinkGoogle = async () => {
    setIsLinkingGoogle(true);
    try {
      const googleProvider = await linkGoogleAccount();
      await Promise.all([
        updateProfile(auth.currentUser, {
          photoURL: googleProvider?.photoURL || '',
        }),
        updateUser({
          name: userData?.name || googleProvider?.displayName || '',
        }),
      ]);
      window.location.reload();
    } catch (err) {
      console.error("Failed to link Google account:", err);
    } finally {
      setIsLinkingGoogle(false);
    }
  };


  const handleSendOtp = async () => {
    try {
      console.log("Starting OTP send for:", phoneInput);
      setSendingOtp(true);

      const confirmation = await setUpRecaptcha("recaptcha-container", phoneInput);
      console.log("OTP sent. Confirmation result:", confirmation);

      setConfirmationResult(confirmation);
      setOtpSent(true);
    } catch (err) {
      console.error("Failed to send OTP:", err);
      // alert(`Failed to send OTP: ${err.message}`);
    } finally {
      setSendingOtp(false);
    }
  };


  const handleVerifyOtp = async () => {
    try {
      console.log(user.phoneNumber);
      const result = await verifyOtp(confirmationResult, otp);
      await linkPhoneNumber(confirmationResult.verificationId, otp);
      setEditingPhone(false);
      setOtpSent(false);
      setOtp("");
      // window.location.reload(); // 🔄 Reload to reflect the linked phone
    } catch (err) {
      const errorMessages = {
        "auth/invalid-verification-code": "Invalid OTP. Please try again.",
        "auth/code-expired": "OTP expired. Please resend and try again.",
        "auth/too-many-requests": "Too many attempts. Please wait and try again later.",
        "auth/invalid-verification-id": "Verification session expired. Please resend OTP.",
      };
      alert(errorMessages[err.code] || err.message || "Something went wrong while verifying.");
    }
  };

  const handleCancelPhone = () => {
    setEditingPhone(false);
    setOtpSent(false);
    setOtp("");
    setPhoneInput("");
  };

  if (!loadingUserData && !user) {
    return <Navigate to="/login" />;
  }


  return (
    <div className="d-flex flex-column h-100">

      {isLinkingGoogle && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            zIndex: 1000,
          }}
        >
        </div>
      )}

      <h4 className="mb-4">Profile Info</h4>

      <div className="mb-4" style={{ width: 64, height: 64 }}>
        {user?.photoURL ? (
          <img
            src={user?.photoURL}
            alt="Profile"
            className="rounded-circle"
            width={64}
            height={64}
          />
        ) : (
          <div
            className="rounded-circle bg-light"
            style={{ width: 64, height: 64 }}
          />
        )}
      </div>

      <div className="mb-4">
        <label className="form-label fw-semibold mb-2">Full Name</label>
        {!editingName ? (
          <div className="input-group mt-2">
            <input className="form-control text-muted" value={userData?.name || user?.displayName || ""} readOnly />
            <span
              className="input-group-text bg-white text-primary"
              style={{ cursor: "pointer" }}
              onClick={() => {
                setTempName(userData?.name || "");
                setEditingName(true);
              }}
            >
              Edit
            </span>
          </div>
        ) : (
          <>
            <input className="form-control mt-2" value={tempName} onChange={(e) => setTempName(e.target.value)} />
            <div className="d-flex gap-2 mt-2">
              <button className="btn btn-sm btn-primary" onClick={handleSaveName}>Save</button>
              <button className="btn btn-sm btn-secondary" onClick={() => setEditingName(false)}>Cancel</button>
            </div>
          </>
        )}
      </div>

      <div className="mb-4">
        <label className="form-label fw-semibold mb-2">Email</label>
        <input type="email" className="form-control text-muted" value={user?.email || ""} readOnly />
        {!user?.email && (
          <button
            className="btn btn-sm btn-outline-primary mt-3"
            onClick={handleLinkGoogle}
          >
            Link Google Account
          </button>
        )}
      </div>

      <div className="mb-4">
        <label className="form-label fw-semibold mb-0">Phone Number</label>
        {user?.phoneNumber ? (
          <input
            type="tel"
            className="form-control text-muted mt-2"
            value={user.phoneNumber}
            readOnly
          />
        ) : editingPhone ? (
          <>
            <div className="input-group mt-2">
              <span className="input-group-text bg-light text-muted">+91</span>
              <input
                type="tel"
                className="form-control"
                placeholder="Enter phone number"
                value={phoneInput}
                onChange={(e) => setPhoneInput(e.target.value)}
              />
            </div>
            <div id="recaptcha-container" className="my-2" />
            {!otpSent ? (
              <div className="d-flex gap-2 mt-2">
                <button
                  className="btn btn-sm btn-primary"
                  disabled={sendingOtp || phoneInput.length !== 10}
                  onClick={handleSendOtp}
                >
                  {sendingOtp ? 'Sending OTP...' : 'Send OTP'}
                </button>

                <button
                  className="btn btn-sm btn-secondary"
                  disabled={sendingOtp}
                  onClick={() => {
                    setEditingPhone(false);
                    setPhoneInput("");
                  }}
                >
                  Cancel
                </button>
              </div>

            ) : (
              <>
                <input
                  type="text"
                  className="form-control mt-2"
                  placeholder="Enter OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                />
                <div className="d-flex gap-2 mt-2">
                  <button
                    className="btn btn-sm btn-primary"
                    onClick={handleVerifyOtp}
                  >
                    Verify
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={handleCancelPhone}
                  >
                    Cancel
                  </button>
                </div>
              </>
            )}
          </>
        ) : (
          <div className="input-group mt-2">
            <span className="input-group-text bg-light text-muted">+91</span>
            <input
              type="tel"
              className="form-control text-muted"
              value=""
              readOnly
              placeholder="Not added"
            />
            <span
              className="input-group-text bg-white text-primary cursor-pointer"
              style={{ cursor: "pointer" }}
              onClick={() => setEditingPhone(true)}
            >
              Add
            </span>
          </div>
        )}
      </div>

      <div className="text-muted small mt-auto pt-3 border-top">
        <p className="mb-1">
          Signed in with:{" "}
          <strong>{user?.providerData?.[0]?.providerId || "N/A"}</strong>
        </p>
        <p className="mb-0">
          Joined:{" "}
          <strong>
            {user?.metadata?.creationTime &&
              new Date(user.metadata.creationTime).toDateString()}
          </strong>
        </p>
      </div>
    </div>
  );
};