import React, { useState, useEffect, useCallback } from "react";
import PropTypes from "prop-types";
import { Form, Alert } from "react-bootstrap";
import { collection, getDocs, setDoc, doc, getDoc } from "firebase/firestore";
import { useFirebase } from "../../../context/FirebaseContext"; // Assuming context is defined elsewhere
import SectionsTab from "./SectionsTab";

const ensureString = (value) => (typeof value === "string" ? value : "");
const isValidDocumentId = (id) => id && /^[a-z0-9-]+$/.test(id.trim());

const SectionManager = () => {
  const { firestore } = useFirebase();
  const [homeSections, setHomeSections] = useState([]);
  const [filter, setFilter] = useState({ search: "" });
  const [error, setError] = useState(null);

  const fetchSections = useCallback(async () => {
    if (!firestore) {
      setError("Firestore is not available.");
      return;
    }
    try {
      const homeSectionsRef = collection(firestore, "homeSections");
      const snapshot = await getDocs(homeSectionsRef);

      if (!snapshot.docs.find((d) => d.id === "sections")) {
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
      setError(null);
    } catch (err) {
      console.error("Fetch error:", err);
      setError(
        err.code === "permission-denied"
          ? "Permission denied: Check Firestore rules."
          : `Failed to fetch sections: ${err.message}`
      );
    }
  }, [firestore]);

  useEffect(() => {
    fetchSections();
  }, [fetchSections]);

  const validateForm = useCallback(
    async (formData, selectedItem, items) => {
      const errors = {};
      const id = ensureString(formData.id).trim();

      if (!id) {
        errors.id = "Section ID is required.";
      } else if (!isValidDocumentId(id)) {
        errors.id = "Invalid ID format. Use lowercase alphanumeric characters and hyphens only.";
      } else if (!selectedItem && items.some((s) => s.id === id)) {
        errors.id = "Section ID already exists.";
      }

      const posterErrors = await Promise.all(
        (formData.posterIds || []).map(async (id) => {
          const safeId = ensureString(id).trim();
          if (!safeId) return null;
          if (!isValidDocumentId(safeId)) return "Invalid poster ID format.";
          try {
            const posterRef = doc(firestore, "posters", safeId);
            const posterSnap = await getDoc(posterRef);
            return posterSnap.exists() ? null : "Poster ID does not exist.";
          } catch (err) {
            return `Failed to validate poster ID: ${err.message}`;
          }
        })
      );

      if (posterErrors.some((err) => err)) {
        errors.posterIds = posterErrors;
      }

      return errors;
    },
    [firestore]
  );

  const handleSubmit = useCallback(
    async (formData, selectedItem) => {
      try {
        const id = ensureString(formData.id).trim();
        if (!isValidDocumentId(id)) {
          throw new Error("Invalid section ID format.");
        }

        const posterIds = (formData.posterIds || [])
          .map(ensureString)
          .filter((id) => id.trim());
        const newSection = { id, posterIds };

        const sectionsDocRef = doc(firestore, "homeSections", "sections");
        const sectionsSnapshot = await getDocs(collection(firestore, "homeSections"));
        const sectionList =
          sectionsSnapshot.docs.find((d) => d.id === "sections")?.data().sectionList || [];

        const updatedSectionList = selectedItem
          ? sectionList.map((s) => (s.id === id ? newSection : s))
          : [...sectionList, newSection];

        await setDoc(sectionsDocRef, { sectionList: updatedSectionList });
        setHomeSections(updatedSectionList.map((item) => ({ ...item, type: "section" })));
        setError(null);
      } catch (err) {
        console.error("Submission error:", err);
        setError(`Failed to save section: ${err.message}`);
      }
    },
    [firestore]
  );

  const handleDelete = useCallback(
    async (item) => {
      try {
        const sectionsDocRef = doc(firestore, "homeSections", "sections");
        const sectionsSnapshot = await getDocs(collection(firestore, "homeSections"));
        const sectionList =
          sectionsSnapshot.docs.find((d) => d.id === "sections")?.data().sectionList || [];
        const updatedSectionList = sectionList.filter((s) => s.id !== item.id);

        await setDoc(sectionsDocRef, { sectionList: updatedSectionList });
        setHomeSections(updatedSectionList.map((item) => ({ ...item, type: "section" })));
        setError(null);
      } catch (err) {
        console.error("Deletion error:", err);
        setError(`Failed to delete section: ${err.message}`);
      }
    },
    [firestore]
  );

  return (
    <div className="p-4 p-md-5">
      <h3 className="mb-4">🏠 Section Management</h3>
      <div className="row g-3 mb-3">
        <div className="col-md-5">
          <Form.Control
            type="text"
            placeholder="Search by Section Name/ID"
            value={filter.search}
            onChange={(e) => setFilter({ search: e.target.value })}
            aria-label="Search sections"
          />
        </div>
      </div>
      {error && (
        <Alert variant="danger" onClose={() => setError(null)} dismissible>
          {error}
        </Alert>
      )}
      <SectionsTab
        sections={homeSections}
        setSections={setHomeSections}
        filter={filter}
        validateForm={validateForm}
        handleSubmit={handleSubmit}
        handleDelete={handleDelete}
      />
    </div>
  );
};

SectionManager.propTypes = {
  firestore: PropTypes.object,
};

export default SectionManager;