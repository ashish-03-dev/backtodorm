import React, { useState, useEffect, Suspense, lazy } from "react";
import { Button, Modal, Spinner, Alert } from "react-bootstrap";
import { useFirebase } from "../../context/FirebaseContext";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import SellerPosterForm from "./SellerPosterForm";
import { deletePoster, submitPoster } from "./sellerUtils";

const PosterTable = lazy(() => import("./PosterTable"));
const PosterView = lazy(() => import("./PosterView"));

function MyProducts() {
  const { firestore, user, storage } = useFirebase();
  const [posters, setPosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingPoster, setViewingPoster] = useState(null);
  const [sellerUsername, setSellerUsername] = useState("");

  useEffect(() => {
    const fetchUserData = async () => {
      if (user && firestore) {
        try {
          const userDoc = await getDoc(doc(firestore, "users", user.uid));
          if (userDoc.exists()) {
            setSellerUsername(userDoc.data().sellerUsername || "");
          } else {
            setError("User profile not found.");
          }
        } catch (err) {
          setError("Failed to load user data: " + err.message);
        } finally {
          setLoading(false);
        }
      }
    };
    fetchUserData();
  }, [firestore, user]);

  useEffect(() => {
    if (!firestore || !user || !sellerUsername) {
      setLoading(false);
      return;
    }

    const sellerRef = doc(firestore, "sellers", sellerUsername);
    const unsubscribe = onSnapshot(
      sellerRef,
      async (docSnap) => {
        if (!docSnap.exists()) {
          setPosters([]);
          setLoading(false);
          return;
        }

        const sellerData = docSnap.data();
        const tempPosterList = sellerData.tempPosters || [];

        try {
          const fetched = await Promise.all(
            tempPosterList.map(async (p) => {
              const posterDoc = await getDoc(doc(firestore, "tempPosters", p.posterId));
              if (!posterDoc.exists()) return null;

              const posterData = posterDoc.data();
              let imageUrl = "";

              if (posterData.originalImageUrl) {
                try {
                  const { ref, getDownloadURL } = await import("firebase/storage");
                  const imageRef = ref(storage, posterData.originalImageUrl);
                  imageUrl = await getDownloadURL(imageRef);
                } catch (err) {
                  console.warn("⚠️ Failed to load image URL:", err.message);
                }
              }

              return {
                id: p.posterId,
                ...posterData,
                imageUrl,
                status: p.status,
                data: p.data || null,
                source: "tempPosters",
              };
            })
          );

          setPosters(fetched.filter(Boolean));
        } catch (err) {
          setError("Error fetching posters: " + err.message);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError("Error subscribing to seller data: " + err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, user, sellerUsername]);

  const handleCreatePoster = () => {
    setShowCreateModal(true);
  };

  const handleViewPoster = (poster) => {
    setViewingPoster(poster);
  };

  const handleDeletePoster = async (id, source) => {
    if (window.confirm("Are you sure you want to delete this poster?")) {
      const result = await deletePoster(firestore, storage, id, source);
      if (!result.success) setError(`Failed to delete poster: ${result.error}`);
    }
  };

  const handleSubmitPoster = async (id, source) => {
    const result = await submitPoster(firestore, id, source);
    if (!result.success) setError(`Failed to submit poster: ${result.error}`);
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  if (loading) {
    return <Spinner animation="border" className="d-block mx-auto my-5" />;
  }

  return (
    <div>
      <h4 className="mb-4">🍭 My Products</h4>
      {error && (
        <Alert variant="danger" onClose={() => setError("")} dismissible>
          {error}
        </Alert>
      )}
      <Button variant="primary" className="mb-3" onClick={handleCreatePoster}>
        + Create New Poster
      </Button>

      <Suspense fallback={<Spinner animation="border" className="d-block mx-auto my-3" />}>
        <PosterTable
          posters={posters}
          onView={handleViewPoster}
          onDelete={(id) => handleDeletePoster(id, "tempPosters")}
          onSubmit={(id) => handleSubmitPoster(id, "tempPosters")}
        />
      </Suspense>

      <Modal show={!!viewingPoster} onHide={() => setViewingPoster(null)}>
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

      <Modal show={showCreateModal} onHide={handleCloseCreateModal} size="lg" backdrop="static">
        <Modal.Header closeButton>
          <Modal.Title>Create Poster</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <SellerPosterForm poster={null} onSave={handleCloseCreateModal} />
        </Modal.Body>
      </Modal>
    </div>
  );
}

export default MyProducts;