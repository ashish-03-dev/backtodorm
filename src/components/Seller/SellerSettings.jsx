import React, { useState, useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useFirebase } from "../../context/FirebaseContext";
import { Button, Form, Alert } from "react-bootstrap";
import '../../styles/SellerComponents.css';

export default function Settings() {
  const { user, userData, loadingUserData, getUserProfile, updateUserProfile } = useFirebase();
  const [name, setName] = useState("");
  const [tempName, setTempName] = useState("");
  const [editingName, setEditingName] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (user?.uid) {
      getUserProfile(user.uid).then((data) => {
        if (data?.name) {
          setName(data.name);
          setTempName(data.name);
        }
      });
    }
  }, [user, getUserProfile]);

  const handleSave = async () => {
    try {
      await updateUserProfile(user.uid, { name: tempName });
      setName(tempName);
      setEditingName(false);
    } catch (err) {
      setError("Failed to update profile: " + err.message);
    }
  };

  if (!loadingUserData && !user) {
    return <Navigate to="/login" />;
  }

  return (
    <div className="d-flex flex-column h-100">
      <h4 className="mb-4">Settings</h4>
      {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}
      <div className="mb-4">
        <Form.Label className="fw-semibold mb-2">Full Name</Form.Label>
        {!editingName ? (
          <div className="input-group">
            <Form.Control value={name || ""} readOnly className="text-muted" />
            <Button
              variant="outline-primary"
              onClick={() => setEditingName(true)}
            >
              Edit
            </Button>
          </div>
        ) : (
          <>
            <Form.Control
              value={tempName}
              onChange={(e) => setTempName(e.target.value)}
              className="mb-2"
            />
            <div className="d-flex gap-2">
              <Button variant="primary" size="sm" onClick={handleSave}>
                Save
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  setTempName(name);
                  setEditingName(false);
                }}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </div>
      <div className="mb-4">
        <Form.Label className="fw-semibold mb-2">Email</Form.Label>
        <Form.Control
          type="email"
          value={user?.email || ""}
          readOnly
          className="text-muted"
        />
      </div>
      <div className="text-muted small mt-auto pt-3 border-top">
        <p className="mb-1">
          Signed in with: <strong>{user?.providerData?.[0]?.providerId || "N/A"}</strong>
        </p>
        <p className="mb-0">
          Joined: <strong>{user?.metadata?.creationTime && new Date(user.metadata.creationTime).toDateString()}</strong>
        </p>
      </div>
    </div>
  );
}