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
    if (loadingUserData || !userData || !user) return;
    if (userData.isAdmin !== true) {
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        navigate("/login", { replace: true });
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
        try {
          const orderList = await Promise.all(
            snapshot.docs.map(async (orderDoc) => {
              const orderData = orderDoc.data();
              const customerDoc = await getDoc(doc(firestore, "users", orderData.customerId));
              const customerName = customerDoc.exists() ? customerDoc.data().name || "Unknown" : "Unknown";

              const items = await Promise.all(
                (orderData.items || []).map(async (item) => {
                  if (item.type === "poster") {
                    const posterDoc = await getDoc(doc(firestore, "posters", item.posterId));
                    return {
                      ...item,
                      posterTitle: posterDoc.exists() ? posterDoc.data().title : "Unknown Poster",
                    };
                  } else {
                    const collectionDoc = await getDoc(doc(firestore, "standaloneCollections", item.collectionId));
                    return {
                      ...item,
                      collectionTitle: collectionDoc.exists() ? collectionDoc.data().title : "Unknown Collection",
                    };
                  }
                })
              );

              return {
                id: orderDoc.id,
                ...orderData,
                customerName,
                items,
              };
            })
          );
          setOrders(orderList);
          setLoading(false);
        } catch (err) {
          setError(`Failed to fetch orders: ${err.message}`);
          setLoading(false);
        }
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
      const orderRef = doc(firestore, "orders", orderId);
      await updateDoc(orderRef, { status: newStatus });

      // Update userOrders collection
      const userOrderRef = doc(firestore, `userOrders/${orders.find(o => o.id === orderId)?.customerId}/orders`, orderId);
      await updateDoc(userOrderRef, { status: newStatus });
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
        order.items.some(
          (item) =>
            (item.type === "poster" && item.posterTitle.toLowerCase().includes(filter.search.toLowerCase())) ||
            (item.type === "collection" && item.collectionTitle.toLowerCase().includes(filter.search.toLowerCase()))
        ))
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
      setSupplierData({
        supplierName: "",
        contact: "",
        notes: "",
        trackingId: "",
        sentOrderId: null,
      });
    } catch (err) {
      setError(`Failed to send to supplier: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading || loadingUserData) {
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
            placeholder="Search by Customer, Order ID, or Item"
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
              <th>Items</th>
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
                <td>
                  {order.items.map((item, index) => (
                    <div key={index}>
                      {item.type === "poster" ? (
                        <span>{item.posterTitle} ({item.size}) × {item.quantity}</span>
                      ) : (
                        <span>
                          Collection: {item.collectionTitle} × {item.quantity}
                          <ul className="ms-3">
                            {item.posters.map((poster, i) => (
                              <li key={i}>
                                {poster.title} ({poster.size})
                              </li>
                            ))}
                          </ul>
                        </span>
                      )}
                    </div>
                  ))}
                </td>
                <td>{new Date(order.orderDate).toLocaleDateString('en-IN')}</td>
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
                <td colSpan="8" className="text-center text-muted">
                  No orders found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Order Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrder && (
            <>
              <p><strong>Order ID:</strong> {selectedOrder.id}</p>
              <p><strong>Customer:</strong> {selectedOrder.customerName}</p>
              <p><strong>Items:</strong></p>
              <ul>
                {selectedOrder.items.map((item, index) => (
                  <li key={index}>
                    {item.type === "poster" ? (
                      <span>{item.posterTitle} ({item.size}) × {item.quantity} - ₹{item.price * item.quantity}</span>
                    ) : (
                      <span>
                        Collection: {item.collectionTitle} × {item.quantity} (Discount: {item.collectionDiscount}%)
                        <ul className="ms-3">
                          {item.posters.map((poster, i) => (
                            <li key={i}>
                              {poster.title} ({poster.size}) - ₹{poster.price}
                            </li>
                          ))}
                        </ul>
                      </span>
                    )}
                  </li>
                ))}
              </ul>
              <p><strong>Date:</strong> {new Date(selectedOrder.orderDate).toLocaleDateString('en-IN')}</p>
              <p><strong>Status:</strong> {selectedOrder.status}</p>
              <p><strong>Total:</strong> ₹{selectedOrder.totalPrice}</p>
              {selectedOrder.shippingAddress && (
                <>
                  <p><strong>Shipping Address:</strong></p>
                  <p>
                    {selectedOrder.shippingAddress.name}, {selectedOrder.shippingAddress.address},{' '}
                    {selectedOrder.shippingAddress.locality}, {selectedOrder.shippingAddress.city},{' '}
                    {selectedOrder.shippingAddress.state} - {selectedOrder.shippingAddress.pincode}
                    {selectedOrder.shippingAddress.landmark && `, Landmark: ${selectedOrder.shippingAddress.landmark}`}
                  </p>
                </>
              )}
              {selectedOrder.sentToSupplier && selectedOrder.supplierInfo && (
                <>
                  <hr />
                  <h6>Supplier Info:</h6>
                  <p><strong>Name:</strong> {selectedOrder.supplierInfo.supplierName}</p>
                  <p><strong>Contact:</strong> {selectedOrder.supplierInfo.contact}</p>
                  <p><strong>Tracking ID:</strong> {selectedOrder.supplierInfo.trackingId || 'N/A'}</p>
                  <p><strong>Notes:</strong> {selectedOrder.supplierInfo.notes || 'None'}</p>
                </>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDetailModal(false)}>
            Close
          </Button>
        </Modal.Footer>
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