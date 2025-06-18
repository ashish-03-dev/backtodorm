import React, { useState, useEffect, Suspense, lazy } from "react";
import { Spinner, Alert, Card } from "react-bootstrap";
import { useFirebase } from "../../context/FirebaseContext";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import OrderTable from "./OrderTable";
import '../../styles/SellerComponents.css';

const PosterTable = lazy(() => import("./PosterTable"));
const PosterView = lazy(() => import("./PosterView"));

export default function SellerDashboard() {
  const { firestore, user } = useFirebase();
  const [posters, setPosters] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewingPoster, setViewingPoster] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);

  useEffect(() => {
    if (!firestore || !user) return;

    const postersQuery = query(
      collection(firestore, "posters"),
      where("seller", "==", user.uid)
    );
    const unsubscribePosters = onSnapshot(
      postersQuery,
      (snapshot) => {
        setPosters(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (err) => {
        setError(`Failed to fetch posters: ${err.message}`);
        setLoading(false);
      }
    );

    const ordersQuery = query(
      collection(firestore, "orders"),
      where("sellerId", "==", user.uid)
    );
    const unsubscribeOrders = onSnapshot(
      ordersQuery,
      (snapshot) => {
        setOrders(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
      },
      (err) => {
        setError(`Failed to fetch orders: ${err.message}`);
      }
    );

    return () => {
      unsubscribePosters();
      unsubscribeOrders();
    };
  }, [firestore, user]);

  const handleViewPoster = (poster) => {
    setViewingPoster(poster);
    setShowViewModal(true);
  };

  const totalSold = orders.reduce((sum, order) => sum + (order.quantity || 1), 0);
  const totalEarnings = orders.reduce((sum, order) => sum + (order.totalPrice || 0), 0);
  const publishedPosters = posters.filter((p) => p.approved === "approved").length;
  const pendingPosters = posters.filter((p) => p.approved === "pending").length;

  if (loading) {
    return <Spinner animation="border" className="d-block mx-auto my-5" />;
  }

  return (
    <div>
      <h4 className="mb-4">Dashboard</h4>
      {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}
      <div className="row g-3 mb-4">
        <div className="col-md-4">
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Total Sold</Card.Title>
              <Card.Text className="display-6">{totalSold}</Card.Text>
              <Card.Text className="text-muted">Total posters sold</Card.Text>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-4">
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Total Earnings</Card.Title>
              <Card.Text className="display-6">₹{totalEarnings.toFixed(2)}</Card.Text>
              <Card.Text className="text-muted">Total revenue</Card.Text>
            </Card.Body>
          </Card>
        </div>
        <div className="col-md-4">
          <Card className="shadow-sm">
            <Card.Body>
              <Card.Title>Poster Status</Card.Title>
              <Card.Text>
                Published: {publishedPosters}<br />
                Pending: {pendingPosters}
              </Card.Text>
              <Card.Text className="text-muted">Current statuses</Card.Text>
            </Card.Body>
          </Card>
        </div>
      </div>
      <h5 className="mb-3">Recent Sales</h5>
      <OrderTable orders={orders.slice(0, 5)} />
      <h5 className="mt-4 mb-3">Recent Posters</h5>
      <Suspense fallback={<Spinner animation="border" className="d-block mx-auto my-3" />}>
        <PosterTable
          posters={posters.slice(0, 5)}
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