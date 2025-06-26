import React, { useState } from "react";
import { Navigate } from 'react-router-dom';
import { useFirebase } from "../../context/FirebaseContext";

export default function ProfileInfo() {
  const { user, userData, loadingUserData, updateUser, setUpRecaptcha, linkPhoneNumber, linkGoogleAccount } = useFirebase();
  const [tempName, setTempName] = useState(userData?.name || "");
  const [editingName, setEditingName] = useState(false);
  const [phoneInput, setPhoneInput] = useState("");
  const [editingPhone, setEditingPhone] = useState(false);
  const [otp, setOtp] = useState("");
  const [otpSent, setOtpSent] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);

  const handleSave = async () => {
    try {
      await updateUser({ name: tempName });
      setEditingName(false);
    } catch (err) {
      alert("Failed to update profile: " + err.message);
    }
  };

  if (!loadingUserData && !user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="d-flex flex-column h-100">
      <h4 className="mb-4">Profile Info</h4>

      <div className="mb-4" style={{ width: 64, height: 64 }}>
        {user?.photoURL ? (
          <img
            src={user.photoURL}
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
            <input className="form-control text-muted" value={userData?.name || ""} readOnly />
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
              <button className="btn btn-sm btn-primary" onClick={handleSave}>Save</button>
              <button className="btn btn-sm btn-secondary" onClick={() => setEditingName(false)}>Cancel</button>
            </div>
          </>
        )}
      </div>

      <div className="mb-4">
        <label className="form-label fw-semibold mb-2">Email</label>
        <input type="email" className="form-control text-muted" value={user?.email || ""} readOnly />
        {user?.providerData?.every(p => p.providerId !== 'google.com') && (
          <button
            className="btn btn-sm btn-outline-primary mt-3"
            onClick={async () => {
              try {
                await linkGoogleAccount();
                alert("Google account linked successfully!");
              } catch (err) {
                alert(err.message); // Use the specific error message from linkGoogleAccount
              }
            }}
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
                  onClick={async () => {
                    try {
                      const result = await setUpRecaptcha("recaptcha-container", phoneInput);
                      setConfirmationResult(result);
                      setOtpSent(true);
                    } catch (err) {
                      console.error("OTP send failed:", err);
                      alert("Failed to send OTP: " + err.message);
                    }
                  }}
                >
                  Send OTP
                </button>
                <button
                  className="btn btn-sm btn-secondary"
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
                    onClick={async () => {
                      try {
                        const res = await linkPhoneNumber(confirmationResult.verificationId, otp);
                        await updateUser({ phone: res.user.phoneNumber });
                        setEditingPhone(false);
                        setOtpSent(false);
                        setOtp("");
                      } catch (err) {
                        alert("Invalid OTP: " + err.message);
                      }
                    }}
                  >
                    Verify
                  </button>
                  <button
                    className="btn btn-sm btn-secondary"
                    onClick={() => {
                      setEditingPhone(false);
                      setOtpSent(false);
                      setOtp("");
                    }}
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