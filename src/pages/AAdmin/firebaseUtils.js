import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Helper function to normalize text for keywords
const normalizeText = (text) => {
  if (!text) return [];
  const lower = text.toLowerCase().trim();
  const title = lower
    .split(/\s+|-/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
  const hyphenated = lower.replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
  return [...new Set([lower, title, hyphenated])].filter(Boolean);
};

// Helper function to normalize collections
const normalizeCollection = (text) => {
  if (!text) return "";
  return text.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
};

// Helper function to generate keywords
const generateKeywords = (title, description, tags, collections = []) => {
  const stopWords = new Set(["a", "an", "the", "and", "or", "but", "in", "on", "at", "to"]);
  const words = [
    ...(title?.toLowerCase().split(/\s+/) || []),
    ...(description?.toLowerCase().split(/\s+/) || []),
    ...(tags?.flatMap(normalizeText) || []),
    ...(collections?.flatMap(normalizeText) || []),
  ];
  const keywords = [...new Set(words)]
    .filter((word) => !stopWords.has(word) && word.length > 2)
    .slice(0, 50);
  console.log("Generated keywords:", keywords);
  return keywords;
};

// Save a poster
export const savePoster = async (firestore, storage, posterData, imageFile, isUpdate = false) => {
  try {
    let imageUrl = posterData.imageUrl || "";
    if (imageFile) {
      const imageRef = ref(storage, `posters/${Date.now()}_${imageFile.name}`);
      await uploadBytes(imageRef, imageFile);
      imageUrl = await getDownloadURL(imageRef);
      console.log("Uploaded image URL:", imageUrl);
    } else if (!posterData.imageUrl && !isUpdate) {
      throw new Error("Image is required for new posters");
    }

    const posterWithImage = {
      ...posterData,
      imageUrl,
      collections: (posterData.collections || []).map(normalizeCollection), // e.g., "k-pop"
      tags: (posterData.tags || []).map(normalizeCollection), // e.g., "k-pop"
      sizes: Array.isArray(posterData.sizes) ? posterData.sizes : [{ size: "", price: 0, finalPrice: 0 }],
    };

    const result = isUpdate
      ? await updatePosterInFirebase(firestore, posterWithImage, posterData.id)
      : await addPosterToFirebase(firestore, posterWithImage, posterData.id);

    if (!result.success) {
      throw new Error(result.error);
    }

    return result.id;
  } catch (error) {
    console.error("Error saving poster:", error);
    throw error;
  }
};

// Add a new poster
export const addPosterToFirebase = async (firestore, posterData, posterId = null) => {
  try {
    if (!posterData.title) {
      throw new Error("Poster title is required");
    }
    if (!Array.isArray(posterData.sizes) || posterData.sizes.length === 0) {
      throw new Error("At least one valid size is required");
    }

    const { id: _, ...data } = posterData;
    const poster = {
      ...data,
      keywords: generateKeywords(data.title, data.description, data.tags, data.collections) || [],
      createdAt: data.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    const id = posterId || `${posterData.title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-_]/g, "")}-${Date.now()}`;
    const posterRef = doc(firestore, "posters", id);

    const docSnap = await getDoc(posterRef);
    if (docSnap.exists()) {
      throw new Error("Poster ID already exists");
    }

    const collectionRefs = (data.collections || []).map((col) =>
      doc(firestore, "collections", normalizeCollection(col))
    );

    await runTransaction(firestore, async (transaction) => {
      const collectionDocs = await Promise.all(
        collectionRefs.map((ref) => transaction.get(ref))
      );

      transaction.set(posterRef, poster);

      data.collections.forEach((col, index) => {
        const colDoc = collectionDocs[index];
        const colId = normalizeCollection(col); // e.g., "k-pop"
        if (!colDoc.exists()) {
          transaction.set(doc(firestore, "collections", colId), {
            name: colId, // e.g., "k-pop"
            posterIds: [posterRef.id],
            createdAt: serverTimestamp(),
          });
        } else {
          const posterIds = colDoc.data().posterIds || [];
          if (!posterIds.includes(posterRef.id)) {
            transaction.update(doc(firestore, "collections", colId), {
              posterIds: [...posterIds, posterRef.id],
            });
          }
        }
      });
    });

    console.log(`Poster ${id} saved successfully`);
    return { success: true, id };
  } catch (error) {
    console.error("Error adding poster to Firebase:", error);
    return { success: false, error: error.message };
  }
};

// Update an existing poster
export const updatePosterInFirebase = async (firestore, posterData, posterId) => {
  try {
    if (!posterData.title) {
      throw new Error("Poster title is required");
    }
    if (!Array.isArray(posterData.sizes) || posterData.sizes.length === 0) {
      throw new Error("At least one valid size is required");
    }
    if (!posterId) {
      throw new Error("Poster ID is required for update");
    }

    const { id: _, ...data } = posterData;
    const poster = {
      ...data,
      keywords: generateKeywords(data.title, data.description, data.tags, data.collections) || [],
      updatedAt: serverTimestamp(),
    };

    const posterRef = doc(firestore, "posters", posterId);

    await runTransaction(firestore, async (transaction) => {
      const existingPoster = await transaction.get(posterRef);
      if (!existingPoster.exists()) {
        throw new Error("Poster not found");
      }
      const oldCollections = existingPoster.data().collections || [];

      const collectionsToRemove = oldCollections.filter((col) => !data.collections.includes(col));
      const collectionsToAdd = data.collections.filter((col) => !oldCollections.includes(col));
      const collectionDocsToRemove = await Promise.all(
        collectionsToRemove.map((col) =>
          transaction.get(doc(firestore, "collections", normalizeCollection(col)))
        )
      );
      const collectionDocsToAdd = await Promise.all(
        collectionsToAdd.map((col) =>
          transaction.get(doc(firestore, "collections", normalizeCollection(col)))
        )
      );

      transaction.update(posterRef, poster);

      collectionsToAdd.forEach((col, index) => {
        const colDoc = collectionDocsToAdd[index];
        const colId = normalizeCollection(col); // e.g., "k-pop"
        if (!colDoc.exists()) {
          transaction.set(doc(firestore, "collections", colId), {
            name: colId, // e.g., "k-pop"
            posterIds: [posterRef.id],
            createdAt: serverTimestamp(),
          });
        } else {
          const posterIds = colDoc.data().posterIds || [];
          if (!posterIds.includes(posterRef.id)) {
            transaction.update(doc(firestore, "collections", colId), {
              posterIds: [...posterIds, posterRef.id],
            });
          }
        }
      });

      collectionsToRemove.forEach((col, index) => {
        const colDoc = collectionDocsToRemove[index];
        const colId = normalizeCollection(col); // e.g., "k-pop"
        if (colDoc?.exists() && colDoc.data().posterIds) {
          const posterIds = colDoc.data().posterIds || [];
          transaction.update(doc(firestore, "collections", colId), {
            posterIds: posterIds.filter((pid) => pid !== posterRef.id),
          });
        }
      });
    });

    console.log(`Poster ${posterId} updated successfully`);
    return { success: true, id: posterId };
  } catch (error) {
    console.error("Error updating poster in Firebase:", error);
    return { success: false, error: error.message };
  }
};

// Approve a poster
export const approvePosterInFirebase = async (firestore, posterId) => {
  try {
    const posterRef = doc(firestore, "posters", posterId);
    await updateDoc(posterRef, {
      approved: "approved",
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error approving poster in Firebase:", error);
    return { success: false, error: error.message };
  }
};

// Reject a poster
export const rejectPosterInFirebase = async (firestore, posterId) => {
  try {
    const posterRef = doc(firestore, "posters", posterId);
    await updateDoc(posterRef, {
      approved: "rejected",
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error rejecting poster in Firebase:", error);
    return { success: false, error: error.message };
  }
};

// Delete a poster
export const deletePosterInFirebase = async (firestore, posterId) => {
  try {
    const posterRef = doc(firestore, "posters", posterId);
    await runTransaction(firestore, async (transaction) => {
      const posterDoc = await transaction.get(posterRef);
      if (!posterDoc.exists()) {
        throw new Error("Poster not found");
      }
      const { collections } = posterDoc.data();
      const collectionDocs = await Promise.all(
        (collections || []).map((col) =>
          transaction.get(doc(firestore, "collections", normalizeCollection(col)))
        )
      );

      collectionDocs.forEach((colDoc, index) => {
        if (colDoc.exists() && colDoc.data().posterIds) {
          const posterIds = colDoc.data().posterIds || [];
          transaction.update(
            doc(firestore, "collections", normalizeCollection(collections[index])),
            {
              posterIds: posterIds.filter((pid) => pid !== posterId),
            }
          );
        }
      });

      transaction.delete(posterRef);
    });

    return { success: true };
  } catch (error) {
    console.error("Error deleting poster in Firebase:", error);
    return { success: false, error: error.message };
  }
};

// Submit a poster
export const submitPosterInFirebase = async (firestore, posterId) => {
  try {
    const posterRef = doc(firestore, "posters", posterId);
    await updateDoc(posterRef, {
      approved: "pending",
      updatedAt: serverTimestamp(),
    });
    return { success: true };
  } catch (error) {
    console.error("Error submitting poster in Firebase:", error);
    return { success: false, error: error.message };
  }
};