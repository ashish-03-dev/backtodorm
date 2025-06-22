import React, { useState, useEffect } from "react";
import { Tabs, Tab, Modal, Spinner, Alert } from "react-bootstrap";
import PosterTable from "./PosterTable";
import PosterFilter from "./PosterFilter";
import PosterForm from "./PosterForm";
import PosterView from "./PosterView";
import CollectionsManager from "./CollectionsManager";
import { useFirebase } from "../../../context/FirebaseContext";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import { getFunctions, httpsCallable, connectFunctionsEmulator } from "firebase/functions";
import { addPoster, updatePoster, deletePoster, submitPoster } from "../../../components/Seller/sellerUtils";
import { rejectPoster } from "../firebaseUtils";
import { ref, getDownloadURL } from "firebase/storage"; // Import Storage functions
import "bootstrap/dist/css/bootstrap.min.css";
import "../../../styles/SellerComponents.css";


const Posters = () => {
  const { firestore, functions, user, userData, storage, loadingUserData } = useFirebase();
  const navigate = useNavigate();
  const [posters, setPosters] = useState([]);
  const [tempPosters, setTempPosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ search: "", approved: "" });
  const [tabFilters, setTabFilters] = useState({
    recent: { search: "" },
    inactive: { search: "" },
    pending: { search: "" },
    rejected: { search: "" },
    collections: { search: "" },
  });
  const [activeTab, setActiveTab] = useState("recent");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  // Check admin access
  useEffect(() => {
    if (loadingUserData) return;
    if (!user || !userData?.isAdmin) {
      console.log("Redirecting: Not an admin or not logged in", { user, userData });
      navigate("/login", { replace: true });
    }
  }, [user, userData, loadingUserData, navigate]);

  // Fetch posters and tempPosters with image URLs
  useEffect(() => {
    if (!firestore || !storage) {
      console.error("Firestore or Storage instance is undefined");
      setError("Firestore or Storage is not available.");
      setLoading(false);
      return;
    }

    const unsubscribePosters = onSnapshot(
      collection(firestore, "posters"),
      (snapshot) => {
        setPosters(
          snapshot.docs.map((doc) => ({
            id: doc.id,
            ...doc.data(),
            source: "posters",
          }))
        );
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching posters:", error);
        setError(`Failed to fetch posters: ${error.message}`);
        setLoading(false);
      }
    );


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
                return poster; // Return poster without imageUrl if fetch fails
              }
            }
            return poster;
          })
        );

        setTempPosters(tempPostersWithUrls);
      },
      (error) => {
        console.error("Error fetching temp posters:", error);
        setError(`Failed to fetch temp posters: ${error.message}`);
      }
    );

    return () => {
      unsubscribePosters();
      unsubscribeTempPosters();
    };
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

  const deletePosterHandler = async (id, collectionName = "tempPosters") => {
    if (window.confirm("Delete this poster?")) {
      const result = await deletePoster(firestore, storage, id, collectionName);
      if (!result.success) {
        setError("Failed to delete poster: " + result.error);
      }
    }
  };

  const approvePosterHandler = async (id) => {
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

  const rejectPosterHandler = async (id) => {
    const result = await rejectPoster(firestore, storage, id);
    if (!result.success) {
      setError("Failed to reject poster: " + result.error);
    }
  };

  const savePosterHandler = async (data, posterId) => {
    console.log("Saving poster:", { data, posterId });
    const isUpdate = !!editing;
    try {
      const collectionName = editing?.source === "posters" ? "posters" : "tempPosters";
      const result = isUpdate
        ? await updatePoster(firestore, data, posterId, collectionName)
        : await addPoster(firestore, storage, data);
      if (result.success) {
        setShowEditModal(false);
        setEditing(null);
      } else {
        setError("Failed to save poster: " + result.error);
      }
    } catch (error) {
      console.error("Error saving poster:", error);
      setError("Failed to save poster: " + error.message);
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
    [...posters, ...tempPosters]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5),
    tabFilters.recent.search
  );
  const allFiltered = applySearchFilter(
    [...posters, ...tempPosters],
    filter.search
  );
  const inactiveList = applySearchFilter(
    posters.filter((p) => !p.isActive && p.approved === "approved"),
    tabFilters.inactive.search
  );
  const pendingList = applySearchFilter(
    tempPosters.filter((p) => p.approved === "pending"),
    tabFilters.pending.search
  );
  const rejectedList = applySearchFilter(
    tempPosters.filter((p) => p.approved === "rejected"),
    tabFilters.rejected.search
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

  if (!user || !userData?.isAdmin) {
    return null;
  }

  return (
    <div className="container mt-4" style={{ maxWidth: "1400px" }}>
      <h2>🖼️ Posters Management</h2>
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
            onDelete={deletePosterHandler}
            onApprove={approvePosterHandler}
            onReject={rejectPosterHandler}
          />
        </Tab>
        <Tab eventKey="all" title="📋 All Posters">
          <PosterFilter
            filter={filter}
            onFilterChange={setFilter}
            onAdd={() => openEdit(null)}
          />
          <PosterTable
            posters={allFiltered}
            onEdit={openEdit}
            onView={openView}
            onDelete={deletePosterHandler}
            onApprove={approvePosterHandler}
            onReject={rejectPosterHandler}
          />
        </Tab>
        <Tab eventKey="inactive" title="🔒 Inactive">
          <PosterFilter
            filter={tabFilters.inactive}
            onFilterChange={(f) => handleTabFilterChange("inactive", f)}
            onAdd={() => openEdit(null)}
            hideApprovedFilter
          />
          <PosterTable
            posters={inactiveList}
            onEdit={openEdit}
            onView={openView}
            onDelete={deletePosterHandler}
            onApprove={approvePosterHandler}
            onReject={rejectPosterHandler}
          />
        </Tab>
        <Tab eventKey="pending" title="⏳ Pending Approval">
          <PosterFilter
            filter={tabFilters.pending}
            onFilterChange={(f) => handleTabFilterChange("pending", f)}
            onAdd={() => openEdit(null)}
            hideApprovedFilter
          />
          <PosterTable
            posters={pendingList}
            onEdit={openEdit}
            onView={openView}
            onDelete={deletePosterHandler}
            onApprove={approvePosterHandler}
            onReject={rejectPosterHandler}
          />
        </Tab>
        <Tab eventKey="rejected" title="🚫 Rejected">
          <PosterFilter
            filter={tabFilters.rejected}
            onFilterChange={(f) => handleTabFilterChange("rejected", f)}
            onAdd={() => openEdit(null)}
            hideApprovedFilter
          />
          <PosterTable
            posters={rejectedList}
            onEdit={openEdit}
            onView={openView}
            onDelete={deletePosterHandler}
            onApprove={approvePosterHandler}
            onReject={rejectPosterHandler}
          />
        </Tab>
        <Tab eventKey="collections" title="📦 Collections">
          <CollectionsManager
            onEdit={openEdit}
            onView={openView}
            onDelete={deletePosterHandler}
            onApprove={approvePosterHandler}
            onReject={rejectPosterHandler}
          />
        </Tab>
      </Tabs>

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
        show={showEditModal}
        onHide={() => {
          setShowEditModal(false);
          setEditing(null);
        }}
        size="lg"
        backdrop="static"
      >
        <Modal.Header closeButton>
          <Modal.Title>{editing ? "Edit Poster" : "Add Poster"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <PosterForm poster={editing} onSave={savePosterHandler} />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Posters;