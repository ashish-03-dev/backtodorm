import React, { useState, useEffect, Suspense, lazy } from "react";
import { Button, Modal, Spinner, Alert, Nav, Tab } from "react-bootstrap";
import { useFirebase } from "../../context/FirebaseContext";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import SellerPosterForm from "./SellerPosterForm";
import { deletePoster } from "./sellerUtils";

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
  const [activeTab, setActiveTab] = useState("pending");

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user || !firestore) {
        setError("Please log in to continue.");
        setLoading(false);
        return;
      }
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
        const approvedPosterList = sellerData.approvedPosters || []; // Array of poster IDs (strings)
        const rejectedPosterList = sellerData.rejectedPosters || []; // Array of objects with title, rejectedAt, status

        try {
          const fetched = await Promise.all([
            // Fetch tempPosters (pending)
            ...tempPosterList.map(async (p) => {
              if (!p.id) {
                console.warn(`Skipping invalid tempPosters entry: ${JSON.stringify(p)}`);
                return null;
              }
              const posterDoc = await getDoc(doc(firestore, "tempPosters", p.id));
              if (!posterDoc.exists()) {
                console.warn(`Poster not found: tempPosters/${p.id}`);
                return null;
              }
              const posterData = posterDoc.data();
              if (!posterData) {
                console.warn(`Empty data for poster: tempPosters/${p.id}`);
                return null;
              }
              return {
                id: p.id,
                title: posterData.title || "",
                status: p.status || "pending",
                createdAt: posterData.createdAt || p.createdAt || null,
                imageUrl: posterData.originalImageUrl || "",
                source: "tempPosters",
              };
            }),
            // Fetch approvedPosters (array of poster IDs)
            ...approvedPosterList.map(async (posterId) => {
              if (!posterId) {
                console.warn(`Skipping invalid approvedPosters ID: ${posterId}`);
                return null;
              }
              const posterDoc = await getDoc(doc(firestore, "posters", posterId));
              if (!posterDoc.exists()) {
                console.warn(`Poster not found: posters/${posterId}`);
                return null;
              }
              const posterData = posterDoc.data();
              if (!posterData) {
                console.warn(`Empty data for poster: posters/${posterId}`);
                return null;
              }
              return {
                id: posterId,
                title: posterData.title || "",
                status: "approved",
                createdAt: posterData.createdAt || null,
                imageUrl: posterData.imageUrl || "",
                approved: posterData.approved || true,
                source: "posters",
              };
            }),
            // Handle rejectedPosters (array of objects with title, rejectedAt, status)
            ...rejectedPosterList.map(async (p) => {
              if (!p.id || !p.title || !p.rejectedAt) {
                console.warn(`Skipping invalid rejectedPosters entry: ${JSON.stringify(p)}`);
                return null;
              }
              return {
                id: p.id,
                title: p.title || "",
                status: p.status || "rejected",
                createdAt: p.rejectedAt || null, // Use rejectedAt as createdAt for consistency in sorting
                imageUrl: "", // No image URL unless provided in rejectedPosters
                source: "rejectedPosters",
              };
            }),
          ]);
          // Sort by createdAt (descending, most recent first)
          const validPosters = fetched.filter(Boolean).sort((a, b) => {
            const aTime = a.createdAt?.seconds ? a.createdAt.seconds * 1000 : a.createdAt || 0;
            const bTime = b.createdAt?.seconds ? b.createdAt.seconds * 1000 : b.createdAt || 0;
            return bTime - aTime;
          });

          setPosters(validPosters);
        } catch (err) {
          console.error("Error fetching posters:", err);
          setError(`Error fetching posters: ${err.message}`);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error("Error subscribing to seller data:", err);
        setError(`Error subscribing to seller data: ${err.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, user, sellerUsername]);

  const handleCreatePoster = () => {
    setShowCreateModal(true);
  };

  const handleViewPoster = async (poster) => {
    try {
      let posterData = {};
      let imageUrl = poster.imageUrl || "";

      if (poster.source === "rejectedPosters") {
        // For rejected posters, use data directly from rejectedPosters object
        posterData = {
          title: poster.title || "",
          description: "",
          tags: [],
          collections: [],
          sizes: [],
          sellerUsername: sellerUsername || "",
          approved: false,
          isActive: false,
          originalImageUrl: "",
          imageUrl: "",
          status: poster.status || "rejected",
          createdAt: poster.createdAt || null,
        };
      } else {
        // For pending (tempPosters) and approved (posters)
        const collectionName = poster.source === "tempPosters" ? "tempPosters" : "posters";
        const posterDoc = await getDoc(doc(firestore, collectionName, poster.id));
        if (!posterDoc.exists()) {
          setError("Poster details not found.");
          return;
        }
        posterData = posterDoc.data();
        if (posterData.originalImageUrl || posterData.imageUrl) {
          try {
            const { ref, getDownloadURL } = await import("firebase/storage");
            const imageRef = ref(storage, posterData.originalImageUrl || posterData.imageUrl);
            imageUrl = await getDownloadURL(imageRef);
          } catch (err) {
            console.warn(`Failed to load image URL for ${poster.id}: ${err.message}`);
          }
        }
      }

      setViewingPoster({
        id: poster.id,
        title: posterData.title || "",
        description: posterData.description || "",
        tags: Array.isArray(posterData.tags) ? posterData.tags : [],
        collections: Array.isArray(posterData.collections) ? posterData.collections : [],
        sizes: Array.isArray(posterData.sizes) ? posterData.sizes : [],
        sellerUsername: posterData.sellerUsername || sellerUsername || "",
        approved: posterData.approved || poster.status === "approved",
        isActive: posterData.isActive ?? true,
        originalImageUrl: posterData.originalImageUrl || "",
        imageUrl: imageUrl,
        status: poster.status,
        createdAt: posterData.createdAt || poster.createdAt || null,
        source: poster.source,
      });
    } catch (err) {
      setError(`Failed to load poster details: ${err.message}`);
    }
  };

  const handleDeletePoster = async (id, source) => {
    if (window.confirm("Are you sure you want to delete this poster?")) {
      const result = await deletePoster(firestore, storage, id, source);
      if (!result.success) setError(`Failed to delete poster: ${result.error}`);
    }
  };

  const handleCloseCreateModal = () => {
    setShowCreateModal(false);
  };

  if (loading) {
    return (
      <div
        className="d-flex flex-column justify-content-center align-items-center"
        style={{ minHeight: "100%" }}
      >
        <Spinner animation="border" className="d-block text-primary" role="status">
          {/* <span className="visually-hidden">Loading...</span> */}
        </Spinner>
        <p className="mt-2 text-muted">Loading data...</p>
      </div>
    );
  }

  const pendingPosters = posters.filter((p) => p.status === "pending");
  const approvedPosters = posters.filter((p) => p.status === "approved");
  const rejectedPosters = posters.filter((p) => p.status === "rejected");

  return (
    <div className="p-4 p-md-5">
      <h4 className="mb-4">🍭 My Products</h4>
      {error && (
        <Alert variant="danger" onClose={() => setError("")} dismissible>
          {error}
        </Alert>
      )}
      <Button variant="primary" className="mb-3" onClick={handleCreatePoster}>
        + Create New Poster
      </Button>

      <Tab.Container activeKey={activeTab} onSelect={(k) => setActiveTab(k)}>
        <Nav variant="tabs" className="mb-3">
          <Nav.Item>
            <Nav.Link eventKey="pending">Pending ({pendingPosters.length})</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="approved">Approved ({approvedPosters.length})</Nav.Link>
          </Nav.Item>
          <Nav.Item>
            <Nav.Link eventKey="rejected">Rejected ({rejectedPosters.length})</Nav.Link>
          </Nav.Item>
        </Nav>
        <Tab.Content>
          <Tab.Pane eventKey="pending">
            <Suspense fallback={<Spinner animation="border" className="d-block mx-auto my-3" />}>
              <PosterTable
                posters={pendingPosters}
                onView={handleViewPoster}
                onDelete={handleDeletePoster}
              />
            </Suspense>
          </Tab.Pane>
          <Tab.Pane eventKey="approved">
            <Suspense fallback={<Spinner animation="border" className="d-block mx-auto my-3" />}>
              <PosterTable
                posters={approvedPosters}
                onView={handleViewPoster}
                onDelete={handleDeletePoster}
              />
            </Suspense>
          </Tab.Pane>
          <Tab.Pane eventKey="rejected">
            <Suspense fallback={<Spinner animation="border" className="d-block mx-auto my-3" />}>
              <PosterTable
                posters={rejectedPosters}
                onView={handleViewPoster}
                onDelete={handleDeletePoster}
              />
            </Suspense>
          </Tab.Pane>
        </Tab.Content>
      </Tab.Container>

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