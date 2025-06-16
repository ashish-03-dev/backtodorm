import React, { useState, useEffect } from "react";
import { Tabs, Tab, Modal, Spinner, Alert } from "react-bootstrap";
import PosterTable from "./PosterTable";
import PosterFilter from "./PosterFilter";
import PosterForm from "./PosterForm";
import PosterView from "./PosterView";
import CollectionsView from "./CollectionsView";
import { addPosterToFirebase, updatePosterInFirebase, approvePosterInFirebase, rejectPosterInFirebase, deletePosterInFirebase, submitPosterInFirebase } from "../firebaseUtils";
import { useFirebase } from "../../../context/FirebaseContext";
import { collection, onSnapshot } from "firebase/firestore";

const Posters = () => {
  const { firestore } = useFirebase();
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
        const updatedPosters = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setPosters(updatedPosters);
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
        alert("Failed to delete poster: " + result.error);
      }
    }
  };
  const approvePoster = async (id) => {
    const result = await approvePosterInFirebase(firestore, id);
    if (!result.success) {
      alert("Failed to approve poster: " + result.error);
    }
  };
  const rejectPoster = async (id) => {
    const result = await rejectPosterInFirebase(firestore, id);
    if (!result.success) {
      alert("Failed to reject poster: " + result.error);
    }
  };
  const submitPoster = async (id) => {
    const result = await submitPosterInFirebase(firestore, id);
    if (!result.success) {
      alert("Failed to submit poster: " + result.error);
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
        alert("Failed to save poster: " + result.error);
      }
    } catch (error) {
      alert("Failed to save poster: " + error.message);
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
  const collectionsMap = posters.reduce((map, p) => {
    p.collections.forEach((col) => {
      if (!map[col]) map[col] = [];
      map[col].push(p);
    });
    return map;
  }, {});
  const filteredCollectionsMap = Object.keys(collectionsMap).reduce((map, col) => {
    map[col] = applySearchFilter(collectionsMap[col], tabFilters.collections.search);
    return map;
  }, {});

  return (
    <div className="container mt-4">
      <h2>🖼️ Posters Management</h2>
      {loading && <Spinner animation="border" className="d-block mx-auto my-3" />}
      {error && <Alert variant="danger">{error}</Alert>}
      {!loading && !error && (
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
          <Tab eventKey="collections" title="📦 By Collection">
            <PosterFilter
              filter={tabFilters.collections}
              onFilterChange={(f) => handleTabFilterChange("collections", f)}
              onAdd={() => openEdit(null)}
              hideApprovedFilter
            />
            <CollectionsView
              collectionsMap={filteredCollectionsMap}
              onEdit={openEdit}
              onView={openView}
              onDelete={deletePoster}
              onApprove={approvePoster}
              onReject={rejectPoster}
              onSubmit={submitPoster}
            />
          </Tab>
        </Tabs>
      )}

      <Modal show={showViewModal} onHide={() => setShowViewModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Poster Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>{viewing && <PosterView poster={viewing} />}</Modal.Body>
      </Modal>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
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