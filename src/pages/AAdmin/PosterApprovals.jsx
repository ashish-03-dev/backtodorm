import React, { useState, useEffect } from "react";
import { Modal, Spinner, Alert } from "react-bootstrap";
import PosterTable from "./Posters/PosterTable";
import PosterFilter from "./Posters/PosterFilter";
import PosterForm from "./Posters/PosterForm";
import PosterView from "./Posters/PosterView";
import { useFirebase } from "../../context/FirebaseContext";
import { collection, onSnapshot } from "firebase/firestore";
import { submitPoster, updateTempPoster, rejectPoster } from "./Posters/adminPosterUtils";
import { ref, getDownloadURL } from "firebase/storage";
import "bootstrap/dist/css/bootstrap.min.css";
import { httpsCallable } from "firebase/functions";

const PosterApprovals = () => {
  const { firestore,functions, storage, user } = useFirebase();
  const [tempPosters, setTempPosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ search: "" });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

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
  const openEdit = (poster = null) => {
    setEditing(poster);
    setShowEditModal(true);
  };

  const openView = (poster) => {
    setViewing(poster);
    setShowViewModal(true);
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

  const updateTempPosterHandler = async (data, posterId) => {
    if (!data || !editing) {
      setError("No poster selected for update.");
      return;
    }
    try {
      const result = await updateTempPoster(firestore, storage, data, posterId, user);
      if (result.success) {
        setShowEditModal(false);
        setEditing(null);
      } else {
        setError("Failed to update poster: " + result.error);
      }
    } catch (error) {
      console.error("Error updating temp poster:", error);
      setError("Failed to update temp poster: " + error.message);
    }
  };

  // const approvePosterHandler = async (data, posterId) => {
  //   if (!data || !editing) {
  //     setError("No poster selected for approval.");
  //     return;
  //   }
  //   try {
  //     const result = await approvePoster(firestore, storage, data, posterId, user);
  //     if (result.success) {
  //       setShowEditModal(false);
  //       setEditing(null);
  //     } else {
  //       setError("Failed to approve poster: " + result.error);
  //     }
  //   } catch (error) {
  //     console.error("Error approving poster:", error);
  //     setError("Failed to approve poster: " + error.message);
  //   }
  // };

  const approvePosterHandler = async (id) => {
    console.log(id);
    try {
      if (!user) {
        console.error("No authenticated user", { user });
        setError("User not authenticated");
        return;
      }
      const approvePosterFn = httpsCallable(functions, "approvePoster");
      const result = await approvePosterFn({ posterId: id });

      if (result.data.success) {
        setTempPosters((prev) =>
          prev.map((p) => (p.id === id ? { ...p, approved: "approved" } : p))
        );
      } else {
        setError("Approval failed: " + (result.data.error || "Unknown error"));
      }
    } catch (error) {
      console.error("Approval error", { code: error.code, message: error.message, details: error.details });
      setError(`Approval failed: ${error.message} (Code: ${error.code})`);
    }
  };

  const rejectPosterHandler = async (posterId) => {
    try {
      const result = await rejectPoster(firestore, storage, posterId);
      if (result.success) {
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

  const applySearchFilter = (posterList, search) => {
    if (!search) return posterList;
    return posterList.filter((p) =>
      p.keywords?.some((keyword) =>
        keyword.toLowerCase().includes(search.toLowerCase())
      )
    );
  };

  const pendingList = applySearchFilter(
    tempPosters.filter((p) => p.approved === "pending"),
    filter.search
  );

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
    <div className="container mt-4" style={{ maxWidth: "1400px" }}>
      <h2 className="mb-3">🖼️ Poster Approvals</h2>
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
        posters={pendingList}
        onEdit={openEdit}
        onView={openView}
        onReject={rejectPosterHandler}
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
            onApprove={approvePosterHandler}
            onUpdateTempPoster={updateTempPosterHandler}
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
    </div>
  );
};

export default PosterApprovals;