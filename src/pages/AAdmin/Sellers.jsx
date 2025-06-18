import React, { useState, useEffect, useRef } from "react";
import { Table, Button, Form, Modal, Badge, Spinner, Alert } from "react-bootstrap";
import { useFirebase } from "../../context/FirebaseContext";
import { collection, query, where, onSnapshot, doc, setDoc, updateDoc } from "firebase/firestore";
import { useNavigate } from "react-router-dom";
import '../../styles/SellerComponents.css';

const Sellers = () => {
  const { firestore, user, userData, loadingUserData, error: firebaseError } = useFirebase();
  const navigate = useNavigate();
  const [sellers, setSellers] = useState([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [showModal, setShowModal] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const hasRedirected = useRef(false);

  // Check user authentication and admin status
  useEffect(() => {
    if (loadingUserData || !userData) {
      return;
    }
    if (!user?.uid || userData.isAdmin !== true) {
      if (!hasRedirected.current) {
        hasRedirected.current = true;
        setTimeout(() => navigate("/login", { replace: true }), 100);
      }
    } else {
      hasRedirected.current = false;
    }
  }, [user, userData, loadingUserData, navigate]);

  // Fetch sellers and their metrics
  useEffect(() => {
    if (!firestore || !userData?.isAdmin || loadingUserData) return;

    const sellersQuery = query(
      collection(firestore, "users"),
      where("isSeller", "==", true)
    );

    const unsubscribe = onSnapshot(
      sellersQuery,
      async (snapshot) => {
        const sellerList = [];
        for (const sellerDoc of snapshot.docs) {
          const sellerData = { id: sellerDoc.id, ...sellerDoc.data() };

          // Fetch poster metrics
          const postersQuery = query(
            collection(firestore, "posters"),
            where("seller", "==", sellerDoc.id)
          );
          const postersSnapshot = await new Promise((resolve) => {
            onSnapshot(postersQuery, resolve, (err) => {
              setError(`Failed to fetch posters: ${err.message}`);
              resolve();
            });
          });
          const posters = postersSnapshot?.docs.map((doc) => doc.data()) || [];
          const totalPosters = posters.length;
          const approvedPosters = posters.filter((p) => p.approved === true).length;
          const rejectedPosters = posters.filter((p) => p.approved === false).length;

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
            totalPosters,
            approvedPosters,
            rejectedPosters,
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
  }, [firestore, userData, loadingUserData]);

  const filteredSellers = sellers.filter((s) => {
    const matchesSearch =
      s.name?.toLowerCase().includes(search.toLowerCase()) ||
      s.email?.toLowerCase().includes(search.toLowerCase());
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "active" && s.isSeller) ||
      (statusFilter === "inactive" && !s.isSeller);
    return matchesSearch && matchesStatus;
  });

  const handleToggleStatus = async (sellerId) => {
    try {
      const seller = sellers.find((s) => s.id === sellerId);
      await updateDoc(doc(firestore, "users", sellerId), {
        isSeller: !seller.isSeller,
      });
    } catch (err) {
      setError(`Failed to update status: ${err.message}`);
    }
  };

  const handleEdit = (seller = null) => {
    setSelectedSeller(seller);
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");
    const form = e.target;
    const newSeller = {
      name: form.name.value,
      email: form.email.value,
      phone: form.phone.value || null,
      isSeller: selectedSeller?.isSeller ?? true,
      isAdmin: false,
    };

    try {
      if (selectedSeller) {
        await updateDoc(doc(firestore, "users", selectedSeller.id), newSeller);
      } else {
        const newId = doc(collection(firestore, "users")).id;
        await setDoc(doc(firestore, "users", newId), {
          ...newSeller,
          createdAt: new Date().toISOString(),
        });
      }
      setShowModal(false);
    } catch (err) {
      setError(`Failed to save seller: ${err.message}`);
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
      <h2 className="mb-3">🧑‍💼 Sellers Management</h2>
      {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}

      <div className="row mb-3">
        <div className="col-md-4">
          <Form.Control
            placeholder="Search by name or email..."
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
            <option value="inactive">Suspended</option>
          </Form.Select>
        </div>
        <div className="col-md-4 text-end">
          <Button onClick={() => handleEdit(null)} variant="primary">
            + Add Seller
          </Button>
        </div>
      </div>

      <div className="table-responsive">
        <Table bordered hover>
          <thead className="table-light">
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Posters</th>
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
                <td>{seller.name || "N/A"}</td>
                <td>{seller.email || "N/A"}</td>
                <td>{seller.phone || "N/A"}</td>
                <td>{seller.totalPosters || 0}</td>
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
                  <Badge bg={seller.isSeller ? "success" : "secondary"}>
                    {seller.isSeller ? "Active" : "Suspended"}
                  </Badge>
                </td>
                <td>
                  <Button
                    size="sm"
                    variant="outline-secondary"
                    className="me-2"
                    onClick={() => handleEdit(seller)}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant={seller.isSeller ? "danger" : "success"}
                    onClick={() => handleToggleStatus(seller.id)}
                  >
                    {seller.isSeller ? "Suspend" : "Activate"}
                  </Button>
                </td>
              </tr>
            ))}
            {filteredSellers.length === 0 && (
              <tr>
                <td colSpan="9" className="text-center text-muted">
                  No sellers found.
                </td>
              </tr>
            )}
          </tbody>
        </Table>
      </div>

      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {selectedSeller ? "Edit Seller" : "Add New Seller"}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSave}>
            <Form.Group className="mb-3">
              <Form.Label>Seller Name</Form.Label>
              <Form.Control
                name="name"
                defaultValue={selectedSeller?.name || ""}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Email</Form.Label>
              <Form.Control
                type="email"
                name="email"
                defaultValue={selectedSeller?.email || ""}
                required
              />
            </Form.Group>
            <Form.Group className="mb-3">
              <Form.Label>Phone</Form.Label>
              <Form.Control
                name="phone"
                defaultValue={selectedSeller?.phone || ""}
              />
            </Form.Group>
            <Button type="submit" variant="success" disabled={submitting}>
              {submitting ? "Saving..." : selectedSeller ? "Update" : "Add"} Seller
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Sellers;