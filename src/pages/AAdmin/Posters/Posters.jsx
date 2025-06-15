import React, { useState, useEffect } from "react";
import { Tabs, Tab, Modal } from "react-bootstrap";
import PosterTable from "./PosterTable";
import PosterFilter from "./PosterFilter";
import PosterForm from "./PosterForm";
import PosterView from "./PosterView";
import CollectionsView from "./CollectionsView";
import { addPosterToFirebase, approvePosterInFirebase, rejectPosterInFirebase, deletePosterInFirebase, submitPosterInFirebase } from "../firebaseUtils";
import { useFirebase } from "../../../context/FirebaseContext";

const initialPosters = [
  {
    id: "spider-man-homecoming-3-piece-set-1021",
    title: "Spider-Man || Homecoming || 3 Piece Set",
    description: "A vibrant 3‑piece Spider‑Man wall art set perfect for Marvel fans.",
    tags: ["marvel", "homecoming"],
    collections: ["movies", "superhero", "3-piece-sets"],
    category: "pop-culture",
    imageUrl: "https://example.com/spiderman.jpg",
    price: 399,
    discount: 10,
    finalPrice: 359,
    approved: "approved",
    isActive: true,
    seller: "Ashish Kumar",
    createdAt: "2025-06-15T19:00:09.000Z",
  },
  {
    id: "naruto-shadow-clone-001",
    title: "Naruto Shadow Clone",
    description: "Anime‑style poster of Naruto’s iconic shadow clone jutsu.",
    tags: ["Trending", "Anime"],
    collections: ["anime", "jutsu"],
    category: "anime",
    imageUrl: "https://example.com/naruto.jpg",
    price: 249,
    discount: 0,
    finalPrice: 249,
    approved: "pending",
    isActive: true,
    seller: "Ashish Kumar",
    createdAt: "2025-06-15T18:50:00.000Z",
  },
  {
    id: "iron-man-legacy-002",
    title: "Iron Man Legacy",
    description: "A sleek poster celebrating Iron Man’s technological legacy.",
    tags: ["Marvel"],
    collections: ["movies", "superhero"],
    category: "marvel",
    imageUrl: "https://example.com/ironman.jpg",
    price: 299,
    discount: 0,
    finalPrice: 299,
    approved: "rejected",
    isActive: true,
    seller: "Riya Singh",
    createdAt: "2025-06-15T18:45:30.000Z",
  },
  {
    id: "harry-potter-hogwarts-4-piece-set-1001",
    title: "Harry Potter Hogwarts 4 Piece Set",
    description: "Enchanting Hogwarts-themed 4‑piece poster set.",
    tags: ["movies", "fantasy"],
    collections: ["movies", "magic", "4-piece-sets"],
    category: "pop-culture",
    imageUrl: "https://example.com/hogwarts.jpg",
    price: 499,
    discount: 15,
    finalPrice: 424,
    approved: "approved",
    isActive: false,
    seller: "Priya Verma",
    createdAt: "2025-06-10T12:30:00.000Z",
  },
  {
    id: "draft-poster-005",
    title: "Draft Poster Example",
    description: "A poster in draft mode.",
    tags: ["test"],
    collections: ["test"],
    category: "test",
    imageUrl: "https://example.com/draft.jpg",
    price: 199,
    discount: 0,
    finalPrice: 199,
    approved: "draft",
    isActive: true,
    seller: "Ashish Kumar",
    createdAt: "2025-06-15T18:40:00.000Z",
  },
];

const Posters = () => {
  const { firestore } = useFirebase();
  const [posters, setPosters] = useState(initialPosters);
  const [filter, setFilter] = useState({ search: "", approved: "" });
  const [activeTab, setActiveTab] = useState("recent");
  const [showEditModal, setShowEditModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);

  // Uncomment to enable Firestore sync
  // useEffect(() => {
  //   if (!firestore) {
  //     console.error("Firestore instance is undefined. Check useFirebase context.");
  //     return;
  //   }
  //   const unsubscribe = onSnapshot(
  //     collection(firestore, "posters"),
  //     (snapshot) => {
  //       const updatedPosters = snapshot.docs.map((doc) => ({
  //         id: doc.id,
  //         ...doc.data(),
  //       }));
  //       setPosters(updatedPosters);
  //     },
  //     (error) => {
  //       console.error("Error fetching posters from Firestore:", error);
  //       alert(`Failed to fetch posters: ${error.message}`);
  //       setPosters(initialPosters);
  //     }
  //   );
  //   return () => unsubscribe();
  // }, [firestore]);

  // Handlers
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
      if (result.success) {
        setPosters((prev) => prev.filter((p) => p.id !== id));
      } else {
        alert("Failed to delete poster: " + result.error);
      }
    }
  };
  const approvePoster = async (id) => {
    const result = await approvePosterInFirebase(firestore, id);
    if (result.success) {
      setPosters((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, approved: "approved" } : p
        )
      );
    } else {
      alert("Failed to approve poster: " + result.error);
    }
  };
  const rejectPoster = async (id) => {
    const result = await rejectPosterInFirebase(firestore, id);
    if (result.success) {
      setPosters((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, approved: "rejected" } : p
        )
      );
    } else {
      alert("Failed to reject poster: " + result.error);
    }
  };
  const submitPoster = async (id) => {
    const result = await submitPosterInFirebase(firestore, id);
    if (result.success) {
      setPosters((prev) =>
        prev.map((p) =>
          p.id === id ? { ...p, approved: "pending" } : p
        )
      );
    } else {
      alert("Failed to submit poster: " + result.error);
    }
  };
  const savePoster = async (data, posterId) => {
    const result = await addPosterToFirebase(firestore, data, posterId);
    if (result.success) {
      setPosters((prev) =>
        editing
          ? prev.map((p) => (p.id === posterId ? { ...data, id: posterId } : p))
          : [...prev, { ...data, id: result.id }]
      );
      setShowEditModal(false);
      setEditing(null);
    } else {
      alert("Failed to save poster: " + result.error);
    }
  };

  // Lists for tabs
  const recentList = [...posters]
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5);
  const allFiltered = posters.filter(
    (p) =>
      (filter.approved === "" || p.approved === filter.approved) &&
      (filter.search === "" ||
        p.title.toLowerCase().includes(filter.search.toLowerCase()))
  );
  const draftsList = posters.filter((p) => p.approved === "draft");
  const pendingList = posters.filter((p) => p.approved === "pending");
  const publishedList = posters.filter((p) => p.approved === "approved");
  const rejectedList = posters.filter((p) => p.approved === "rejected");
  const collectionsMap = posters.reduce((map, p) => {
    p.collections.forEach((col) => {
      if (!map[col]) map[col] = [];
      map[col].push(p);
    });
    return map;
  }, {});

  return (
    <div className="container mt-4">
      <h2>🖼️ Posters Management</h2>

      <Tabs
        id="posters-tabs"
        activeKey={activeTab}
        onSelect={(k) => setActiveTab(k)}
        className="mb-3"
      >
        <Tab eventKey="recent" title="🕑 Recent">
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
          <CollectionsView
            collectionsMap={collectionsMap}
            onEdit={openEdit}
            onView={openView}
            onDelete={deletePoster}
            onApprove={approvePoster}
            onReject={rejectPoster}
            onSubmit={submitPoster}
          />
        </Tab>
      </Tabs>

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
          <PosterForm poster={editing} onSave={savePoster} />
        </Modal.Body>
      </Modal>
    </div>
  );
};

export default Posters;