import React, { useState, useEffect } from "react";
import { Tabs, Tab, Modal, Spinner, Alert } from "react-bootstrap";
import PosterTable from "./PosterTable";
import PosterFilter from "./PosterFilter";
import PosterForm from "./PosterForm";
import PosterView from "./PosterView";
import CollectionsManager from "./CollectionsManager";
import TagManager from "./TagManager";
import { addPosterToFirebase, updatePosterInFirebase, approvePosterInFirebase, rejectPosterInFirebase, deletePosterInFirebase, submitPosterInFirebase } from "../firebaseUtils";
import { useFirebase } from "../../../context/FirebaseContext";
import { useNavigate } from "react-router-dom";
import { collection, onSnapshot } from "firebase/firestore";
import "../../../styles/SellerComponents.css";

const Posters = () => {
  const { firestore, user, userData, loadingUserData } = useFirebase();
  const navigate = useNavigate();
  const [posters, setPosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState({ search: "", approved: "" });
  const [tabFilters, setTabFilters] = useState({
    recent: { search: "" },
    drafts: { search: "" },
    pending: { search: "" },
    published: { search: "" },
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
      navigate("/login", { replace: true });
    }
  }, [user, userData, loadingUserData, navigate]);

  // Fetch posters
  useEffect(() => {
    if (!firestore) {
      console.error("Firestore instance is undefined. Check useFirebase context.");
      setError("Firestore is not available.");
      setLoading(false);
      return;
    }
    const unsubscribe = onSnapshot(
      collection(firestore, "posters"),
      (snapshot) => {
        setPosters(snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        })));
        setLoading(false);
      },
      (error) => {
        console.error("Error fetching posters from Firestore:", error);
        setError(`Failed to fetch posters: ${error.message}`);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [firestore]);

  // Poster management functions
  const openEdit = (poster = null) => {
    setEditing(poster);
    setShowEditModal(true);
  };

  const openView = (poster) => {
    setViewing(poster);
    setShowViewModal(true);
  };

  const deletePoster = async (id) => {
    if (window.confirm("Delete this poster?")) {
      const result = await deletePosterInFirebase(firestore, id);
      if (!result.success) {
        setError("Failed to delete poster: " + result.error);
      }
    }
  };

  const approvePoster = async (id) => {
    const result = await approvePosterInFirebase(firestore, id);
    if (!result.success) {
      setError("Failed to approve poster: " + result.error);
    }
  };

  const rejectPoster = async (id) => {
    const result = await rejectPosterInFirebase(firestore, id);
    if (!result.success) {
      setError("Failed to reject poster: " + result.error);
    }
  };

  const submitPoster = async (id) => {
    const result = await submitPosterInFirebase(firestore, id);
    if (!result.success) {
      setError("Failed to submit poster: " + result.error);
    }
  };

  const savePosterHandler = async (data, posterId) => {
    const isUpdate = !!editing;
    try {
      const result = isUpdate
        ? await updatePosterInFirebase(firestore, data, posterId)
        : await addPosterToFirebase(firestore, data, posterId);
      if (result.success) {
        setShowEditModal(false);
        setEditing(null);
      } else {
        setError("Failed to save poster: " + result.error);
      }
    } catch (error) {
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
    [...posters].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 5),
    tabFilters.recent.search
  );
  const allFiltered = posters.filter(
    (p) =>
      (filter.approved === "" || p.approved === filter.approved) &&
      (filter.search === "" ||
        p.keywords?.some((keyword) =>
          keyword.toLowerCase().includes(filter.search.toLowerCase())
        ))
  );
  const draftsList = applySearchFilter(
    posters.filter((p) => p.approved === "draft"),
    tabFilters.drafts.search
  );
  const pendingList = applySearchFilter(
    posters.filter((p) => p.approved === "pending"),
    tabFilters.pending.search
  );
  const publishedList = applySearchFilter(
    posters.filter((p) => p.approved === "approved"),
    tabFilters.published.search
  );
  const rejectedList = applySearchFilter(
    posters.filter((p) => p.approved === "rejected"),
    tabFilters.rejected.search
  );

  if (loadingUserData || loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: "100vh" }}>
        <Spinner animation="border" className="text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (!user || !userData?.isAdmin) return null;

  return (
    <div className="container mt-4" style={{ maxWidth: "1400px" }}>
      <h2>🖼️ Posters Management</h2>
      {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}
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
            onAdd={() => openEdit(null)}
            hideApprovedFilter
          />
          <PosterTable
            posters={recentList}
            onEdit={openEdit}
            onView={openView}
            onDelete={deletePoster}
            onApprove={approvePoster}
            onReject={rejectPoster}
            onSubmit={submitPoster}
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
            onDelete={deletePoster}
            onApprove={approvePoster}
            onReject={rejectPoster}
            onSubmit={submitPoster}
          />
        </Tab>
        <Tab eventKey="drafts" title="✏️ Drafts">
          <PosterFilter
            filter={tabFilters.drafts}
            onFilterChange={(f) => handleTabFilterChange("drafts", f)}
            onAdd={() => openEdit(null)}
            hideApprovedFilter
          />
          <PosterTable
            posters={draftsList}
            onEdit={openEdit}
            onView={openView}
            onDelete={deletePoster}
            onApprove={approvePoster}
            onReject={rejectPoster}
            onSubmit={submitPoster}
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
            onDelete={deletePoster}
            onApprove={approvePoster}
            onReject={rejectPoster}
            onSubmit={submitPoster}
          />
        </Tab>
        <Tab eventKey="published" title="✅ Published">
          <PosterFilter
            filter={tabFilters.published}
            onFilterChange={(f) => handleTabFilterChange("published", f)}
            onAdd={() => openEdit(null)}
            hideApprovedFilter
          />
          <PosterTable
            posters={publishedList}
            onEdit={openEdit}
            onView={openView}
            onDelete={deletePoster}
            onApprove={approvePoster}
            onReject={rejectPoster}
            onSubmit={submitPoster}
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
            onDelete={deletePoster}
            onApprove={approvePoster}
            onReject={rejectPoster}
            onSubmit={submitPoster}
          />
        </Tab>
        <Tab eventKey="collections" title="📦 Collections">
          <CollectionsManager
            onEdit={openEdit}
            onView={openView}
            onDelete={deletePoster}
            onApprove={approvePoster}
            onReject={rejectPoster}
            onSubmit={submitPoster}
          />
        </Tab>
        <Tab eventKey="tags" title="🏷️ Tags">
          <TagManager
            firestore={firestore}
            userData={userData}
            loadingUserData={loadingUserData}
          />
        </Tab>
      </Tabs>

      {/* Poster View Modal */}
      <Modal show={showViewModal} onHide={() => setShowViewModal(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Poster Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>{viewing && <PosterView poster={viewing} />}</Modal.Body>
      </Modal>

      {/* Poster Edit Modal */}
      <Modal show={showEditModal} onHide={() => setShowEditModal(false)} size="lg">
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