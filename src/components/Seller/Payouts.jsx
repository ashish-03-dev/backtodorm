import React, { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { Alert, Card, Button, Spinner } from "react-bootstrap";
import { useFirebase } from "../../context/FirebaseContext";
import { httpsCallable } from "firebase/functions";

export default function Payouts() {
  const { sellerData } = useOutletContext();
  const { functions } = useFirebase();
  const [payoutLoading, setPayoutLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const handlePayout = async () => {
    setPayoutLoading(true);
    setError("");
    setSuccess("");
    try {
      const requestPayout = httpsCallable(functions, "requestPayout");
      await requestPayout();
      setSuccess("Payout request submitted successfully!");
    } catch (err) {
      setError(`Failed to request payout: ${err.message}`);
    } finally {
      setPayoutLoading(false);
    }
  };

  if (!sellerData) {
    return (
      <div className="p-4 p-md-5">
        <Spinner animation="border" className="d-block mx-auto text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-2 text-muted text-center">Loading payout data...</p>
      </div>
    );
  }

  return (
    <div className="p-4 p-md-5">
      <h4 className="mb-4">Payouts</h4>
      {error && (
        <Alert variant="danger" onClose={() => setError("")} dismissible>
          {error}
        </Alert>
      )}
      {success && (
        <Alert variant="success" onClose={() => setSuccess("")} dismissible>
          {success}
        </Alert>
      )}
      <Card className="card shadow-sm p-4">
          <h5>Available Balance</h5>
          <p className="display-6">₹{sellerData.pendingPayments.toFixed(2)}</p>
          <p className="text-muted">Funds available for payout</p>
          <Button
            variant="primary"
            onClick={handlePayout}
            disabled={sellerData.pendingPayments <= 50 || payoutLoading}
          >
            {payoutLoading ? (
              <>
                <Spinner
                  as="span"
                  animation="border"
                  role="status"
                  aria-hidden="true"
                  className="me-2"
                />
                Processing...
              </>
            ) : (
              "Request Payout"
            )}
          </Button>
      </Card>
    </div>
  );
}