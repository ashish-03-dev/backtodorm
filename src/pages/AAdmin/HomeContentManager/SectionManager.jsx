import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Form, Alert, Nav, Container } from "react-bootstrap";
import { collection, getDocs, setDoc, doc, deleteDoc, getDoc } from "firebase/firestore";
import { useFirebase } from "../../../context/FirebaseContext";
import SectionsTab from "./SectionsTab";
import CollectionsPack from "./CollectionsPacks";
import { fetchImages, fetchFormPosterImage } from "./utils";

// Helper to ensure string or empty string
const ensureString = (value) => (typeof value === "string" ? value : "");

// Validate Firestore document ID
const isValidDocumentId = (id) => {
  return id && /^[a-z0-9-]+$/.test(id.trim());
};

const SectionManager = () => {
  const { firestore } = useFirebase();
  const [homeSections, setHomeSections] = useState([]);
  const [filter, setFilter] = useState({ search: "", homeSubTab: "sections" });
  const [error, setError] = useState(null);
  const [posterImages, setPosterImages] = useState({});

  useEffect(() => {
    const initializeAndFetchData = async () => {
      if (!firestore) {
        console.log("Firestore not initialized");
        return;
      }
      try {
        const homeSectionsRef = collection(firestore, "homeSections");
        const homeSectionsSnapshot = await getDocs(homeSectionsRef);

        if (!homeSectionsSnapshot.docs.find((d) => d.id === "sections")) {
          await setDoc(doc(homeSectionsRef, "sections"), { sectionList: [] });
        }

        const updatedSnapshot = await getDocs(homeSectionsRef);
        const sectionsDoc = updatedSnapshot.docs.find((d) => d.id === "sections");

        setHomeSections(
          (sectionsDoc?.data().sectionList || []).map((item) => ({
            ...item,
            type: "section",
          }))
        );
      } catch (err) {
        console.error("Fetch error:", err);
        setError(
          err.code === "permission-denied"
            ? "Permission denied: Check Firestore rules."
            : `Failed to fetch data: ${err.message}`
        );
      }
    };
    initializeAndFetchData();
  }, [firestore]);

  const validateForm = async (type, formData, selectedItem, items) => {
    const errors = {};
    if (type !== "collection") {
      const id = ensureString(formData.id).trim();
      if (!id) {
        errors.id = "ID is required.";
      } else if (!isValidDocumentId(id)) {
        errors.id = "Invalid ID format. Use lowercase alphanumeric characters and hyphens only.";
      } else if (!selectedItem && items.some((s) => s.id === id)) {
        errors.id = "ID already exists.";
      }
    }
    if (type === "section") {
      const posterErrors = await Promise.all(
        (formData.posterIds || []).map(async (id, index) => {
          const safeId = ensureString(id).trim();
          if (!safeId) return null;
          if (!isValidDocumentId(safeId)) return "Invalid ID format.";
          try {
            const posterRef = doc(firestore, "posters", safeId);
            const posterSnap = await getDoc(posterRef);
            if (!posterSnap.exists()) return "Poster ID does not exist.";
            return null;
          } catch (err) {
            return `Failed to validate ID: ${err.message}`;
          }
        })
      );
      if (posterErrors.some((err) => err)) errors.posterIds = posterErrors;
    }
    return errors;
  };

  const handleSubmit = async (type, formData, selectedItem, setItems, setError) => {
    try {
      if (type === "section") {
        const id = ensureString(formData.id).trim();
        if (!isValidDocumentId(id)) {
          throw new Error("Invalid section ID format.");
        }
        const posterIds = (formData.posterIds || []).map(ensureString).filter((id) => id.trim());
        const newSection = { id, posterIds };
        const sectionsDocRef = doc(firestore, "homeSections", "sections");
        const sectionsDoc = await getDocs(collection(firestore, "homeSections"));
        const sectionList = sectionsDoc.docs.find((d) => d.id === "sections")?.data().sectionList || [];
        const updatedSectionList = selectedItem
          ? sectionList.map((s) => (s.id === id ? newSection : s))
          : [...sectionList, newSection];
        await setDoc(sectionsDocRef, { sectionList: updatedSectionList });
        setItems(updatedSectionList.map((item) => ({ ...item, type: "section" })));
      }

      const newIds = [
        ...(formData.posterIds || []),
      ].map(ensureString).filter((id) => id.trim() && !posterImages[id]);
      if (newIds.length) {
        const imageResults = await fetchImages(newIds, firestore);
        setPosterImages((prev) => ({ ...prev, ...Object.fromEntries(imageResults) }));
      }
      setError(null);
    } catch (err) {
      console.error("Submission error:", err);
      setError(`Failed to save ${type}: ${err.message}`);
      throw err;
    }
  };

  const handleDelete = async (type, item, setItems) => {
    try {
      if (type === "section") {
        const sectionsDocRef = doc(firestore, "homeSections", "sections");
        const sectionsDoc = await getDocs(collection(firestore, "homeSections"));
        const sectionList = sectionsDoc.docs.find((d) => d.id === "sections")?.data().sectionList || [];
        const updatedSectionList = sectionList.filter((s) => s.id !== item.id);
        await setDoc(sectionsDocRef, { sectionList: updatedSectionList });
        setItems(updatedSectionList.map((item) => ({ ...item, type: "section" })));
      }
      setError(null);
    } catch (err) {
      console.error("Deletion error:", err);
      setError(`Failed to delete ${type}: ${err.message}`);
      throw err;
    }
  };

  const handleFetchImage = (id, setFormPosterImages) => {
    const safeId = ensureString(id).trim();
    if (safeId && !posterImages[safeId]) {
      fetchFormPosterImage(safeId, firestore, setFormPosterImages, posterImages);
    }
  };

  return (
    <div className="p-4 p-md-5">
      <h3 className="mb-4">🏠 Section Management</h3>
      <div className="row g-3 mb-3">
        <div className="col-md-5">
          <Form.Control
            type="text"
            placeholder={`Search by ${filter.homeSubTab === "sections" ? "Section" : "Standalone Collection"} Name/ID`}
            value={filter.search}
            onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
            aria-label={`Search ${filter.homeSubTab}`}
          />
        </div>
      </div>
      <Nav
        variant="tabs"
        activeKey={filter.homeSubTab}
        onSelect={(k) => setFilter((prev) => ({ ...prev, homeSubTab: k, search: "" }))}
        className="mb-3"
      >
        <Nav.Item>
          <Nav.Link eventKey="sections">Sections</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="standaloneCollections">Collections Packs</Nav.Link>
        </Nav.Item>
      </Nav>
      <div className="tab-content">
        {filter.homeSubTab === "sections" && (
          <SectionsTab
            sections={homeSections}
            setSections={setHomeSections}
            filter={filter}
            posterImages={posterImages}
            validateForm={(formData, selectedItem) => validateForm("section", formData, selectedItem, homeSections)}
            handleSubmit={(formData, selectedItem) => handleSubmit("section", formData, selectedItem, setHomeSections, setError)}
            handleDelete={(item) => handleDelete("section", item, setHomeSections)}
            handleFetchImage={handleFetchImage}
          />
        )}
        {filter.homeSubTab === "standaloneCollections" && (
          <CollectionsPack
            filter={filter}
            posterImages={posterImages}
            setPosterImages={setPosterImages}
            handleFetchImage={handleFetchImage}
          />
        )}
      </div>
      {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
    </div>
  );
};

SectionManager.propTypes = {
  firestore: PropTypes.object,
};

export default SectionManager;