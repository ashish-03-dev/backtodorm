import React, { useState, useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { useFirebase } from "../../context/FirebaseContext";
import { doc, onSnapshot, getDoc } from "firebase/firestore";
import { ref, getDownloadURL } from "firebase/storage";
import { Alert } from "react-bootstrap";
import { deletePoster } from "./sellerUtils";

export default function SellerLayout() {
  const { firestore, storage, user, userData } = useFirebase();
  const location = useLocation();
  const navigate = useNavigate();
  const [sellerData, setSellerData] = useState(null);
  const [posters, setPosters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewingPoster, setViewingPoster] = useState(null);
  const [showContentOnMobile, setShowContentOnMobile] = useState(false);
  const isMobile = window.innerWidth < 768;

  useEffect(() => {
    if (!firestore || !user || !userData?.sellerUsername) {
      setError("User or seller data not available.");
      setLoading(false);
      return;
    }

    // Fetch seller document
    const sellerDocRef = doc(firestore, "sellers", userData.sellerUsername);
    const unsubscribe = onSnapshot(
      sellerDocRef,
      (doc) => {
        if (doc.exists()) {
          setSellerData({
            totalPostersSold: doc.data().totalPostersSold || 0,
            totalEarnings: doc.data().totalEarnings || 0,
            pendingPayments: doc.data().pendingPayments || 0,
            approvedPosters: doc.data().approvedPosters || [],
            tempPosters: doc.data().tempPosters || [],
            rejectedPosters: doc.data().rejectedPosters || [],
          });
        } else {
          setError("Seller profile not found.");
          navigate("/account/become-seller", { replace: true });
        }
      },
      (err) => {
        setError(`Failed to fetch seller data: ${err.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [firestore, user, userData, navigate]);

  useEffect(() => {
    if (!sellerData || !firestore || !storage) {
      setLoading(false);
      return;
    }

    const fetchPosters = async () => {
      try {
        const tempPosterList = sellerData.tempPosters || [];
        const approvedPosterList = sellerData.approvedPosters || [];
        const rejectedPosterList = sellerData.rejectedPosters || [];

        const fetched = await Promise.all([
          // Process tempPosters (pending)
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
          // Process rejectedPosters (array of objects)
          ...rejectedPosterList.map(async (p) => {
            if (!p.id || !p.title || !p.rejectedAt) {
              console.warn(`Skipping invalid rejectedPosters entry: ${JSON.stringify(p)}`);
              return null;
            }
            return {
              id: p.id,
              title: p.title || "",
              status: p.status || "rejected",
              createdAt: p.rejectedAt || null,
              imageUrl: "",
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
    };

    fetchPosters();
  }, [sellerData, firestore, storage]);

  const handleViewPoster = async (poster) => {
    try {
      let posterData = {};
      let imageUrl = poster.imageUrl || "";

      if (poster.source === "rejectedPosters") {
        posterData = {
          title: poster.title || "",
          description: "",
          tags: [],
          collections: [],
          sizes: [],
          sellerUsername: sellerData?.sellerUsername || "",
          approved: false,
          isActive: false,
          originalImageUrl: "",
          imageUrl: "",
          status: poster.status || "rejected",
          createdAt: poster.createdAt || null,
        };
      } else {
        const collectionName = poster.source === "tempPosters" ? "tempPosters" : "posters";
        const posterDoc = await getDoc(doc(firestore, collectionName, poster.id));
        if (!posterDoc.exists()) {
          setError("Poster details not found.");
          return;
        }
        posterData = posterDoc.data();
        if (posterData.originalImageUrl || posterData.imageUrl) {
          try {
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
        sellerUsername: posterData.sellerUsername || sellerData?.sellerUsername || "",
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

  useEffect(() => {
    if (!isMobile) return;
    setShowContentOnMobile(location.pathname !== "/seller");
  }, [location.pathname, isMobile]);

  const handleSectionClick = (path) => {
    navigate(path);
    if (isMobile) {
      setShowContentOnMobile(true);
    }
  };

  const isActive = (path) => {
    if (path === "/seller/dashboard") {
      return !isMobile && (location.pathname === "/seller" || location.pathname === "/seller/dashboard");
    }
    return location.pathname === path;
  };

  const navItems = [
    { path: "/seller/dashboard", label: "Dashboard", icon: "bi-house" },
    { path: "/seller/sell-poster", label: "Sell Your Poster", icon: "bi-upload" },
    { path: "/seller/products", label: "My Products", icon: "bi-image" },
    { path: "/seller/payouts", label: "Payouts", icon: "bi-wallet2" },
  ];

  if (error) {
    return (
      <div className="p-4 p-md-5">
        <Alert variant="danger" onClose={() => setError("")} dismissible>
          {error}
        </Alert>
      </div>
    );
  }

  return (
    <div className="bg-light p-3">
      <div className="d-flex gap-3" style={{ minHeight: "calc(100svh - 97px)" }}>
        {!showContentOnMobile && (
          <div
            className={`bg-light d-flex flex-column gap-3 ${isMobile ? "flex-grow-1" : ""}`}
            style={{
              position: "sticky",
              top: "calc(65px + 1rem)",
               minWidth: "300px", 
               flexShrink: 0,
               maxHeight:"calc(100svh - 65px - 2rem)"
            }}
          >
            <div className="text-center p-4 bg-white shadow-sm">
              <h5 className="mb-0">Seller Dashboard</h5>
            </div>
            <div className="p-4 bg-white d-flex flex-column justify-content-between flex-grow-1 shadow-sm">
              <ul className="nav flex-column gap-2">
                {navItems.map(({ path, label, icon }) => (
                  <li className="nav-item" key={path}>
                    <div
                      className={`nav-link d-flex justify-content-between px-3 py-2 rounded sidebar-item ${isActive(path) ? "text-primary bg-light" : "text-dark"
                        }`}
                      onClick={() => handleSectionClick(path)}
                    >
                      <span>
                        <i className={`bi ${icon} me-2`}></i>
                        {label}
                      </span>
                      <i className="bi bi-chevron-right d-md-none"></i>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        <div
          className={`bg-white shadow-sm flex-grow-1 ${showContentOnMobile ? "d-block d-md-block" : "d-none d-md-block"
            }`}
        >
          <Outlet
            context={{
              sellerData,
              posters,
              loading,
              error,
              setError,
              viewingPoster,
              setViewingPoster,
              handleViewPoster,
              handleDeletePoster,
            }}
          />
        </div>
      </div>
    </div>
  );
}