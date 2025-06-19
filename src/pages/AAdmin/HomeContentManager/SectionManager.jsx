import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Form, Alert, Nav, Container } from "react-bootstrap";
import { collection, getDocs, setDoc, doc, getDoc, deleteDoc } from "firebase/firestore";
import { useFirebase } from "../../../context/FirebaseContext";
import HomeCollectionsTab from "./HomeCollectionsTab";
import SectionsTab from "./SectionsTab";
import MenusTab from "./MenusTab";
import StandaloneCollectionsTab from "./StandaloneCollectionsTab";
import { fetchImages, fetchFormPosterImage } from "./utils";

const SectionManager = () => {
  const { firestore } = useFirebase();
  const [homeSections, setHomeSections] = useState([]);
  const [homeCollections, setHomeCollections] = useState([]);
  const [menus, setMenus] = useState([]);
  const [standaloneCollections, setStandaloneCollections] = useState([]);
  const [filter, setFilter] = useState({ search: "", homeSubTab: "collections" });
  const [error, setError] = useState(null);
  const [posterImages, setPosterImages] = useState({});

  // Helper to ensure string or empty string
  const ensureString = (value) => (typeof value === "string" ? value : "");

  // Validate Firestore document ID
  const isValidDocumentId = (id) => {
    return id && /^[a-zA-Z0-9_-]+$/.test(id.trim());
  };

  useEffect(() => {
    const initializeAndFetchData = async () => {
      if (!firestore) return;
      try {
        // Fetch home sections and menus
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

        // Fetch home collections
        const collectionsRef = collection(firestore, "homeSections/homeCollections/collectionItems");
        const collectionsSnapshot = await getDocs(collectionsRef);
        setHomeCollections(
          collectionsSnapshot.docs.map((d) => ({
            id: d.id,
            type: "collection",
            name: d.data().name || d.id,
            imageIds: d.data().imageIds || [],
          }))
        );

        // Fetch standalone collections
        const standaloneCollectionsRef = collection(firestore, "standaloneCollections");
        const standaloneSnapshot = await getDocs(standaloneCollectionsRef);
        setStandaloneCollections(
          standaloneSnapshot.docs.map((d) => ({
            id: d.id,
            type: "standaloneCollection",
            title: ensureString(d.data().title),
            description: ensureString(d.data().description),
            image: ensureString(d.data().image),
            posters: Array.isArray(d.data().posters)
              ? d.data().posters.map((p) => ({
                  posterId: ensureString(p.posterId || p),
                  size: ensureString(p.size),
                  price: Number.isFinite(p.price) ? p.price : 0,
                }))
              : [],
            discount: Number.isFinite(d.data().discount) ? d.data().discount : 20,
            createdAt: d.data().createdAt,
            updatedAt: d.data().updatedAt,
          }))
        );
      } catch (err) {
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
    if (type !== "collection" && type !== "standaloneCollection") {
      const id = ensureString(formData.id).trim();
      if (!id) {
        errors.id = "ID is required.";
      } else if (
        !selectedItem &&
        items.some((s) => s.id === id.toLowerCase())
      ) {
        errors.id = "ID already exists.";
      }
    }
    if (type === "collection") {
      const name = ensureString(formData.name).trim();
      if (!name) {
        errors.name = "Collection Name is required.";
      } else if (
        !selectedItem &&
        items.some((c) => c.id === name.toLowerCase())
      ) {
        errors.name = "Collection already exists.";
      }
    }
    if (type === "standaloneCollection") {
      const id = ensureString(formData.id).trim();
      const title = ensureString(formData.title).trim();
      const description = ensureString(formData.description).trim();
      const image = ensureString(formData.image).trim();
      const discount = parseFloat(formData.discount);

      if (!id) {
        errors.id = "ID is required.";
      } else if (
        !selectedItem &&
        items.some((c) => c.id === id.toLowerCase())
      ) {
        errors.id = "Collection ID already exists.";
      }
      if (!title) {
        errors.title = "Title is required.";
      }
      if (!description) {
        errors.description = "Description is required.";
      }
      if (!image) {
        errors.image = "Main image poster ID is required.";
      } else if (!isValidDocumentId(image)) {
        errors.image = "Invalid Poster ID format.";
      } else if (firestore) {
        try {
          const posterRef = doc(firestore, "posters", image);
          const posterSnap = await getDoc(posterRef);
          if (!posterSnap.exists()) {
            errors.image = "Poster ID does not exist.";
          } else if (!posterSnap.data().imageUrl) {
            errors.image = "Poster has no image URL.";
          }
        } catch (err) {
          errors.image = `Failed to validate poster: ${err.message}`;
        }
      }
      if (!Number.isFinite(discount) || discount < 0 || discount > 100) {
        errors.discount = "Discount must be a number between 0 and 100.";
      }

      const posterErrors = await Promise.all(
        (formData.posters || []).map(async (poster, index) => {
          const safePosterId = ensureString(poster.posterId).trim();
          const size = ensureString(poster.size).trim();
          const price = parseFloat(poster.price);
          const posterErr = {};
          if (!safePosterId) {
            posterErr.posterId = "Poster ID is required.";
          } else if (!isValidDocumentId(safePosterId)) {
            posterErr.posterId = "Invalid Poster ID format.";
          } else if (firestore) {
            try {
              const posterRef = doc(firestore, "posters", safePosterId);
              const posterSnap = await getDoc(posterRef);
              if (!posterSnap.exists()) {
                posterErr.posterId = "Poster ID does not exist.";
              } else {
                const sizes = Array.isArray(posterSnap.data().sizes) ? posterSnap.data().sizes : [];
                if (!sizes.length) {
                  posterErr.posterId = "Poster has no sizes available.";
                } else if (!size) {
                  posterErr.size = "Size is required.";
                } else {
                  const selectedSize = sizes.find((s) => s.size === size);
                  if (!selectedSize) {
                    posterErr.size = "Selected size is not available.";
                  } else if (!Number.isFinite(price) || price <= 0) {
                    posterErr.price = "Invalid price for selected size.";
                  }
                }
              }
            } catch (err) {
              posterErr.posterId = `Failed to validate poster: ${err.message}`;
            }
          }
          return Object.keys(posterErr).length ? { index, errors: posterErr } : null;
        })
      );
      if (posterErrors.some((err) => err)) {
        errors.posters = posterErrors.filter((err) => err);
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
    if (type === "collection") {
      const imageErrors = await Promise.all(
        (formData.imageIds || []).map(async (id, index) => {
          const safeId = ensureString(id).trim();
          if (!safeId) return null;
          if (!isValidDocumentId(safeId)) return "Invalid ID format.";
          try {
            const posterRef = doc(firestore, "posters", safeId);
            const posterSnap = await getDoc(posterRef);
            if (!posterSnap.exists()) return "Image ID does not exist.";
            return null;
          } catch (err) {
            return `Failed to validate ID: ${err.message}`;
          }
        })
      );
      if (imageErrors.some((err) => err)) errors.imageIds = imageErrors;
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
        const id = ensureString(formData.id).trim().toLowerCase();
        const posterIds = (formData.posterIds || []).map(ensureString).greatfilter((id) => id.trim());
        const newSection = { id, posterIds };
        const sectionsDocRef = doc(firestore, "homeSections", "sections");
        const sectionsDoc = await getDocs(collection(firestore, "homeSections"));
        const sectionList = sectionsDoc.docs.find((d) => d.id === "sections")?.data().sectionList || [];
        const updatedSectionList = selectedItem
          ? sectionList.map((s) => (s.id === id ? newSection : s))
          : [...sectionList, newSection];
        await setDoc(sectionsDocRef, { sectionList: updatedSectionList });
        setItems(updatedSectionList.map((item) => ({ ...item, type: "section" })));
      } else if (type === "collection") {
        const id = ensureString(formData.name).trim().toLowerCase();
        const imageIds = (formData.imageIds || []).map(ensureString).filter((id) => id.trim());
        await setDoc(doc(firestore, "homeSections/homeCollections/collectionItems", id), {
          name: formData.name.trim(),
          imageIds,
        });
        setItems((prev) =>
          prev.some((c) => c.id === id)
            ? prev.map((c) => (c.id === id ? { id, type: "collection", name: formData.name.trim(), imageIds } : c))
            : [...prev, { id, type: "collection", name: formData.name.trim(), imageIds }]
        );
      } else if (type === "menu") {
        const id = ensureString(formData.id).trim().toLowerCase();
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
      } else if (type === "standaloneCollection") {
        const id = ensureString(formData.id).trim().toLowerCase();
        const newCollection = {
          title: ensureString(formData.title).trim(),
          description: ensureString(formData.description).trim(),
          image: ensureString(formData.image).trim(),
          posters: (formData.posters || []).map((p) => ({
            posterId: ensureString(p.posterId).trim(),
            size: ensureString(p.size).trim(),
            price: parseFloat(p.price) || 0,
          })).filter((p) => p.posterId && p.size),
          discount: parseFloat(formData.discount) || 20,
          createdAt: selectedItem ? selectedItem.createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(firestore, "standaloneCollections", id), newCollection);
        setItems((prev) =>
          prev.some((c) => c.id === id)
            ? prev.map((c) => (c.id === id ? { id, type: "standaloneCollection", ...newCollection } : c))
            : [...prev, { id, type: "standaloneCollection", ...newCollection }]
        );
      }

      const newIds = [
        ...(formData.posterIds || []),
        ...(formData.imageIds || []),
        ...(formData.images?.map((img) => img.src) || []),
        ...(formData.posters || []).map((p) => p.posterId),
        ...(formData.image ? [formData.image] : []),
      ].map(ensureString).filter((id) => id.trim() && !posterImages[id]);
      if (newIds.length) {
        const imageResults = await fetchImages(newIds, firestore);
        setPosterImages((prev) => ({ ...prev, ...Object.fromEntries(imageResults) }));
      }
      setError(null);
    } catch (err) {
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
      } else if (type === "collection") {
        await deleteDoc(doc(firestore, "homeSections/homeCollections/collectionItems", item.id));
        setItems((prev) => prev.filter((c) => c.id !== item.id));
      } else if (type === "menu") {
        const menusDocRef = doc(firestore, "homeSections", "menus");
        const menusDoc = await getDocs(collection(firestore, "homeSections"));
        const menuList = menusDoc.docs.find((d) => d.id === "menus")?.data().menuList || [];
        const updatedMenuList = menuList.filter((m) => m.id !== item.id);
        await setDoc(menusDocRef, { menuList: updatedMenuList });
        setItems(updatedMenuList.map((item) => ({ ...item, type: "menu" })));
      } else if (type === "standaloneCollection") {
        await deleteDoc(doc(firestore, "standaloneCollections", item.id));
        setItems((prev) => prev.filter((c) => c.id !== item.id));
      }
      setError(null);
    } catch (err) {
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
            collections={homeCollections}
            setCollections={setHomeCollections}
            filter={filter}
            posterImages={posterImages}
            validateForm={(formData, selectedItem) => validateForm("collection", formData, selectedItem, homeCollections)}
            handleSubmit={(formData, selectedItem) => handleSubmit("collection", formData, selectedItem, setHomeCollections, setError)}
            handleDelete={(item) => handleDelete("collection", item, setHomeCollections)}
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
            collections={standaloneCollections}
            setCollections={setStandaloneCollections}
            filter={filter}
            posterImages={posterImages}
            setPosterImages={setPosterImages}
            validateForm={(formData, selectedItem) => validateForm("standaloneCollection", formData, selectedItem, standaloneCollections)}
            handleSubmit={(formData, selectedItem) => handleSubmit("standaloneCollection", formData, selectedItem, setStandaloneCollections, setError)}
            handleDelete={(item) => handleDelete("standaloneCollection", item, setStandaloneCollections)}
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