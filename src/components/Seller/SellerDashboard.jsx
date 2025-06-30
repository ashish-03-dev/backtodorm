import React, { Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Spinner, Alert, Card, Modal } from "react-bootstrap";
import { useOutletContext } from "react-router-dom";
import { lazy } from "react";

const PosterTable = lazy(() => import("./PosterTable"));
const PosterView = lazy(() => import("./PosterView"));

export default function SellerDashboard() {
  const {
    sellerData,
    posters,
    loading,
    error,
    setError,
    viewingPoster,
    setViewingPoster,
    handleViewPoster,
  } = useOutletContext();
  const navigate = useNavigate();

  const handlePayout = () => {
    navigate("/seller/payouts");
  };

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
              <Card.Text className="display-6">{sellerData?.totalPostersSold}</Card.Text>
              <Card.Text className="text-muted">Total posters sold</Card.Text>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-4">
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Total Earnings</Card.Title>
              <Card.Text className="display-6">₹{sellerData?.totalEarnings.toFixed(2)}</Card.Text>
              <Card.Text className="text-muted">Total revenue</Card.Text>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-4">
          <Link to="/seller/payouts" style={{ textDecoration: "none", color: "inherit" }}>
            <Card className="shadow-sm" style={{ cursor: "pointer" }}>
              <Card.Body>
                <Card.Title>Available Balance</Card.Title>
                <Card.Text className="display-6">₹{sellerData?.pendingPayments.toFixed(2)}</Card.Text>
                <Card.Text className="text-muted">Funds available for payout</Card.Text>
              </Card.Body>
            </Card>
          </Link>
        </div>
        <div className="col-md-4">
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Poster Status</Card.Title>
              <Card.Text>
                Published: {sellerData?.approvedPosters.length}
                <br />
                Pending: {sellerData?.tempPosters.length}
              </Card.Text>
              <Card.Text className="text-muted">Current statuses</Card.Text>
            </Card.Body>
          </Card>
        </div>
      </div>
      <h5 className="mb-3">Recent Posters</h5>
      <Suspense fallback={<Spinner animation="border" className="d-block mx-auto my-3" />}>
        <PosterTable
          posters={posters.slice(0, 5)}
          onView={handleViewPoster}
          isDashboardView={true}
        />
        <Modal show={!!viewingPoster} onHide={() => setViewingPoster(null)} size="lg">
          <Modal.Header closeButton>
            <Modal.Title>Poster Preview</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <Suspense fallback={<Spinner animation="border" className="d-block mx-auto my-3" />}>
              {viewingPoster ? (
                <PosterView poster={viewingPoster} />
              ) : (
                <Alert variant="warning">No poster selected.</Alert>
              )}
            </Suspense>
          </Modal.Body>
        </Modal>
      </Suspense>
    </div>
  );
}