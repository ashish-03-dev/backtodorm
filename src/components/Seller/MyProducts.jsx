import React, { useState, useEffect, Suspense, lazy } from "react";
import { Button, Modal, Spinner, Alert } from "react-bootstrap";
import { useFirebase } from "../../context/FirebaseContext";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { deletePoster, submitPoster } from "./sellerUtils";
import SellerPosterForm from "./SellerPosterForm";
import '../../styles/SellerComponents.css';

const PosterTable = lazy(() => import("./PosterTable"));
const PosterView = lazy(() => import("./PosterView"));

export default function MyProducts() {
  const { firestore, user } = useFirebase();
  const [posters, setPosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editingPoster, setEditingPoster] = useState(null);
  const [viewingPoster, setViewingPoster] = useState(null);

  useEffect(() => {
    if (!firestore || !user) return;
    const postersQuery = query(
      collection(firestore, "posters"),
      where("seller", "==", user.uid)
    );
    const unsubscribe = onSnapshot(
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
    return () => unsubscribe();
  }, [firestore, user]);

  const handleAddPoster = () => {
    setEditingPoster(null);
    setShowEditModal(true);
  };

  const handleEditPoster = (poster) => {
    setEditingPoster(poster);
    setShowEditModal(true);
  };

  const handleViewPoster = (poster) => {
    setViewingPoster(poster);
    setShowViewModal(true);
  };

  const handleDeletePoster = async (id) => {
    if (window.confirm("Delete this poster?")) {
      const result = await deletePoster(firestore, id);
      if (!result.success) {
        setError(`Failed to delete poster: ${result.error}`);
      }
    }
  };

  const handleSubmitPoster = async (id) => {
    const result = await submitPoster(firestore, id);
    if (!result.success) {
      setError(`Failed to submit poster: ${result.error}`);
    }
  };

  const handleSavePoster = (data, posterId) => {
    setShowEditModal(false);
    setEditingPoster(null);
  };

  if (loading) {
    return <Spinner animation="border" className="d-block mx-auto my-5" />;
  }

  return (
    <div>
      <h4 className="mb-4">My Products</h4>
      {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}
      <Button variant="primary" className="mb-3" onClick={handleAddPoster}>
        + Create New Poster
      </Button>
      <Suspense fallback={<Spinner animation="border" className="d-block mx-auto my-3" />}>
        <PosterTable
          posters={posters}
          onEdit={handleEditPoster}
          onView={handleViewPoster}
          onDelete={handleDeletePoster}
          onSubmit={handleSubmitPoster}
        />
      </Suspense>
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>{editingPoster ? "Edit Poster" : "Create Poster"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <SellerPosterForm poster={editingPoster} onSave={handleSavePoster} />
        </Modal.Body>
      </Modal>
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Poster Preview</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Suspense fallback={<Spinner animation="border" className="d-block mx-auto my-3" />}>
            {viewingPoster && <PosterView poster={viewingPoster} />}
          </Suspense>
        </Modal.Body>
      </Modal>
    </div>
  );
}