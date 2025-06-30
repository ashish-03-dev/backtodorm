import React, { useState, useEffect } from "react";
import { Table, Button, Form, Modal, Badge, Spinner, Alert } from "react-bootstrap";
import { useFirebase } from "../../context/FirebaseContext";
import { collection, query, onSnapshot, doc, updateDoc, getDoc, where } from "firebase/firestore";

const Sellers = () => {
  const { firestore, userData, error: firebaseError } = useFirebase();
  const [sellers, setSellers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Fetch sellers and their metrics
  useEffect(() => {
    if (!firestore) return;

    const sellersQuery = query(collection(firestore, "sellers"));

    const unsubscribe = onSnapshot(
      sellersQuery,
      async (snapshot) => {
        const sellerList = [];
        for (const sellerDoc of snapshot.docs) {
          const sellerData = { id: sellerDoc.id, ...sellerDoc.data() };
          // Fetch user data
          const userDoc = await getDoc(doc(firestore, "users", sellerData.uid));
          const userData = userDoc.exists() ? userDoc.data() : {};

          // Calculate poster metrics
          const approvedPosters = sellerData.approvedPosters || [];
          const rejectedPosters = sellerData.rejectedPosters || [];

          // Fetch sales metrics
          const ordersQuery = query(
            collection(firestore, "orders"),
            where("sellerId", "==", sellerDoc.id)
          );
          const ordersSnapshot = await new Promise((resolve) => {
            onSnapshot(ordersQuery, resolve, (err) => {
              setError(`Failed to fetch orders: ${err.message}`);
              resolve();
            });
          });
          const orders = ordersSnapshot?.docs.map((doc) => doc.data()) || [];
          const sold = orders.reduce((sum, order) => sum + (order.quantity || 1), 0);

          sellerList.push({
            ...sellerData,
            name: userData.name || "N/A",
            email: userData.email || "N/A",
            phone: userData.phone || "N/A",
            approvedPosters: approvedPosters.length,
            rejectedPosters: rejectedPosters.length,
            sold,
          });
        }
        setSellers(sellerList);
        setLoading(false);
      },
      (err) => {
        setError(`Failed to fetch sellers: ${err.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, userData]);

  const filteredSellers = sellers.filter((s) => {
    const matchesSearch =
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.email.toLowerCase().includes(search.toLowerCase()) ||
      s.sellerUsername.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && s.status === "active") ||
      (statusFilter === "inactive" && s.status !== "active");
    return matchesSearch && matchesStatus;
  });

  const handleToggleStatus = async () => {
    setSubmitting(true);
    try {
      const newStatus = selectedSeller.status === "active" ? "inactive" : "active";
      await updateDoc(doc(firestore, "sellers", selectedSeller.id), { status: newStatus });
      setShowConfirmModal(false);
      setSelectedSeller(null);
    } catch (err) {
      setError(`Failed to update status: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const openConfirmModal = (seller) => {
    setSelectedSeller(seller);
    setShowConfirmModal(true);
  };

  if (loading) {
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
    <div className="p-4 p-md-5">
      <h3 className="mb-4">🧑‍💼 Sellers Management</h3>
      {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}

      <div className="row mb-3">
        <div className="col-md-4">
          <Form.Control
            placeholder="Search by name, email, or username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="col-md-4">
          <Form.Select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Form.Select>
        </div>
      </div>

      <div className="table-responsive">
        <Table bordered hover>
          <thead className="table-light">
            <tr>
              <th>Username</th>
              <th>Name</th>
              <th>Contact</th>
              <th>Approved</th>
              <th>Rejected</th>
              <th>Sold</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredSellers.map((seller) => (
              <tr key={seller.id}>
                <td>{seller.sellerUsername || "N/A"}</td>
                <td>{seller.name || "N/A"}</td>
                <td>{seller.email || "N/A"} {","} {seller.phone || "N/A"}</td>
                <td>
                  <Badge bg="success">{seller.approvedPosters || 0}</Badge>
                </td>
                <td>
                  <Badge bg="danger">{seller.rejectedPosters || 0}</Badge>
                </td>
                <td>
                  <Badge bg="info">{seller.sold || 0}</Badge>
                </td>
                <td>
                  <Badge bg={seller.status === "active" ? "success" : "secondary"}>
                    {seller.status === "active" ? "Active" : "Inactive"}
                  </Badge>
                </td>
                <td>
                  <Button
                    size="sm"
                    variant={seller.status === "active" ? "danger" : "success"}
                    onClick={() => openConfirmModal(seller)}
                    disabled={submitting}
                  >
                    {seller.status === "active" ? "Deactivate" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
            {filteredSellers.length === 0 && (
              <tr>
                <td colSpan="8" className="text-center text-muted">
                  No sellers found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <Modal show={showConfirmModal} onHide={() => setShowConfirmModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Status Change</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to {selectedSeller?.status === "active" ? "deactivate" : "activate"} the seller{" "}
          <strong>{selectedSeller?.sellerUsername}</strong>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowConfirmModal(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button
            variant={selectedSeller?.status === "active" ? "danger" : "success"}
            onClick={handleToggleStatus}
            disabled={submitting}
          >
            {submitting ? "Processing..." : selectedSeller?.status === "active" ? "Deactivate" : "Activate"}
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default Sellers;