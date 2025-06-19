import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Badge, Alert, Spinner } from "react-bootstrap";
import { useFirebase } from "../../context/FirebaseContext";
import { collection, getDocs, doc, updateDoc, query, where, getDoc } from "firebase/firestore";

const CustomersAdmin = () => {
  const { firestore, user, loadingUserData } = useFirebase();
  const [customers, setCustomers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  // Normalize text for wishlist (e.g., "K Pop" → "k-pop")
  const normalizeText = (text) => {
    if (!text) return "";
    return text.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  };

  // Fetch customers and verify admin status
  useEffect(() => {
    const initialize = async () => {
      if (loadingUserData) return; // Wait for auth state to resolve
      if (!user) {
        setError("Please sign in to access this page.");
        return;
      }

      setLoading(true);
      try {
        // Check if user is admin
        const userDoc = await getDoc(doc(firestore, "users", user.uid));
        if (!userDoc.exists() || !userDoc.data().isAdmin) {
          setError("Access denied. Admin privileges required.");
          setIsAdmin(false);
          setLoading(false);
          return;
        }
        setIsAdmin(true);

        // Fetch customers (users with isCustomer flag)
        const usersQuery = query(collection(firestore, "users"), where("isCustomer", "==", true));
        const snapshot = await getDocs(usersQuery);
        const customerData = snapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || "Unknown",
          email: doc.data().email || "",
          phone: doc.data().phone || "",
          status: doc.data().status || "Active",
          orders: doc.data().orders || [],
          wishlist: (doc.data().wishlist || []).map(normalizeText),
        }));
        setCustomers(customerData);
      } catch (err) {
        console.error("Error fetching customers:", err);
        setError("Failed to load customers: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (firestore) {
      initialize();
    }
  }, [firestore, user, loadingUserData]);

  // Toggle customer status
  const handleToggleStatus = async (id) => {
    try {
      const customer = customers.find((c) => c.id === id);
      if (!customer) return;
      const newStatus = customer.status === "Active" ? "Suspended" : "Active";
      await updateDoc(doc(firestore, "users", id), { status: newStatus });
      setCustomers((prev) =>
        prev.map((c) => (c.id === id ? { ...c, status: newStatus } : c))
      );
    } catch (err) {
      console.error("Error toggling status:", err);
      setError("Failed to update status: " + err.message);
    }
  };

  // Filter customers by search term
  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email.toLowerCase().includes(search.toLowerCase())
  );

  if (loadingUserData) {
    return (
      <div className="container mt-4 text-center">
        <Spinner animation="border" variant="primary" />
        <p>Loading authentication data...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="container mt-4">
        <Alert variant="warning">Please sign in to access customer management.</Alert>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="container mt-4">
        <Alert variant="danger">{error || "Access denied."}</Alert>
      </div>
    );
  }

  return (
    <div className="container mt-4">
      <h2 className="mb-3">👥 Customers</h2>

      {/* Error Alert */}
      {error && (
        <Alert variant="danger" onClose={() => setError("")} dismissible>
          {error}
        </Alert>
      )}

      {/* Search Filter */}
      <div className="row mb-3">
        <div className="col-md-6">
          <Form.Control
            placeholder="Search by Name or Email"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={loading}
          />
        </div>
      </div>

      {/* Customers Table */}
      {loading ? (
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-hover align-middle">
            <thead className="table-light">
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Status</th>
                <th>Orders</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted">
                    No matching customers found.
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name}</td>
                    <td>{c.email}</td>
                    <td>{c.phone || "N/A"}</td>
                    <td>
                      <Badge bg={c.status === "Active" ? "success" : "secondary"}>
                        {c.status}
                      </Badge>
                    </td>
                    <td>{c.orders.length}</td>
                    <td>
                      <Button
                        variant="outline-info"
                        size="sm"
                        className="me-2"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setShowModal(true);
                        }}
                        disabled={loading}
                      >
                        View
                      </Button>
                      <Button
                        variant={c.status === "Active" ? "outline-danger" : "outline-success"}
                        size="sm"
                        onClick={() => handleToggleStatus(c.id)}
                        disabled={loading}
                      >
                        {c.status === "Active" ? "Suspend" : "Reactivate"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Customer Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedCustomer && (
            <>
              <p><strong>Name:</strong> {selectedCustomer.name}</p>
              <p><strong>Email:</strong> {selectedCustomer.email}</p>
              <p><strong>Phone:</strong> {selectedCustomer.phone || "N/A"}</p>
              <p><strong>Status:</strong> {selectedCustomer.status}</p>

              <hr />
              <h6>Order History:</h6>
              {selectedCustomer.orders.length === 0 ? (
                <p className="text-muted">No orders found.</p>
              ) : (
                <ul className="list-group mb-3">
                  {selectedCustomer.orders.map((order) => (
                    <li className="list-group-item d-flex justify-content-between" key={order.id}>
                      {order.id} - {order.date}
                      <span>₹{order.total.toFixed(2)}</span>
                    </li>
                  ))}
                </ul>
              )}

              <h6>Wishlist:</h6>
              {selectedCustomer.wishlist.length === 0 ? (
                <p className="text-muted">No wishlist items.</p>
              ) : (
                <ul className="list-group">
                  {selectedCustomer.wishlist.map((item, idx) => (
                    <li key={idx} className="list-group-item">{item}</li>
                  ))}
                </ul>
              )}
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default CustomersAdmin;