import React, { useState, useEffect, createContext, useContext } from "react";
import { Tabs, Tab, Modal, Spinner, Alert, Button } from "react-bootstrap";
import PosterTable from "./PosterTable";
import PosterFilter from "./PosterFilter";
import PosterForm from "../PosterApprovals/PosterForm";
import PosterView from "./PosterView";
import CollectionsManager from "./CollectionsManager";
import { useFirebase } from "../../../context/FirebaseContext";
import { collection, query, getDocs, orderBy, startAfter, doc, getDoc, limit } from "firebase/firestore";
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
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState(() => {
    const saved = sessionStorage.getItem("postersFilter");
    return saved ? JSON.parse(saved) : { search: "", approved: "" };
  });
  const [tabFilters, setTabFilters] = useState(() => {
    const saved = sessionStorage.getItem("postersTabFilters");
    return saved ? JSON.parse(saved) : {
      inactive: { search: "" },
      collections: { search: "" },
    };
  });
  const [activeTab, setActiveTab] = useState(() => {
    return sessionStorage.getItem("postersActiveTab") || "all";
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [deletingPoster, setDeletingPoster] = useState(null);
  const [lastDocId, setLastDocId] = useState(() => {
    return sessionStorage.getItem("postersLastDocId") || null;
  });
  const [hasMore, setHasMore] = useState(() => {
    const saved = sessionStorage.getItem("postersHasMore");
    return saved ? JSON.parse(saved) : true;
  });

  // Persist state to sessionStorage
  useEffect(() => {
    sessionStorage.setItem("postersFilter", JSON.stringify(filter));
  }, [filter]);

  useEffect(() => {
    sessionStorage.setItem("postersTabFilters", JSON.stringify(tabFilters));
  }, [tabFilters]);

  useEffect(() => {
    sessionStorage.setItem("postersActiveTab", activeTab);
  }, [activeTab]);

  useEffect(() => {
    sessionStorage.setItem("postersData", JSON.stringify(posters));
  }, [posters]);

  useEffect(() => {
    sessionStorage.setItem("postersHasMore", JSON.stringify(hasMore));
  }, [hasMore]);

  useEffect(() => {
    if (lastDocId) {
      sessionStorage.setItem("postersLastDocId", lastDocId);
    } else {
      sessionStorage.removeItem("postersLastDocId");
    }
  }, [lastDocId]);

  // Fetch initial posters
  useEffect(() => {
    if (!firestore || !storage) {
      console.error("Firestore or Storage instance is undefined");
      setError("Firestore or Storage is not available.");
      setLoading(false);
      return;
    }

    const fetchInitialPosters = async () => {
      // Skip fetch if posters are already in sessionStorage
      if (posters.length > 0 && lastDocId) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const q = query(collection(firestore, "posters"), orderBy("createdAt", "desc"), limit(10));
        const snapshot = await getDocs(q);
        const postersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          source: "posters",
        }));

        setPosters(postersData);
        setLastDocId(snapshot.docs[snapshot.docs.length - 1]?.id || null);
        setHasMore(snapshot.docs.length === 10);
      } catch (error) {
        console.error("Error fetching posters:", error);
        setError(`Failed to fetch posters: ${error.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialPosters();
  }, [firestore, storage, posters.length, lastDocId]);

  // Fetch more posters
  const fetchMorePosters = async () => {
    if (!hasMore || !lastDocId || loadingMore) return;

    setLoadingMore(true);
    try {
      // Retrieve the last document using its ID
      const lastDocRef = doc(firestore, "posters", lastDocId);
      const lastDocSnap = await getDoc(lastDocRef);
      const q = query(
        collection(firestore, "posters"),
        orderBy("createdAt", "desc"),
        startAfter(lastDocSnap),
        limit(10)
      );

      const snapshot = await getDocs(q);

      const newPosters = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
        source: "posters",
      }));

      setPosters((prev) => {
        const existingIds = new Set(prev.map((p) => p.id));
        const filteredNewPosters = newPosters.filter((p) => !existingIds.has(p.id));
        return [...prev, ...filteredNewPosters];
      });
      setLastDocId(snapshot.docs[snapshot.docs.length - 1]?.id || null);
      setHasMore(snapshot.docs.length === 10);
    } catch (error) {
      console.error("Error fetching more posters:", error);
      setError(`Failed to fetch more posters: ${error.message}`);
    } finally {
      setLoadingMore(false);
    }
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

  const handleTabFilterChange = (tab, newFilter) => {
    setTabFilters((prev) => ({ ...prev, [tab]: newFilter }));
  };

  const applySearchFilter = (posterList, search) => {
    if (!search) return posterList;
    return posterList.filter((p) =>
      p.keywords?.some((keyword) =>
        keyword.toLowerCase().includes(search.toLowerCase())
      )
    );
  };

  const allFiltered = applySearchFilter(posters, filter.search);
  const inactiveList = applySearchFilter(
    posters.filter((p) => !p.isActive && p.approved === "approved"),
    tabFilters.inactive.search
  );

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
    <PostersContext.Provider value={{ filter, setFilter, tabFilters, setTabFilters, activeTab, setActiveTab, posters, setPosters }}>
      <div className="p-4 p-md-5" style={{ maxWidth: "1400px" }}>
        <h3 className="mb-4">🖼️ Posters Management</h3>
        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}
        <Tabs
          id="posters-tabs"
          activeKey={activeTab}
          onSelect={(k) => setActiveTab(k)}
          className="mb-3"
        >
          <Tab eventKey="all" title="📋 All Posters">
            <PosterFilter
              filter={filter}
              onFilterChange={setFilter}
            />
            <PosterTable
              posters={allFiltered}
              onEdit={openEdit}
              onView={openView}
              onDelete={openDelete}
            />
            {hasMore && (
              <div className="text-center mt-3">
                <Button
                  variant="primary"
                  onClick={fetchMorePosters}
                  disabled={loadingMore}
                >
                  {loadingMore ? (
                    <Spinner
                      as="span"
                      animation="border"
                      size="sm"
                      role="status"
                      aria-hidden="true"
                    />
                  ) : (
                    "Load More"
                  )}
                </Button>
              </div>
            )}
          </Tab>
          <Tab eventKey="inactive" title="🔒 Inactive">
            <PosterFilter
              filter={tabFilters.inactive}
              onFilterChange={(f) => handleTabFilterChange("inactive", f)}
              hideApprovedFilter
            />
            <PosterTable
              posters={inactiveList}
              onEdit={openEdit}
              onView={openView}
              onDelete={openDelete}
            />
          </Tab>
          <Tab eventKey="collections" title="📦 Collections">
            <CollectionsManager
              onEdit={openEdit}
              onView={openView}
            />
          </Tab>
        </Tabs>

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