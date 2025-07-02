import { collection, getDocs, setDoc, doc, deleteDoc, getDoc, serverTimestamp } from "firebase/firestore";

export const generateDocId = (title) =>
  title.toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

export const ensureString = (value) => (typeof value === "string" ? value : "");

export const isValidDocumentId = (id) => /^[a-z0-9-]+$/.test(id.trim());

export const fetchCollections = async (firestore, setCollections, setSubmissionError) => {
  try {
    const standaloneCollectionsRef = collection(firestore, "standaloneCollections");
    const standaloneSnapshot = await getDocs(standaloneCollectionsRef);
    const collections = standaloneSnapshot.docs.map((d) => ({
      id: d.id,
      type: "standaloneCollection",
      title: ensureString(d.data().title),
      description: ensureString(d.data().description),
      image: ensureString(d.data().image),
      imageUrl: ensureString(d.data().imageUrl),
      posters: Array.isArray(d.data().posters)
        ? d.data().posters.map((p) => ({
            posterId: ensureString(p.posterId || p),
            size: ensureString(p.size),
          }))
        : [],
      discount: d.data().discount || 20,
      createdAt: d.data().createdAt,
      updatedAt: d.data().updatedAt,
    }));
    setCollections(collections);
  } catch (err) {
    setSubmissionError(`Failed to fetch collections: ${err.message}`);
  }
};

export const handleSubmit = async (
  formData,
  selectedItem,
  firestore,
  setCollections,
  setSubmissionError
) => {
  try {
    const id = formData.id.trim();
    const newCollection = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      image: formData.image.trim(),
      imageUrl: formData.imageUrl.trim(),
      posters: formData.posters
        .map((p) => ({
          posterId: p.posterId.trim(),
          size: p.size.trim(),
        }))
        .filter((p) => p.posterId && p.size),
      discount: parseFloat(formData.discount) || 20,
      createdAt: selectedItem ? selectedItem.createdAt : serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await setDoc(doc(firestore, "standaloneCollections", id), newCollection);
    setCollections((prev) =>
      prev.some((c) => c.id === id)
        ? prev.map((c) => (c.id === id ? { id, type: "standaloneCollection", ...newCollection } : c))
        : [...prev, { id, type: "standaloneCollection", ...newCollection }]
    );
  } catch (err) {
    setSubmissionError(`Failed to save collection: ${err.message}`);
    throw err;
  }
};

export const handleDelete = async (item, firestore, setCollections, setSubmissionError) => {
  try {
    await deleteDoc(doc(firestore, "standaloneCollections", item.id));
    setCollections((prev) => prev.filter((c) => c.id !== item.id));
  } catch (err) {
    setSubmissionError(`Failed to delete collection: ${err.message}`);
    throw err;
  }
};

export const fetchPosterImagesData = async (
  posterId,
  index,
  firestore,
  setFormErrors,
  setPosterDetails,
  formData,
  setFormData,
  setMainImagePosterTitle
) => {
  const safePosterId = ensureString(posterId).trim();
  if (!safePosterId) {
    if (index !== null) {
      setFormErrors((prev) => ({
        ...prev,
        posters: [
          ...(prev.posters?.filter((pErr) => pErr.index !== index) || []),
          { index, errors: { posterId: "Poster ID is required." } },
        ],
      }));
    } else {
      setFormErrors((prev) => ({ ...prev, image: "Poster ID is required." }));
    }
    return;
  }

  try {
    const posterRef = doc(firestore, "posters", safePosterId);
    const posterSnap = await getDoc(posterRef);

    if (!posterSnap.exists()) {
      if (index !== null) {
        setFormErrors((prev) => ({
          ...prev,
          posters: [
            ...(prev.posters?.filter((pErr) => pErr.index !== index) || []),
            { index, errors: { posterId: "Poster ID does not exist." } },
          ],
        }));
      } else {
        setFormErrors((prev) => ({ ...prev, image: "Poster ID does not exist." }));
      }
      return;
    }

    const posterData = posterSnap.data();
    if (!posterData.imageUrl) {
      if (index !== null) {
        setFormErrors((prev) => ({
          ...prev,
          posters: [
            ...(prev.posters?.filter((pErr) => pErr.index !== index) || []),
            { index, errors: { posterId: "Poster has no image URL." } },
          ],
        }));
      } else {
        setFormErrors((prev) => ({ ...prev, image: "Poster has no image URL." }));
      }
      return;
    }

    const sizes = Array.isArray(posterData.sizes) ? posterData.sizes : [];
    setPosterDetails((prev) => ({
      ...prev,
      [safePosterId]: {
        id: safePosterId,
        title: ensureString(posterData.title),
        imageUrl: ensureString(posterData.imageUrl),
        sizes: sizes.map((s) => ({
          size: ensureString(s.size),
        })),
      },
    }));

    if (index !== null) {
      const currentPoster = formData.posters[index] || {};
      setFormErrors((prev) => ({
        ...prev,
        posters: prev.posters?.map((pErr) =>
          pErr.index === index
            ? { ...pErr, errors: { ...pErr.errors, posterId: null, size: sizes.length && !currentPoster.size ? "Size is required." : null } }
            : pErr
        ) || [],
      }));
    } else {
      setFormErrors((prev) => ({ ...prev, image: null }));
      if (setMainImagePosterTitle) {
        setMainImagePosterTitle(posterData.title || "");
      }
    }
  } catch (err) {
    if (index !== null) {
      setFormErrors((prev) => ({
        ...prev,
        posters: [
          ...(prev.posters?.filter((pErr) => pErr.index !== index) || []),
          { index, errors: { posterId: `Failed to fetch poster: ${err.message}` } },
        ],
      }));
    } else {
      setFormErrors((prev) => ({ ...prev, image: `Failed to fetch poster: ${err.message}` }));
    }
  }
};

export const validateForm = async (formData, selectedItem, items, firestore) => {
  const errors = {};
  const title = formData.title.trim();
  const id = formData.id.trim();
  const description = formData.description.trim();
  const image = formData.image.trim();
  const discount = parseFloat(formData.discount);

  if (!title) errors.title = "Title is required.";
  else if (!selectedItem && items.some((c) => c.id === id)) {
    errors.title = "A collection with this title already exists.";
  }

  if (!description) errors.description = "Description is required.";
  if (!image) errors.image = "Main image poster ID is required.";
  else {
    try {
      const posterRef = doc(firestore, "posters", image);
      const posterSnap = await getDoc(posterRef);
      if (!posterSnap.exists()) errors.image = "Poster ID does not exist.";
      else if (!posterSnap.data().imageUrl) errors.image = "Poster has no image URL.";
    } catch (err) {
      errors.image = `Failed to validate poster: ${err.message}`;
    }
  }

  if (discount < 0 || discount > 100) {
    errors.discount = "Discount must be between 0 and 100.";
  }

  const posterErrors = await Promise.all(
    formData.posters.map(async (poster, index) => {
      const safePosterId = poster.posterId.trim();
      const size = poster.size.trim();
      const posterErr = {};

      if (safePosterId || size) {
        if (!safePosterId) posterErr.posterId = "Poster ID is required.";
        else if (!isValidDocumentId(safePosterId)) {
          posterErr.posterId = "Invalid Poster ID format.";
        } else {
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
              } else if (!sizes.find((s) => s.size === size)) {
                posterErr.size = "Selected size is not available.";
              }
            }
          } catch (err) {
            posterErr.posterId = `Failed to validate poster: ${err.message}`;
          }
        }
      }
      return Object.keys(posterErr).length ? { index, errors: posterErr } : null;
    })
  );

  if (posterErrors.some((err) => err)) {
    errors.posters = posterErrors.filter((err) => err);
  }

  return errors;
};

export const handleMainImagePosterIdChange = (
  value,
  setFormData,
  setFormErrors,
  setPosterDetails,
  setMainImagePosterTitle,
  formData,
  firestore
) => {
  const safeValue = ensureString(value);
  setFormData((prev) => ({ ...prev, image: safeValue }));
  if (safeValue && isValidDocumentId(safeValue)) {
    fetchPosterImagesData(
      safeValue,
      null,
      firestore,
      setFormErrors,
      setPosterDetails,
      formData,
      setFormData,
      setMainImagePosterTitle
    );
  } else {
    setMainImagePosterTitle("");
    setFormErrors((prev) => ({ ...prev, image: safeValue ? "Invalid Poster ID format." : null }));
    setPosterDetails((prev) => {
      const newDetails = { ...prev };
      delete newDetails[formData.image];
      return newDetails;
    });
  }
};

export const handlePosterIdChange = (
  index,
  value,
  setFormData,
  setPosterDetails,
  setFormErrors,
  formData,
  firestore
) => {
  const safeValue = ensureString(value);
  setFormData((prev) => ({
    ...prev,
    posters: prev.posters.map((p, i) => (i === index ? { posterId: safeValue, size: "" } : p)),
  }));
  if (safeValue && isValidDocumentId(safeValue)) {
    fetchPosterImagesData(
      safeValue,
      index,
      firestore,
      setFormErrors,
      setPosterDetails,
      formData,
      setFormData
    );
  } else {
    setPosterDetails((prev) => {
      const newDetails = { ...prev };
      delete newDetails[formData.posters[index]?.posterId || ""];
      return newDetails;
    });
    setFormErrors((prev) => ({
      ...prev,
      posters: [
        ...(prev.posters?.filter((pErr) => pErr.index !== index) || []),
        { index, errors: { posterId: safeValue ? "Invalid Poster ID format." : "Poster ID is required." } },
      ],
    }));
  }
};

export const handleSizeChange = (index, size, formData, posterDetails, setFormData, setFormErrors) => {
  setFormData((prev) => ({
    ...prev,
    posters: prev.posters.map((p, i) => (i === index ? { ...p, size } : p)),
  }));
  setFormErrors((prev) => ({
    ...prev,
    posters: prev.posters?.map((pErr) =>
      pErr.index === index
        ? { ...pErr, errors: { ...pErr.errors, size: size ? null : "Size is required." } }
        : pErr
    ) || [],
  }));
};

export const handlePasteClipboard = async (
  key,
  index,
  handleMainImagePosterIdChange,
  handlePosterIdChange
) => {
  try {
    const text = await navigator.clipboard.readText();
    const safeText = ensureString(text).trim();
    if (safeText && isValidDocumentId(safeText)) {
      if (key === "image") handleMainImagePosterIdChange(safeText);
      else if (index !== null && key === "posterId") handlePosterIdChange(index, safeText);
    } else {
      alert("Invalid clipboard content: Must be a valid document ID.");
    }
  } catch {
    alert("Failed to paste from clipboard.");
  }
};

export const handleViewImage = (id, posterDetails) => {
  const imageUrl = posterDetails[id]?.imageUrl;
  if (imageUrl) window.open(imageUrl, "_blank", "noopener,noreferrer");
  else alert("No image found.");
};