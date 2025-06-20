import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Form, Alert, Nav, Container } from "react-bootstrap";
import { collection, getDocs, setDoc, doc, deleteDoc, getDoc } from "firebase/firestore";
import { useFirebase } from "../../../context/FirebaseContext";
import HomeCollectionsTab from "./HomeCollectionsTab";
import SectionsTab from "./SectionsTab";
import MenusTab from "./MenusTab";
import StandaloneCollectionsTab from "./StandaloneCollectionsTab";
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
  const [menus, setMenus] = useState([]);
  const [filter, setFilter] = useState({ search: "", homeSubTab: "collections" });
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
        if (!homeSectionsSnapshot.docs.find((d) => d.id === "menus")) {
          await setDoc(doc(homeSectionsRef, "menus"), {
            menuList: [
              { id: "shopMenu", sections: [], images: [] },
              { id: "collectionsMenu", sections: [], images: [] },
            ],
          });
        }

        const updatedSnapshot = await getDocs(homeSectionsRef);
        const sectionsDoc = updatedSnapshot.docs.find((d) => d.id === "sections");
        const menusDoc = updatedSnapshot.docs.find((d) => d.id === "menus");

        setHomeSections(
          (sectionsDoc?.data().sectionList || []).map((item) => ({
            ...item,
            type: "section",
          }))
        );
        setMenus(
          (menusDoc?.data().menuList || []).map((item) => ({
            ...item,
            type: "menu",
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
    if (type === "menu") {
      const sectionErrors = await Promise.all(
        (formData.sections || []).map(async (sec, secIndex) => {
          const secErrors = {};
          const title = ensureString(sec.title).trim();
          if (!title) secErrors.title = "Section title is required.";
          const itemErrors = (sec.items || []).map((item) => {
            const name = ensureString(item.name).trim();
            const link = ensureString(item.link).trim();
            if (!name) return "Item name is required.";
            if (!link) return "Item link is required.";
            return null;
          });
          if (itemErrors.some((err) => err)) secErrors.items = itemErrors;
          return Object.keys(secErrors).length ? { index: secIndex, errors: secErrors } : null;
        })
      );
      if (sectionErrors.some((err) => err)) errors.sections = sectionErrors.filter((err) => err);

      const imageErrors = await Promise.all(
        (formData.images || []).map(async (img, imgIndex) => {
          const src = ensureString(img.src).trim();
          if (!src) return null;
          if (!isValidDocumentId(src)) return "Invalid image ID format.";
          try {
            const posterRef = doc(firestore, "posters", src);
            const posterSnap = await getDoc(posterRef);
            if (!posterSnap.exists()) return "Image ID does not exist.";
            return null;
          } catch (err) {
            return `Failed to validate ID: ${err.message}`;
          }
        })
      );
      if (imageErrors.some((err) => err)) errors.images = imageErrors;
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
      } else if (type === "menu") {
        const id = ensureString(formData.id).trim();
        if (!isValidDocumentId(id)) {
          throw new Error("Invalid menu ID format.");
        }
        const sections = (formData.sections || []).map((sec) => ({
          title: ensureString(sec.title).trim(),
          items: (sec.items || [])
            .filter((item) => ensureString(item.name).trim() && ensureString(item.link).trim())
            .map((item) => ({ name: item.name.trim(), link: item.link.trim() })),
        }));
        const images = (formData.images || [])
          .filter((img) => ensureString(img.src).trim())
          .map((img) => ({
            src: img.src.trim(),
            alt: ensureString(img.alt).trim(),
            label: ensureString(img.label).trim(),
            link: ensureString(img.link).trim(),
          }));
        const newMenu = { id, sections, images };
        const menusDocRef = doc(firestore, "homeSections", "menus");
        const menusDoc = await getDocs(collection(firestore, "homeSections"));
        const menuList = menusDoc.docs.find((d) => d.id === "menus")?.data().menuList || [];
        const updatedMenuList = selectedItem
          ? menuList.map((m) => (m.id === id ? newMenu : m))
          : [...menuList, newMenu];
        await setDoc(menusDocRef, { menuList: updatedMenuList });
        setItems(updatedMenuList.map((item) => ({ ...item, type: "menu" })));
      }

      const newIds = [
        ...(formData.posterIds || []),
        ...(formData.images?.map((img) => img.src) || []),
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
      } else if (type === "menu") {
        const menusDocRef = doc(firestore, "homeSections", "menus");
        const menusDoc = await getDocs(collection(firestore, "homeSections"));
        const menuList = menusDoc.docs.find((d) => d.id === "menus")?.data().menuList || [];
        const updatedMenuList = menuList.filter((m) => m.id !== item.id);
        await setDoc(menusDocRef, { menuList: updatedMenuList });
        setItems(updatedMenuList.map((item) => ({ ...item, type: "menu" })));
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
    <Container className="mt-4">
      <h2 className="mb-3">🏠 Section Management</h2>
      <div className="row g-3 mb-3">
        <div className="col-md-5">
          <Form.Control
            type="text"
            placeholder={`Search by ${
              filter.homeSubTab === "collections"
                ? "Collection"
                : filter.homeSubTab === "sections"
                ? "Section"
                : filter.homeSubTab === "menus"
                ? "Menu"
                : "Standalone Collection"
            } Name/ID`}
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
          <Nav.Link eventKey="collections">Home Collections</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="sections">Sections</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="menus">Menus</Nav.Link>
        </Nav.Item>
        <Nav.Item>
          <Nav.Link eventKey="standaloneCollections">Standalone Collections</Nav.Link>
        </Nav.Item>
      </Nav>
      <div className="tab-content">
        {filter.homeSubTab === "collections" && (
          <HomeCollectionsTab
            filter={filter}
            posterImages={posterImages}
            setPosterImages={setPosterImages}
            handleFetchImage={handleFetchImage}
          />
        )}
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
        {filter.homeSubTab === "menus" && (
          <MenusTab
            menus={menus}
            setMenus={setMenus}
            filter={filter}
            posterImages={posterImages}
            validateForm={(formData, selectedItem) => validateForm("menu", formData, selectedItem, menus)}
            handleSubmit={(formData, selectedItem) => handleSubmit("menu", formData, selectedItem, setMenus, setError)}
            handleDelete={(item) => handleDelete("menu", item, setMenus)}
            handleFetchImage={handleFetchImage}
          />
        )}
        {filter.homeSubTab === "standaloneCollections" && (
          <StandaloneCollectionsTab
            filter={filter}
            posterImages={posterImages}
            setPosterImages={setPosterImages}
            handleFetchImage={handleFetchImage}
          />
        )}
      </div>
      {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
    </Container>
  );
};

SectionManager.propTypes = {
  firestore: PropTypes.object,
};

export default SectionManager;