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
import { ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";

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
  const stopWords = new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "but",
    "in",
    "on",
    "at",
    "to",
  ]);
  const words = [
    ...(title?.toLowerCase().split(/\s+/) || []),
    ...(description?.toLowerCase().split(/\s+/) || []),
    ...(tags?.flatMap(normalizeText) || []),
    ...(collections?.flatMap(normalizeText) || []),
  ];
  return [...new Set(words)]
    .filter((word) => !stopWords.has(word) && word.length > 2)
    .slice(0, 50);
};

// Add a new poster to tempPosters with Firestore-generated ID
export const addPoster = async (firestore, storage, posterData) => {
  try {
    if (!posterData.title) throw new Error("Poster title is required");
    if (!Array.isArray(posterData.sizes) || posterData.sizes.length === 0)
      throw new Error("At least one valid size is required");
    if (!posterData.sellerUsername) throw new Error("Seller username is required");

    const poster = {
      ...posterData,
      keywords: generateKeywords(
        posterData.title,
        posterData.description,
        posterData.tags,
        posterData.collections
      ),
      createdAt: posterData.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
      approved: posterData.approved || "pending",
    };

    // Create a new document reference with auto-generated ID
    const posterRef = doc(collection(firestore, "tempPosters"));
    const posterId = posterRef.id;
    const sellerRef = doc(firestore, "sellers", posterData.sellerUsername);
    const collectionRefs = (posterData.collections || []).map((col) =>
      doc(firestore, "collections", normalizeCollection(col))
    );

    await runTransaction(firestore, async (transaction) => {
      const sellerDoc = await transaction.get(sellerRef);
      const collectionDocs = await Promise.all(
        collectionRefs.map((ref) => transaction.get(ref))
      );

      transaction.set(posterRef, { ...poster, posterId });

      posterData.collections.forEach((col, index) => {
        const colDoc = collectionDocs[index];
        const colId = normalizeCollection(col);
        if (!colDoc.exists()) {
          transaction.set(doc(firestore, "collections", colId), {
            name: colId,
            posterIds: [posterId],
            createdAt: serverTimestamp(),
          });
        } else {
          const posterIds = colDoc.data().posterIds || [];
          if (!posterIds.includes(posterId)) {
            transaction.update(doc(firestore, "collections", colId), {
              posterIds: [...posterIds, posterId],
            });
          }
        }
      });

      const existingTempPosters = sellerDoc.exists() ? sellerDoc.data().tempPosters || [] : [];
      transaction.set(sellerRef, {
        sellerUsername: posterData.sellerUsername,
        tempPosters: [
          ...existingTempPosters,
          {
            posterId: posterId,
            status: poster.approved || "pending",
            createdAt: new Date().toISOString(),
          },
        ],
        updatedAt: serverTimestamp(),
      }, { merge: true });
    });

    return { success: true, id: posterId };
  } catch (error) {
    console.error("Error adding poster to Firebase:", error);
    return { success: false, error: error.message };
  }
};



// Update an existing poster
export const updatePoster = async (firestore, posterData, posterId, collectionName = "tempPosters") => {
  try {
    if (!posterData.title) throw new Error("Poster title is required");
    if (!Array.isArray(posterData.sizes) || posterData.sizes.length === 0)
      throw new Error("At least one valid size is required");
    if (!posterId) throw new Error("Poster ID is required for update");
    if (!posterData.sellerUsername) throw new Error("Seller username is required");

    const poster = {
      ...posterData,
      keywords: generateKeywords(
        posterData.title,
        posterData.description,
        posterData.tags,
        posterData.collections
      ),
      updatedAt: serverTimestamp(),
    };

    const posterRef = doc(firestore, collectionName, posterId);

    await runTransaction(firestore, async (transaction) => {
      const existingPoster = await transaction.get(posterRef);
      if (!existingPoster.exists()) throw new Error("Poster not found");
      const oldCollections = existingPoster.data().collections || [];

      const collectionsToRemove = oldCollections.filter(
        (col) => !posterData.collections.includes(col)
      );
      const collectionsToAdd = posterData.collections.filter(
        (col) => !oldCollections.includes(col)
      );
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
        const colId = normalizeCollection(col);
        if (!colDoc.exists()) {
          transaction.set(doc(firestore, "collections", colId), {
            name: colId,
            posterIds: [posterId],
            createdAt: serverTimestamp(),
          });
        } else {
          const posterIds = colDoc.data().posterIds || [];
          if (!posterIds.includes(posterId)) {
            transaction.update(doc(firestore, "collections", colId), {
              posterIds: [...posterIds, posterId],
            });
          }
        }
      });

      collectionsToRemove.forEach((col, index) => {
        const colDoc = collectionDocsToRemove[index];
        const colId = normalizeCollection(col);
        if (colDoc?.exists() && colDoc.data().posterIds) {
          const posterIds = colDoc.data().posterIds || [];
          transaction.update(doc(firestore, "collections", colId), {
            posterIds: posterIds.filter((pid) => pid !== posterId),
          });
        }
      });

      const sellerRef = doc(firestore, "sellers", posterData.sellerUsername);
      const sellerDoc = await transaction.get(sellerRef);
      if (sellerDoc.exists() && collectionName === "tempPosters") {
        const tempPosters = sellerDoc.data().tempPosters || [];
        const updatedTempPosters = tempPosters.map((p) =>
          p.posterId === posterId
            ? { ...p, status: poster.approved || "pending" }
            : p
        );
        transaction.update(sellerRef, {
          tempPosters: updatedTempPosters,
          updatedAt: serverTimestamp(),
        });
      }
    });

    return { success: true, id: posterId };
  } catch (error) {
    console.error("Error updating poster in Firebase:", error);
    return { success: false, error: error.message };
  }
};


// Delete a poster
export const deletePoster = async (firestore, storage, posterId, collectionName = "tempPosters") => {
  try {
    const posterRef = doc(firestore, collectionName, posterId);

    // Step 1: Read outside transaction
    const posterSnap = await getDoc(posterRef);
    if (!posterSnap.exists()) throw new Error("Poster not found");

    const { collections, originalImageUrl, sellerUsername } = posterSnap.data();
    const collectionRefs = (collections || []).map((col) =>
      doc(firestore, "collections", normalizeCollection(col))
    );
    const sellerRef = doc(firestore, "sellers", sellerUsername);

    await runTransaction(firestore, async (transaction) => {
      // 🔹 All READS first
      const collectionDocs = await Promise.all(
        collectionRefs.map((ref) => transaction.get(ref))
      );
      const sellerDoc = await transaction.get(sellerRef);

      // 🔸 Then WRITES
      collectionDocs.forEach((colDoc, index) => {
        const colId = normalizeCollection(collections[index]);
        if (colDoc.exists()) {
          const posterIds = colDoc.data().posterIds || [];
          transaction.update(doc(firestore, "collections", colId), {
            posterIds: posterIds.filter((pid) => pid !== posterId),
          });
        }
      });

      if (sellerDoc.exists() && collectionName === "tempPosters") {
        const tempPosters = sellerDoc.data().tempPosters || [];
        const updatedTempPosters = tempPosters.filter((p) => p.posterId !== posterId);
        transaction.update(sellerRef, {
          tempPosters: updatedTempPosters,
          updatedAt: serverTimestamp(),
        });
      }

      transaction.delete(posterRef);
    });

    // Step 6: Delete image AFTER the transaction
    if (originalImageUrl && collectionName !== "posters") {
      const imageRef = ref(storage, originalImageUrl);
      await deleteObject(imageRef).catch((err) => {
        console.warn("⚠️ Failed to delete image from storage:", err.message);
      });
    }

    return { success: true };
  } catch (error) {
    console.error("🔥 Error deleting poster in Firebase:", error);
    return { success: false, error: error.message };
  }
};

// Submit a poster for review
export const submitPoster = async (firestore, posterId, collectionName = "tempPosters") => {
  try {
    const posterRef = doc(firestore, collectionName, posterId);
    const posterDoc = await getDoc(posterRef);
    if (!posterDoc.exists()) throw new Error("Poster not found");
    const sellerUsername = posterDoc.data().sellerUsername;

    await runTransaction(firestore, async (transaction) => {
      transaction.update(posterRef, {
        approved: "pending",
        updatedAt: serverTimestamp(),
      });

      const sellerRef = doc(firestore, "sellers", sellerUsername);
      const sellerDoc = await transaction.get(sellerRef);
      if (sellerDoc.exists()) {
        const tempPosters = sellerDoc.data().tempPosters || [];
        const updatedTempPosters = tempPosters.map((p) =>
          p.posterId === posterId
            ? { ...p, status: "pending" }
            : p
        );
        transaction.update(sellerRef, {
          tempPosters: updatedTempPosters,
          updatedAt: serverTimestamp(),
        });
      }
    });

    return { success: true };
  } catch (error) {
    console.error("Error submitting poster:", error);
    return { success: false, error: error.message };
  }
};