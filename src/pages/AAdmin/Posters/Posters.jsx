import React, { useState, useEffect, createContext, useContext } from "react";
import { Modal, Spinner, Alert, Button } from "react-bootstrap";
import PosterTable from "./PosterTable";
import PosterForm from "../PosterApprovals/PosterForm";
import PosterView from "./PosterView";
import { useFirebase } from "../../../context/FirebaseContext";
import { collection, query, getDocs, getDoc, doc, orderBy, limit, where } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { updatePoster, submitPoster } from "./adminPosterUtils";
import "bootstrap/dist/css/bootstrap.min.css";

// Create context for Posters state
const PostersContext = createContext();

export const usePostersContext = () => useContext(PostersContext);

const Posters = () => {
  const { firestore, storage, user, functions, loadingUserData } = useFirebase();
  const [posters, setPosters] = useState(() => {
    const saved = sessionStorage.getItem("postersData");
    return saved ? JSON.parse(saved) : [];
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ search: "" });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deletingPoster, setDeletingPoster] = useState(null);
  const [searchInput, setSearchInput] = useState("");

  // Persist state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("postersData", JSON.stringify(posters));
  }, [posters]);

  const normalizeSearchTerm = (term) => {
    if (!term || typeof term !== "string") return "";
    return term
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9-]/g, "")
      .replace(/^-+|-+$/g, "");
  };

  const fetchPosterIds = async (searchKey) => {
    const posterIds = new Set();

    try {
      const collectionDocSnap = await getDoc(doc(firestore, "collections", searchKey));
      if (collectionDocSnap.exists()) {
        const collectionData = collectionDocSnap.data();
        const posterIdsArray = collectionData.posterIds || [];
        posterIdsArray.forEach((id) => typeof id === "string" && posterIds.add(id));
      }
    } catch (err) {
      console.error("Error fetching from collections:", err);
    }

    try {
      const postersRef = collection(firestore, "posters");
      const keywordQuery = query(
        postersRef,
        where("keywords", "array-contains", searchKey),
        where("isActive", "==", true)
      );
      const keywordSnapshot = await getDocs(keywordQuery);
      keywordSnapshot.forEach((doc) => posterIds.add(doc.id));
    } catch (err) {
      console.error("Error fetching from posters by keywords:", err);
    }
    return Array.from(posterIds);
  };

  // Fetch posters with search
  const fetchPosters = async () => {
    if (!firestore || !storage) {
      console.error("Firestore or Storage instance is undefined");
      setError("Firestore or Storage is not available.");
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      let posterIds = [];
      let postersData = [];

      if (filter.search) {
        const searchKey = normalizeSearchTerm(filter.search);
        if (searchKey) {
          posterIds = await fetchPosterIds(searchKey);
        }
      } else {
        const q = query(collection(firestore, "posters"), where("isActive", "==", true), orderBy("createdAt", "desc"), limit(5));
        const snapshot = await getDocs(q);
        posterIds = snapshot.docs.map((doc) => doc.id);
      }

      for (const posterId of posterIds) {
        try {
          const posterRef = doc(firestore, "posters", posterId);
          const docSnap = await getDoc(posterRef);
          if (docSnap.exists()) {
            const posterData = docSnap.data();
            postersData.push({
              id: docSnap.id,
              ...posterData,
              source: "posters",
            });
          }
        } catch (err) {
          console.warn(`Error fetching poster ${posterId}:`, err);
        }
      }

      setPosters(postersData);
    } catch (error) {
      console.error("Error fetching posters:", error);
      setError(`Failed to fetch posters: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fetch initial posters
  useEffect(() => {
    fetchPosters();
  }, [firestore, storage, filter.search]);

  const handleSearch = () => {
    setFilter({ ...filter, search: searchInput });
  };

  const deletePoster = async (posterId) => {
    try {
      const deletePosterFunction = httpsCallable(functions, "deletePoster");
      const result = await deletePosterFunction({ posterId });
      return result.data;
    } catch (error) {
      console.error("Error deleting poster:", error);
      throw error;
    }
  };

  const openDelete = (poster) => {
    setDeletingPoster(poster);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingPoster) return;
    try {
      const result = await deletePoster(deletingPoster.id);
      if (result.success) {
        setPosters((prev) => prev.filter((p) => p.id !== deletingPoster.id));
        setShowDeleteModal(false);
        setDeletingPoster(null);
      } else {
        setError("Failed to delete poster: " + result.error);
      }
    } catch (error) {
      console.error("Error deleting poster:", error);
      setError(`Failed to delete poster: ${error.message}`);
    }
  };

  const openEdit = (poster) => {
    if (!poster) {
      console.warn("No poster provided for editing");
      return;
    }
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

  const updatePosterHandler = async (data, posterId) => {
    if (!editing) {
      setError("No poster selected for update.");
      return;
    }
    try {
      const result = await updatePoster(firestore, data, posterId);
      if (result.success) {
        setPosters((prev) =>
          prev.map((p) => (p.id === posterId ? { ...p, ...data } : p))
        );
        setShowEditModal(false);
        setEditing(null);
      } else {
        setError("Failed to update poster: " + result.error);
      }
    } catch (error) {
      console.error("Error updating poster:", error);
      setError("Failed to update poster: " + error.message);
    }
  };

  if (loadingUserData || loading) {
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
    <PostersContext.Provider value={{ filter, setFilter, posters, setPosters }}>
      <div className="p-4 p-md-5" style={{ maxWidth: "1400px" }}>
        <h3 className="mb-4">🖼️ Posters Management</h3>
        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}
        <div className="input-group mb-3">
          <input
            type="text"
            className="form-control"
            placeholder="Search by keywords..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <Button variant="primary" onClick={handleSearch}>
            Search
          </Button>
        </div>
        <PosterTable
          posters={posters}
          onEdit={openEdit}
          onView={openView}
          onDelete={openDelete}
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
              onUpdatePoster={updatePosterHandler}
              onUpdateTempPoster={() => { }}
              onRejectTempPoster={() => { }}
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
          show={showDeleteModal}
          onHide={() => {
            setShowDeleteModal(false);
            setDeletingPoster(null);
          }}
          centered
        >
          <Modal.Header closeButton>
            <Modal.Title>Confirm Delete</Modal.Title>
          </Modal.Header>
          <Modal.Body>
            <p>
              Are you sure you want to delete the poster "
              {deletingPoster?.title || "Untitled"}"? This action cannot be undone.
            </p>
          </Modal.Body>
          <Modal.Footer>
            <Button
              variant="secondary"
              onClick={() => {
                setShowDeleteModal(false);
                setDeletingPoster(null);
              }}
            >
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          </Modal.Footer>
        </Modal>
      </div>
    </PostersContext.Provider>
  );
};

export default Posters;