import React, { useState, useEffect } from "react";
import { Tabs, Tab, Modal, Spinner, Alert } from "react-bootstrap";
import PosterTable from "./PosterTable";
import PosterFilter from "./PosterFilter";
import PosterForm from "./PosterForm";
import PosterView from "./PosterView";
import CollectionsManager from "./CollectionsManager";
import { useFirebase } from "../../../context/FirebaseContext";
import { collection, onSnapshot } from "firebase/firestore";
import { updatePoster, submitPoster } from "./adminPosterUtils"; // Import submitPoster
import { ref, getDownloadURL } from "firebase/storage";
import "bootstrap/dist/css/bootstrap.min.css";

const Posters = () => {
  const { firestore, storage, user, loadingUserData } = useFirebase();
  const [posters, setPosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ search: "", approved: "" });
  const [tabFilters, setTabFilters] = useState({
    recent: { search: "" },
    inactive: { search: "" },
    collections: { search: "" },
  });
  const [activeTab, setActiveTab] = useState("recent");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  // Fetch posters with image URLs
  useEffect(() => {
    if (!firestore || !storage) {
      console.error("Firestore or Storage instance is undefined");
      setError("Firestore or Storage is not available.");
      setLoading(false);
      return;
    }

    const unsubscribePosters = onSnapshot(
      collection(firestore, "posters"),
      async (snapshot) => {
        const postersData = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
          source: "posters",
        }));

        // Fetch download URLs for posters
        const postersWithUrls = await Promise.all(
          postersData.map(async (poster) => {
            if (poster.imageUrl) {
              try {
                const imageRef = ref(storage, poster.imageUrl);
                const url = await getDownloadURL(imageRef);
                return { ...poster, imageUrl: url };
              } catch (err) {
                console.warn(`Failed to load image URL for poster ${poster.id}:`, err.message);
                return poster;
              }
            }
            return poster;
          })
        );

        setPosters(postersWithUrls);
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching posters:", error);
        setError(`Failed to fetch posters: ${error.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribePosters();
  }, [firestore, storage]);

  // Poster management functions
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

  const recentList = applySearchFilter(
    posters
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5),
    tabFilters.recent.search
  );
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
        <Tab eventKey="recent" title="🕑 Recent">
          <PosterFilter
            filter={tabFilters.recent}
            onFilterChange={(f) => handleTabFilterChange("recent", f)}
            hideApprovedFilter
          />
          <PosterTable
            posters={recentList}
            onEdit={openEdit}
            onView={openView}
          />
        </Tab>
        <Tab eventKey="all" title="📋 All Posters">
          <PosterFilter
            filter={filter}
            onFilterChange={setFilter}
          />
          <PosterTable
            posters={allFiltered}
            onEdit={openEdit}
            onView={openView}
          />
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
            onUpdateTempPoster={() => {}} // Placeholder, not used in Posters
            onRejectTempPoster={() => {}} // Placeholder, not used in Posters
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

export default Posters;