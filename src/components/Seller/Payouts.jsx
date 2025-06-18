import React from "react";
import { Alert } from "react-bootstrap";
import '../../styles/SellerComponents.css';

export default function Payouts() {
  return (
    <div>
      <h4 className="mb-4">Payouts</h4>
      <Alert variant="info">
        Payout management is under development. Please contact support for withdrawal requests.
      </Alert>
      {/* Placeholder for payout functionality */}
      <div className="card shadow-sm p-4">
        <h5>Available Balance</h5>
        <p className="display-6">₹0.00</p>
        <button className="btn btn-primary" disabled>Request Payout</button>
      </div>
    </div>
  );
}