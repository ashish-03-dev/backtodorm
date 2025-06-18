import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Form, Badge, Table, Spinner, Alert } from "react-bootstrap";
import { useFirebase } from "../../context/FirebaseContext";
import { useNavigate } from "react-router-dom";
import { collection, query, onSnapshot, doc, updateDoc, getDoc } from "firebase/firestore";
import '../../styles/SellerComponents.css';

const Orders = () => {
  const { firestore, user, userData, loadingUserData, error: firebaseError } = useFirebase();
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState({ status: "", search: "" });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierData, setSupplierData] = useState({
    supplierName: "",
    contact: "",
    notes: "",
    trackingId: "",
    sentOrderId: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const hasRedirected = useRef(false);

  // Redirect non-admins
  useEffect(() => {
    if (loadingUserData || !userData) {
      return;
    }
    // console.log("Orders redirect check: user =", user?.uid, "isAdmin =", userData?.isAdmin, "type =", typeof userData?.isAdmin);
    if (!user?.uid || userData.isAdmin !== true) {
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        setTimeout(() => navigate("/login", { replace: true }), 100);
      }
    } else {
      hasRedirected.current = false;
    }
  }, [user, userData, loadingUserData, navigate]);

  // Fetch orders
  useEffect(() => {
    if (!firestore || !userData?.isAdmin || loadingUserData) return;

    const ordersQuery = query(collection(firestore, "orders"));

    const unsubscribe = onSnapshot(
      ordersQuery,
      async (snapshot) => {
        const orderList = [];
        for (const orderDoc of snapshot.docs) {
          const orderData = { id: orderDoc.id, ...orderDoc.data() };

          // Fetch customer name
          const customerDoc = await getDoc(doc(firestore, "users", orderData.customerId));
          const customerName = customerDoc.exists() ? customerDoc.data().name : "Unknown";

          // Fetch poster details
          const posterDoc = await getDoc(doc(firestore, "posters", orderData.posterId));
          const posterTitle = posterDoc.exists() ? posterDoc.data().title : "Unknown Poster";

          // Fetch seller name
          const sellerDoc = await getDoc(doc(firestore, "users", orderData.sellerId));
          const sellerName = sellerDoc.exists() ? sellerDoc.data().name : "Unknown";

          orderList.push({
            ...orderData,
            customerName,
            posterTitle,
            sellerName,
          });
        }
        setOrders(orderList);
        setLoading(false);
      },
      (err) => {
        setError(`Failed to fetch orders: ${err.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, userData, loadingUserData]);

  const handleStatusChange = async (orderId, newStatus) => {
    setSubmitting(true);
    setError("");
    try {
      await updateDoc(doc(firestore, "orders", orderId), { status: newStatus });
    } catch (err) {
      setError(`Failed to update status: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredOrders = orders.filter((order) => {
    return (
      (filter.status === "" || order.status === filter.status) &&
      (filter.search === "" ||
        order.customerName.toLowerCase().includes(filter.search.toLowerCase()) ||
        order.id.toLowerCase().includes(filter.search.toLowerCase()) ||
        order.posterTitle.toLowerCase().includes(filter.search.toLowerCase()))
    );
  });

  const isFiltering = filter.status !== "" || filter.search.trim().length > 1;

  const handleShowDetail = (order) => {
    setSelectedOrder(order);
    setShowDetailModal(true);
  };

  const handleSendToSupplier = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      await updateDoc(doc(firestore, "orders", supplierData.sentOrderId), {
        sentToSupplier: true,
        supplierInfo: {
          supplierName: supplierData.supplierName,
          contact: supplierData.contact,
          notes: supplierData.notes,
          trackingId: supplierData.trackingId,
        },
      });
      setShowSupplierModal(false);
    } catch (err) {
      setError(`Failed to send to supplier: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingUserData || !userData) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <Spinner animation="border" className="text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (firebaseError) {
    return (
      <div className="container mt-4">
        <Alert variant="danger">Firebase Error: {firebaseError}</Alert>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-3">📦 Orders Management</h2>
      {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}

      <div className="row g-3 mb-4">
        <div className="col-md-3">
          <Form.Select
            value={filter.status}
            onChange={(e) => setFilter((prev) => ({ ...prev, status: e.target.value }))}
            disabled={submitting}
          >
            <option value="">Filter by Status</option>
            <option value="Pending">Pending</option>
            <option value="Shipped">Shipped</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </Form.Select>
        </div>
        <div className="col-md-5">
          <Form.Control
            type="search"
            placeholder="Search by Customer, Order ID, or Poster"
            value={filter.search}
            onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
            disabled={submitting}
          />
        </div>
      </div>

      {!isFiltering && orders.some((order) => !order.sentToSupplier) && (
        <div className="mb-4 p-3 border rounded bg-light">
          <h5 className="mb-3">🚨 Unforwarded Customer Orders</h5>
          {orders
            .filter((order) => !order.sentToSupplier)
            .map((order) => (
              <div
                key={order.id}
                className="d-flex justify-content-between align-items-center mb-2 p-2 border rounded bg-white"
              >
                <div>
                  <strong>{order.id}</strong> - {order.customerName} ({order.orderDate}) - ₹{order.totalPrice}
                </div>
                <Button
                  variant="outline-success"
                  size="sm"
                  onClick={() => {
                    setSupplierData({
                      supplierName: "",
                      contact: "",
                      notes: "",
                      trackingId: "",
                      sentOrderId: order.id,
                    });
                    setShowSupplierModal(true);
                  }}
                  disabled={submitting}
                >
                  Forward to Supplier
                </Button>
              </div>
            ))}
        </div>
      )}

      <div className="table-responsive">
        <Table striped bordered hover>
          <thead className="table-light">
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Seller</th>
              <th>Poster</th>
              <th>Date</th>
              <th>Status</th>
              <th>Total (₹)</th>
              <th>Supplier</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredOrders.map((order) => (
              <tr key={order.id}>
                <td>
                  {order.id}
                  {order.sentToSupplier && <Badge bg="success" className="ms-2">Sent</Badge>}
                </td>
                <td>{order.customerName}</td>
                <td>{order.sellerName}</td>
                <td>{order.posterTitle}</td>
                <td>{order.orderDate}</td>
                <td>
                  <Form.Select
                    size="sm"
                    value={order.status}
                    onChange={(e) => handleStatusChange(order.id, e.target.value)}
                    disabled={submitting}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Cancelled">Cancelled</option>
                  </Form.Select>
                </td>
                <td>{order.totalPrice}</td>
                <td>{order.sentToSupplier ? "✅ Done" : "❌ Not Sent"}</td>
                <td>
                  <Button
                    variant="outline-info"
                    size="sm"
                    className="me-2"
                    onClick={() => handleShowDetail(order)}
                    disabled={submitting}
                  >
                    View
                  </Button>
                  {order.sentToSupplier ? (
                    <Button variant="success" size="sm" disabled>
                      Sent
                    </Button>
                  ) : (
                    <Button
                      variant="outline-success"
                      size="sm"
                      onClick={() => {
                        setSupplierData({
                          supplierName: "",
                          contact: "",
                          notes: "",
                          trackingId: "",
                          sentOrderId: order.id,
                        });
                        setShowSupplierModal(true);
                      }}
                      disabled={submitting}
                    >
                      Send to Supplier
                    </Button>
                  )}
                </td>
              </tr>
            ))}
            {filteredOrders.length === 0 && (
              <tr>
                <td colSpan="9" className="text-center text-muted">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Order Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrder && (
            <>
              <p><strong>Order ID:</strong> {selectedOrder.id}</p>
              <p><strong>Customer:</strong> {selectedOrder.customerName}</p>
              <p><strong>Seller:</strong> {selectedOrder.sellerName}</p>
              <p><strong>Poster:</strong> {selectedOrder.posterTitle}</p>
              <p><strong>Quantity:</strong> {selectedOrder.quantity}</p>
              <p><strong>Date:</strong> {selectedOrder.orderDate}</p>
              <p><strong>Status:</strong> {selectedOrder.status}</p>
              <p><strong>Total:</strong> ₹{selectedOrder.totalPrice}</p>
              {selectedOrder.sentToSupplier && selectedOrder.supplierInfo && (
                <>
                  <hr />
                  <h6>Supplier Info:</h6>
                  <p><strong>Name:</strong> {selectedOrder.supplierInfo.supplierName}</p>
                  <p><strong>Contact:</strong> {selectedOrder.supplierInfo.contact}</p>
                  <p><strong>Tracking ID:</strong> {selectedOrder.supplierInfo.trackingId}</p>
                  <p><strong>Notes:</strong> {selectedOrder.supplierInfo.notes}</p>
                </>
              )}
            </>
          )}
        </Modal.Body>
      </Modal>

      <Modal show={showSupplierModal} onHide={() => setShowSupplierModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Send Order to Supplier</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSendToSupplier}>
            <Form.Group className="mb-3">
              <Form.Label>Supplier Name</Form.Label>
              <Form.Control
                value={supplierData.supplierName}
                onChange={(e) =>
                  setSupplierData((prev) => ({ ...prev, supplierName: e.target.value }))
                }
                required
                disabled={submitting}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Supplier Contact</Form.Label>
              <Form.Control
                value={supplierData.contact}
                onChange={(e) =>
                  setSupplierData((prev) => ({ ...prev, contact: e.target.value }))
                }
                disabled={submitting}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Notes / Instructions</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={supplierData.notes}
                onChange={(e) =>
                  setSupplierData((prev) => ({ ...prev, notes: e.target.value }))
                }
                disabled={submitting}
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Tracking ID</Form.Label>
              <Form.Control
                value={supplierData.trackingId}
                onChange={(e) =>
                  setSupplierData((prev) => ({ ...prev, trackingId: e.target.value }))
                }
                disabled={submitting}
              />
            </Form.Group>
            <Button type="submit" variant="success" disabled={submitting}>
              {submitting ? "Sending..." : "Mark as Sent"}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Orders;