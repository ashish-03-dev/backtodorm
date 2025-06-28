import React, { useState, useEffect, Suspense, lazy } from "react";
import { useNavigate } from "react-router-dom";
import { Spinner, Alert, Card, Button } from "react-bootstrap";
import { useFirebase } from "../../context/FirebaseContext";
import { doc, onSnapshot } from "firebase/firestore";

const PosterTable = lazy(() => import("./PosterTable"));
const PosterView = lazy(() => import("./PosterView"));

export default function SellerDashboard() {
  const { firestore, user,userData } = useFirebase();
  const navigate = useNavigate();
  const [sellerData, setSellerData] = useState({
    totalPostersSold: 0,
    totalEarnings: 0,
    pendingPayments: 0,
    approvedPosters: [],
    tempPosters: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewingPoster, setViewingPoster] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    if (!firestore || !user) return;

    // Fetch seller document
    const sellerDocRef = doc(firestore, "sellers", userData?.sellerUsername);
    const unsubscribeSeller = onSnapshot(
      sellerDocRef,
      (doc) => {
        if (doc.exists()) {
          setSellerData({
            totalPostersSold: doc.data().totalPostersSold || 0,
            totalEarnings: doc.data().totalEarnings || 0,
            pendingPayments: doc.data().pendingPayments || 0,
            approvedPosters: doc.data().approvedPosters || [],
            tempPosters: doc.data().tempPosters || [],
          });
        } else {
          setError("Seller profile not found.");
        }
        setLoading(false);
      },
      (err) => {
        setError(`Failed to fetch seller data: ${err.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribeSeller();
  }, [firestore, userData]);

  const handleViewPoster = (poster) => {
    setViewingPoster(poster);
    setShowViewModal(true);
  };

  const handlePayout = () => {
    navigate("/seller/payouts");
  };

  // Combine approved and temp posters for display
  const allPosters = [
    ...sellerData.approvedPosters.map((p) => ({ ...p, status: "approved" })),
    ...sellerData.tempPosters.map((p) => ({ ...p, status: "pending" })),
  ];

  if (loading) {
    return (
      <div
        className="d-flex flex-column justify-content-center align-items-center"
        style={{ minHeight: "100%" }}
      >
        <p className="mt-2 text-muted">Loading data...</p>
      </div>
    );
  }

  return (
    <div className="p-4 p-md-5">
      <h4 className="mb-4">Dashboard</h4>
      {error && (
        <Alert variant="danger" onClose={() => setError("")} dismissible>
          {error}
        </Alert>
      )}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Total Sold</Card.Title>
              <Card.Text className="display-6">{sellerData.totalPostersSold}</Card.Text>
              <Card.Text className="text-muted">Total posters sold</Card.Text>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-4">
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Total Earnings</Card.Title>
              <Card.Text className="display-6">₹{sellerData.totalEarnings.toFixed(2)}</Card.Text>
              <Card.Text className="text-muted">Total revenue</Card.Text>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-4">
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Available Balance</Card.Title>
              {/* <div className="d-flex align-items-center justify-content-between"> */}
                <Card.Text className="display-6 mb-0">₹{sellerData.pendingPayments.toFixed(2)}</Card.Text>
                <Button
                  variant="primary"
                  onClick={handlePayout}
                  className="me-3"
                  size="sm"
                >
                  Payout
                </Button>
              {/* </div> */}
              <Card.Text className="text-muted">Funds available for payout</Card.Text>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-4">
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Poster Status</Card.Title>
              <Card.Text>
                Published: {sellerData.approvedPosters.length}
                <br />
                Pending: {sellerData.tempPosters.length}
              </Card.Text>
              <Card.Text className="text-muted">Current statuses</Card.Text>
            </Card.Body>
          </Card>
        </div>
      </div>
      <h5 className="mb-3">Recent Posters</h5>
      <Suspense fallback={<Spinner animation="border" className="d-block mx-auto my-3" />}>
        <PosterTable
          posters={allPosters.slice(0, 5)}
          onView={handleViewPoster}
          isDashboardView={true}
        />
        {showViewModal && (
          <div className="modal show d-block" tabIndex="-1">
            <div className="modal-dialog modal-lg">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Poster Preview</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowViewModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <PosterView poster={viewingPoster} />
                </div>
              </div>
            </div>
          </div>
        )}
      </Suspense>
    </div>
  );
}