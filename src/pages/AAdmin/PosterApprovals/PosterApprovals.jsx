import React, { useState, useEffect } from "react";
import { Modal, Spinner, Alert } from "react-bootstrap";
import PosterTable from "../Posters/PosterTable";
import PosterFilter from "../Posters/PosterFilter";
import PosterForm from "./PosterForm";
import PosterView from "../Posters/PosterView";
import PosterFrameForm from "../PosterApprovals/PosterFrameForm";
import { useFirebase } from "../../../context/FirebaseContext";
import { collection, onSnapshot } from "firebase/firestore";
import { submitPoster, approveTempPoster, rejectPoster } from "../Posters/adminPosterUtils";
import { ref, getDownloadURL } from "firebase/storage";
import { httpsCallable } from "firebase/functions";
import "bootstrap/dist/css/bootstrap.min.css";

const PosterApprovals = () => {
  const { firestore, functions, storage, user } = useFirebase();
  const [tempPosters, setTempPosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ search: "" });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showFrameModal, setShowFrameModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [framing, setFraming] = useState(null);

  // Fetch tempPosters with image URLs
  useEffect(() => {
    if (!firestore || !storage) {
      console.error("Firestore or Storage instance is undefined");
      setError("Firestore or Storage is not available.");
      setLoading(false);
      return;
    }

    const unsubscribeTempPosters = onSnapshot(
      collection(firestore, "tempPosters"),
      async (snapshot) => {
        const tempPostersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          source: "tempPosters",
          cdnUploaded: doc.data().cdnUploaded || false,
          frameSet: doc.data().frameSet || false,
        }));

        // Fetch download URLs for tempPosters
        const tempPostersWithUrls = await Promise.all(
          tempPostersData.map(async (poster) => {
            if (poster.originalImageUrl) {
              try {
                const imageRef = ref(storage, poster.originalImageUrl);
                const imageUrl = await getDownloadURL(imageRef);
                return { ...poster, imageUrl };
              } catch (err) {
                console.warn(`Failed to load image URL for poster ${poster.id}:`, err.message);
                return poster;
              }
            }
            return poster;
          })
        );

        setTempPosters(tempPostersWithUrls);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching temp posters:", error);
        setError(`Failed to fetch temp posters: ${error.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribeTempPosters();
  }, [firestore, storage]);

  // Poster management functions
  const openEdit = (poster) => {
    setEditing(poster);
    setShowEditModal(true);
  };

  const openView = (poster) => {
    setViewing(poster);
    setShowViewModal(true);
  };

  const openFrame = (poster) => {
    setFraming(poster);
    setShowFrameModal(true);
  };

  const submitPosterHandler = async (data, posterId) => {
    if (!data) {
      setShowEditModal(false);
      setEditing(null);
      return;
    }
    try {
      const result = await submitPoster(firestore, storage, data, posterId, user);
      if (result.success) {
        setShowEditModal(false);
        setEditing(null);
      } else {
        setError("Failed to submit poster: " + result.error);
      }
    } catch (error) {
      console.error("Error submitting poster:", error);
      setError("Failed to submit poster: " + error.message);
    }
  };

  const approveTempPosterHandler = async (data, posterId) => {
    if (!data || !editing) {
      setError("No poster selected for update.");
      return;
    }
    try {
      const result = await approveTempPoster(firestore, storage, data, posterId, user);
      if (result.success) {
        setShowEditModal(false);
        setEditing(null);
      } else {
        setError("Failed to approve poster: " + result.error);
      }
    } catch (error) {
      console.error("Error approving temp poster:", error);
      setError("Failed to approve temp poster: " + error.message);
    }
  };

  const rejectPosterHandler = async (posterId) => {
    try {
      const result = await rejectPoster(firestore, storage, posterId);
      if (result.success) {
        setTempPosters((prev) => prev.filter((p) => p.id !== posterId));
        setShowEditModal(false);
        setEditing(null);
      } else {
        setError("Failed to reject poster: " + result.error);
      }
    } catch (error) {
      console.error("Error rejecting poster:", error);
      setError("Failed to reject poster: " + error.message);
    }
  };

  const uploadHandler = async (posterId) => {
    try {
      const approvePoster = httpsCallable(functions, "approvePoster");
      const result = await approvePoster({ posterId });
      if (!result.data.success) {
        setError("Failed to upload poster: " + (result.data.error || "Unknown error"));
      }
    } catch (error) {
      setError(`Approval failed: ${error.message}`);
    }
  };

  const handleFrameSave = (posterId, framedImageUrl) => {
    setTempPosters((prev) =>
      prev.map((p) => (p.id === posterId ? { ...p, framedImageUrl } : p))
    );
    setShowFrameModal(false);
    setFraming(null);
  };

  const applySearchFilter = (posterList, search) => {
    if (!search) return posterList;
    return posterList.filter((p) =>
      p.keywords?.some((keyword) =>
        keyword.toLowerCase().includes(search.toLowerCase())
      )
    );
  };

  const filteredPosters = applySearchFilter(tempPosters, filter.search);

  if (loading) {
    return (
      <div
        className="d-flex justify-content-center align-items-center"
        style={{ minHeight: "100vh" }}
      >
        <Spinner animation="border" className="text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  return (
    <div className="p-4 p-md-5">
      <h3 className="mb-4">🖼️ Poster Approvals</h3>
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      <PosterFilter
        filter={filter}
        onFilterChange={setFilter}
        onAdd={() => openEdit(null)}
        hideApprovedFilter
      />
      <PosterTable
        posters={filteredPosters}
        onEdit={openEdit}
        onView={openView}
        onReject={rejectPosterHandler}
        onUpload={uploadHandler}
        onSetFrame={openFrame}
      />

      <Modal
        show={showEditModal}
        onHide={() => {
          setShowEditModal(false);
          setEditing(null);
        }}
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>{editing ? "Edit Poster" : "Add New Poster"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <PosterForm
            poster={editing}
            onSubmit={submitPosterHandler}
            onApproveTempPoster={approveTempPosterHandler}
          />
        </Modal.Body>
      </Modal>

      <Modal
        show={showViewModal}
        onHide={() => setShowViewModal(false)}
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>Poster Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {viewing ? <PosterView poster={viewing} /> : <p>No poster selected</p>}
        </Modal.Body>
      </Modal>

      <Modal
        show={showFrameModal}
        onHide={() => {
          setShowFrameModal(false);
          setFraming(null);
        }}
        size="lg"
        backdrop="static"
      >
        <Modal.Body>
          {framing ? (
            <PosterFrameForm
              poster={framing}
              onClose={() => {
                setShowFrameModal(false);
                setFraming(null);
              }}
              onSave={handleFrameSave}
            />
          ) : (
            <p>No poster selected</p>
          )}
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default PosterApprovals;