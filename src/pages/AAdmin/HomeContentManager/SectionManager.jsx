import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import { Form, Alert, Nav, Container } from "react-bootstrap";
import { collection, getDocs, setDoc, doc, query, where, deleteDoc } from "firebase/firestore";
import { useFirebase } from "../../../context/FirebaseContext";
import HomeCollectionsTab from "./HomeCollectionsTab";
import SectionsTab from "./SectionsTab";
import MenusTab from "./MenusTab";
import { fetchImages, fetchFormPosterImage } from "./utils";

const SectionManager = () => {
  const { firestore } = useFirebase();
  const [homeSections, setHomeSections] = useState([]);
  const [homeCollections, setHomeCollections] = useState([]);
  const [menus, setMenus] = useState([]);
  const [filter, setFilter] = useState({ search: "", homeSubTab: "collections" });
  const [error, setError] = useState(null);
  const [posterImages, setPosterImages] = useState({});

  useEffect(() => {
    const initializeAndFetchData = async () => {
      if (!firestore) return;
      try {
        const homeSectionsRef = collection(firestore, "homeSections");
        const homeSectionsSnapshot = await getDocs(homeSectionsRef);

        if (!homeSectionsSnapshot.docs.find((d) => d.id === "sections")) {
          await setDoc(doc(homeSectionsRef, "sections"), { sectionList: [] });
        }
        if (!homeSectionsSnapshot.docs.find((d) => d.id === "menus")) {
          await setDoc(doc(homeSectionsRef, "menus"), {
            menuList: [
              { id: "shopMenu", sections: [] },
              { id: "collectionsMenu", sections: [] },
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
    if (type !== "collection") {
      if (!formData.id?.trim()) {
        errors.id = "ID is required.";
      } else if (
        !selectedItem &&
        items.some((s) => s.id === formData.id?.trim().toLowerCase())
      ) {
        errors.id = "ID already exists.";
      }
    }
    if (type === "collection") {
      if (!formData.name?.trim()) {
        errors.name = "Collection Name is required.";
      } else if (
        !selectedItem &&
        items.some((c) => c.id === formData.name?.trim().toLowerCase())
      ) {
        errors.name = "Collection already exists.";
      }
    }
    if (type === "section") {
      const posterErrors = await Promise.all(
        (formData.posterIds || []).map(async (id, index) => {
          if (!id?.trim()) return null;
          if (!id.match(/^[a-zA-Z0-9_-]+$/)) return "Invalid ID format.";
          try {
            const q = query(collection(firestore, "posters"), where("__name__", "==", id));
            const querySnap = await getDocs(q);
            if (querySnap.empty) return "Poster ID does not exist.";
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
          if (!id?.trim()) return null;
          if (!id.match(/^[a-zA-Z0-9_-]+$/)) return "Invalid ID format.";
          try {
            const q = query(collection(firestore, "posters"), where("__name__", "==", id));
            const querySnap = await getDocs(q);
            if (querySnap.empty) return "Image ID does not exist.";
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
          if (!sec.title?.trim()) secErrors.title = "Section title is required.";
          const itemErrors = (sec.items || []).map((item) => {
            if (!item.name?.trim()) return "Item name is required.";
            if (!item.link?.trim()) return "Item link is required.";
            return null;
          });
          if (itemErrors.some((err) => err)) secErrors.items = itemErrors;
          const imageErrors = await Promise.all(
            (sec.images || []).map(async (img, imgIndex) => {
              if (!img.src?.trim()) return null;
              if (!img.src.match(/^[a-zA-Z0-9_-]+$/)) return "Invalid image ID format.";
              try {
                const q = query(collection(firestore, "posters"), where("__name__", "==", img.src));
                const querySnap = await getDocs(q);
                if (querySnap.empty) return "Image ID does not exist.";
                return null;
              } catch (err) {
                return `Failed to validate ID: ${err.message}`;
              }
            })
          );
          if (imageErrors.some((err) => err)) secErrors.images = imageErrors;
          return Object.keys(secErrors).length ? { index: secIndex, errors: secErrors } : null;
        })
      );
      if (sectionErrors.some((err) => err)) errors.sections = sectionErrors.filter((err) => err);
    }
    return errors;
  };

  const handleSubmit = async (type, formData, selectedItem, setItems, setError) => {
    try {
      if (type === "section") {
        const id = formData.id.trim().toLowerCase();
        const posterIds = formData.posterIds.filter((id) => id.trim());
        const newSection = { id, posterIds };
        const sectionsDocRef = doc(firestore, "homeSections", "sections");
        const sectionsDoc = await getDocs(query(collection(firestore, "homeSections")));
        const sectionList = sectionsDoc.docs.find((d) => d.id === "sections")?.data().sectionList || [];
        const updatedSectionList = selectedItem
          ? sectionList.map((s) => (s.id === id ? newSection : s))
          : [...sectionList, newSection];
        await setDoc(sectionsDocRef, { sectionList: updatedSectionList });
        setItems(updatedSectionList.map((item) => ({ ...item, type: "section" })));
      } else if (type === "collection") {
        const id = formData.name.trim().toLowerCase();
        const imageIds = formData.imageIds.filter((id) => id.trim());
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
        const id = formData.id.trim().toLowerCase();
        const sections = formData.sections.map((sec) => ({
          title: sec.title.trim(),
          items: sec.items
            .filter((item) => item.name.trim() && item.link.trim())
            .map((item) => ({ name: item.name.trim(), link: item.link.trim() })),
          images: sec.images
            .filter((img) => img.src.trim())
            .map((img) => ({
              src: img.src.trim(),
              alt: img.alt.trim(),
              label: img.label.trim(),
              link: img.link.trim(),
            })),
        }));
        const newMenu = { id, sections };
        const menusDocRef = doc(firestore, "homeSections", "menus");
        const menusDoc = await getDocs(query(collection(firestore, "homeSections")));
        const menuList = menusDoc.docs.find((d) => d.id === "menus")?.data().menuList || [];
        const updatedMenuList = selectedItem
          ? menuList.map((m) => (m.id === id ? newMenu : m))
          : [...menuList, newMenu];
        await setDoc(menusDocRef, { menuList: updatedMenuList });
        setItems(updatedMenuList.map((item) => ({ ...item, type: "menu" })));
      }

      const newIds = [
        ...(formData.posterIds || []),
        ...(formData.imageIds || []),
        ...(formData.sections?.flatMap((sec) => sec.images?.map((img) => img.src) || []) || []),
      ].filter((id) => id.trim() && !posterImages[id]);
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
        const sectionsDoc = await getDocs(query(collection(firestore, "homeSections")));
        const sectionList = sectionsDoc.docs.find((d) => d.id === "sections")?.data().sectionList || [];
        const updatedSectionList = sectionList.filter((s) => s.id !== item.id);
        await setDoc(sectionsDocRef, { sectionList: updatedSectionList });
        setItems(updatedSectionList.map((item) => ({ ...item, type: "section" })));
      } else if (type === "collection") {
        await deleteDoc(doc(firestore, "homeSections/homeCollections/collectionItems", item.id));
        setItems((prev) => prev.filter((c) => c.id !== item.id));
      } else if (type === "menu") {
        const menusDocRef = doc(firestore, "homeSections", "menus");
        const menusDoc = await getDocs(query(collection(firestore, "homeSections")));
        const menuList = menusDoc.docs.find((d) => d.id === "menus")?.data().menuList || [];
        const updatedMenuList = menuList.filter((m) => m.id !== item.id);
        await setDoc(menusDocRef, { menuList: updatedMenuList });
        setItems(updatedMenuList.map((item) => ({ ...item, type: "menu" })));
      }
      setError(null);
    } catch (err) {
      setError(`Failed to delete ${type}: ${err.message}`);
      throw err;
    }
  };

  const handleFetchImage = (id, setFormPosterImages) => {
    if (id.trim() && !posterImages[id]) {
      fetchFormPosterImage(id, firestore, setFormPosterImages, posterImages);
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
                : "Menu"
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
      </div>
      {error && <Alert variant="danger" className="mb-3">{error}</Alert>}
    </Container>
  );
};

SectionManager.propTypes = {
  firestore: PropTypes.object,
};

export default SectionManager;