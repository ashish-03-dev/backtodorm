import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Badge, Alert, Spinner } from "react-bootstrap";
import { useFirebase } from "../../context/FirebaseContext";
import { collection, getDocs, doc, updateDoc, getDoc } from "firebase/firestore";

export default function UsersAdmin() {
  const { firestore, user, loadingUserData } = useFirebase();
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [showOrdersModal, setShowOrdersModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [error, setError] = useState("");

  // Fetch users and verify admin status
  useEffect(() => {
    const initialize = async () => {

      setLoading(true);
      try {
        const usersSnapshot = await getDocs(collection(firestore, "users"));
        const userData = await Promise.all(
          usersSnapshot.docs.map(async (doc) => {
            const userData = doc.data();
            // Fetch order count
            const ordersSnapshot = await getDocs(
              collection(firestore, `userOrders/${doc.id}/orders`)
            );
            return {
              id: doc.id,
              name: userData.name || "Unknown",
              email: userData.email || "",
              phone: userData.phone || "N/A",
              status: userData.status || "Active",
              orderCount: ordersSnapshot.size,
            };
          })
        );
        setUsers(userData);
      } catch (err) {
        console.error("Error fetching users:", err);
        setError("Failed to load users: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (firestore) {
      initialize();
    }
  }, [firestore, user, loadingUserData]);

  // Fetch orders for selected user
  const fetchOrders = async (userId) => {
    setLoadingOrders(true);
    try {
      const ordersSnapshot = await getDocs(
        collection(firestore, `userOrders/${userId}/orders`)
      );
      const fetchedOrders = await Promise.all(
        ordersSnapshot.docs.map(async (orderDoc) => {
          const orderData = orderDoc.data();
          const orderRef = doc(firestore, "orders", orderData.orderId);
          const orderSnap = await getDoc(orderRef);

          if (!orderSnap.exists()) {
            console.warn(`Order ${orderData.orderId} not found.`);
            return null;
          }

          const fullOrderData = orderSnap.data();
          return {
            id: orderData.orderId,
            date: orderData.orderDate
              ? new Date(orderData.orderDate).toLocaleDateString('en-US', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                })
              : 'N/A',
            total: `₹${fullOrderData.totalPrice || 0}`,
            status: orderData.status || 'Pending',
            paymentMethod: fullOrderData.paymentMethod || 'N/A',
          };
        })
      );
      setOrders(fetchedOrders.filter((order) => order).sort((a, b) => new Date(b.date) - new Date(a.date)));
    } catch (err) {
      console.error("Error fetching orders:", err);
      setError("Failed to load orders: " + err.message);
    } finally {
      setLoadingOrders(false);
    }
  };

  // Toggle user status
  const handleToggleStatus = async (id) => {
    try {
      const user = users.find((u) => u.id === id);
      if (!user) return;
      const newStatus = user.status === "Active" ? "Suspended" : "Active";
      await updateDoc(doc(firestore, "users", id), { status: newStatus });
      setUsers((prev) =>
        prev.map((u) => (u.id === id ? { ...u, status: newStatus } : u))
      );
    } catch (err) {
      console.error("Error toggling status:", err);
      setError("Failed to update status: " + err.message);
    }
  };

  // Filter users by search term
  const filteredUsers = users.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="container mt-4">
      <h2 className="mb-3">👥 Users</h2>

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

      {/* Users Table */}
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
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="text-center text-muted">
                    No matching users found.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>{u.phone}</td>
                    <td>
                      <Badge bg={u.status === "Active" ? "success" : "secondary"}>
                        {u.status}
                      </Badge>
                    </td>
                    <td>{u.orderCount}</td>
                    <td>
                      <Button
                        variant="outline-info"
                        size="sm"
                        className="me-2"
                        onClick={() => {
                          setSelectedUser(u);
                          setShowModal(true);
                        }}
                        disabled={loading}
                      >
                        View
                      </Button>
                      <Button
                        variant="outline-primary"
                        size="sm"
                        className="me-2"
                        onClick={() => {
                          setSelectedUser(u);
                          fetchOrders(u.id);
                          setShowOrdersModal(true);
                        }}
                        disabled={loading}
                      >
                        View Orders
                      </Button>
                      <Button
                        variant={u.status === "Active" ? "outline-danger" : "outline-success"}
                        size="sm"
                        onClick={() => handleToggleStatus(u.id)}
                        disabled={loading}
                      >
                        {u.status === "Active" ? "Suspend" : "Reactivate"}
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* User Details Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>User Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedUser && (
            <>
              <p><strong>Name:</strong> {selectedUser.name}</p>
              <p><strong>Email:</strong> {selectedUser.email}</p>
              <p><strong>Phone:</strong> {selectedUser.phone}</p>
              <p><strong>Status:</strong> {selectedUser.status}</p>
              <p><strong>Order Count:</strong> {selectedUser.orderCount}</p>
            </>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Orders Modal */}
      <Modal show={showOrdersModal} onHide={() => setShowOrdersModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Order History for {selectedUser?.name}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {loadingOrders ? (
            <div className="text-center">
              <Spinner animation="border" variant="primary" size="sm" />
              <p>Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <p className="text-muted">No orders found.</p>
          ) : (
            <ul className="list-group mb-3">
              {orders.map((order) => (
                <li className="list-group-item d-flex justify-content-between align-items-center" key={order.id}>
                  <div>
                    <strong>{order.id}</strong> - {order.date} ({order.status})
                    <br />
                    <small>Payment: {order.paymentMethod}</small>
                  </div>
                  <span>{order.total}</span>
                </li>
              ))}
            </ul>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowOrdersModal(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}