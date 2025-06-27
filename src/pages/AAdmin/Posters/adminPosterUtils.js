import {
  doc,
  getDoc,
  addDoc,
  setDoc,
  collection,
  deleteDoc,
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

// Submit a new poster for admin panel
export const submitPoster = async (
  firestore,
  storage,
  posterData,
  posterId,
  adminUser
) => {
  try {
    // Validate inputs
    if (!posterData.title) throw new Error("Poster title is required");
    if (!Array.isArray(posterData.sizes) || posterData.sizes.length === 0)
      throw new Error("At least one valid size is required");
    if (!posterId) throw new Error("Poster ID is required");
    if (!posterData.sellerUsername) throw new Error("Seller username is required");
    if (!posterData.imageFile) throw new Error("An image is required for new posters");

    // Upload image
    const storagePath = `posters/${posterData.sellerUsername}/${Date.now()}_${posterData.imageFile.name}`;
    const imageRef = ref(storage, storagePath);
    await uploadBytes(imageRef, posterData.imageFile);
    const imageUrl = await getDownloadURL(imageRef);

    // Prepare poster data
    const poster = {
      ...posterData,
      posterId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      approved: "pending",
      isActive: posterData.isActive !== false,
      originalImageUrl: imageUrl,
    };

    await runTransaction(firestore, async (transaction) => {
      const posterRef = doc(firestore, "tempPosters", posterId);
      const posterDoc = await transaction.get(posterRef);
      if (posterDoc.exists()) throw new Error("Poster ID already exists");

      // Set poster in tempPosters
      transaction.set(posterRef, poster);

      // Update seller document
      const sellerRef = doc(firestore, "sellers", posterData.sellerUsername);
      const sellerDoc = await transaction.get(sellerRef);
      if (!sellerDoc.exists()) throw new Error("Seller not found");
      const sellerData = sellerDoc.data();
      const tempPosters = sellerData.tempPosters || [];
      transaction.update(sellerRef, {
        tempPosters: [...tempPosters, { id: posterId, status: "pending" }],
        updatedAt: serverTimestamp(),
      });

      // Update collections
      const collections = posterData.collections || [];
      const collectionDocs = await Promise.all(
        collections.map((col) =>
          transaction.get(doc(firestore, "collections", normalizeCollection(col)))
        )
      );

      collections.forEach((col, index) => {
        const colId = normalizeCollection(col);
        const colDoc = collectionDocs[index];
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
    });

    return { success: true, id: posterId };
  } catch (error) {
    console.error("Error submitting poster:", error);
    return { success: false, error: error.message };
  }
};

// Update an existing approved poster in posters collection
export const updatePoster = async (
  firestore,
  posterData,
  posterId,
) => {
  try {
    // Validate inputs
    if (!posterData.title) throw new Error("Poster title is required");
    if (!Array.isArray(posterData.sizes) || posterData.sizes.length === 0)
      throw new Error("At least one valid size is required");
    if (!posterId) throw new Error("Poster ID is required for update");
    if (!posterData.sellerUsername) throw new Error("Seller username is required");

    // Prepare poster data with keywords
    const poster = {
      ...posterData,
      updatedAt: serverTimestamp(),
      approved: "approved",
    };

    const posterRef = doc(firestore, "posters", posterId);

    await runTransaction(firestore, async (transaction) => {
      // Fetch existing poster
      const existingPoster = await transaction.get(posterRef);
      if (!existingPoster.exists()) throw new Error("Poster not found");
      const oldCollections = existingPoster.data().collections || [];

      // Determine collections to add/remove
      const collectionsToRemove = oldCollections.filter(
        (col) => !posterData.collections?.includes(col)
      );
      const collectionsToAdd = posterData.collections?.filter(
        (col) => !oldCollections.includes(col)
      ) || [];

      // Fetch collection documents
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

      // Update poster document
      transaction.update(posterRef, poster);

      // Update collections to add
      collectionsToAdd.forEach((col, index) => {
        const colDoc = collectionDocsToAdd[index];
        const colId = normalizeCollection(col);
        if (!colDoc.exists()) {
          transaction.set(doc(firestore, "collections", colId), {
            name: col,
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

      // Update collections to remove
      collectionsToRemove.forEach((col, index) => {
        const colDoc = collectionDocsToRemove[index];
        const colId = normalizeCollection(col);
        if (colDoc.exists() && colDoc.data().posterIds) {
          const posterIds = colDoc.data().posterIds || [];
          transaction.update(doc(firestore, "collections", colId), {
            posterIds: posterIds.filter((pid) => pid !== posterId),
          });
        }
      });
    });

    return { success: true, id: posterId };
  } catch (error) {
    console.error("Error updating poster in admin panel:", error);
    return { success: false, error: error.message };
  }
};

export const approveTempPoster = async (firestore, storage, posterData, posterId) => {
  try {
    // Validate inputs
    if (!posterData.title) throw new Error("Poster title is required");
    if (!Array.isArray(posterData.sizes) || posterData.sizes.length === 0)
      throw new Error("At least one valid size is required");
    if (!posterId) throw new Error("Poster ID is required for update");
    if (!posterData.sellerUsername) throw new Error("Seller username is required");

    // Upload new image if provided
    let imageUrl = posterData.originalImageUrl;
    if (posterData.imageFile) {
      const storagePath = `posters/${posterData.sellerUsername}/${Date.now()}_${posterData.imageFile.name}`;
      const imageRef = ref(storage, storagePath);
      await uploadBytes(imageRef, posterData.imageFile);
      imageUrl = await getDownloadURL(imageRef);
    }

    // Prepare poster data with keywords
    const poster = {
      ...posterData,
      updatedAt: serverTimestamp(),
      approved: "approved",
      originalImageUrl: imageUrl,
    };

    const posterRef = doc(firestore, "tempPosters", posterId);

    await runTransaction(firestore, async (transaction) => {
      // Step 1: Perform all reads upfront
      // Read the existing poster
      const existingPoster = await transaction.get(posterRef);
      if (!existingPoster.exists()) throw new Error("Poster not found");
      const oldCollections = existingPoster.data().collections || [];

      // Determine collections to add/remove
      const collectionsToRemove = oldCollections.filter(
        (col) => !posterData.collections?.includes(col)
      );
      const collectionsToAdd = posterData.collections?.filter(
        (col) => !oldCollections.includes(col)
      ) || [];

      // Read all collection documents
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

      // Read the seller document
      const sellerRef = doc(firestore, "sellers", posterData.sellerUsername);
      const sellerDoc = await transaction.get(sellerRef);

      // Step 2: Perform all writes
      // Update poster document
      transaction.update(posterRef, poster);

      // Update collections to add
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

      // Update collections to remove
      collectionsToRemove.forEach((col, index) => {
        const colDoc = collectionDocsToRemove[index];
        const colId = normalizeCollection(col);
        if (colDoc.exists() && colDoc.data().posterIds) {
          const posterIds = colDoc.data().posterIds || [];
          transaction.update(doc(firestore, "collections", colId), {
            posterIds: posterIds.filter((pid) => pid !== posterId),
          });
        }
      });

      // Update seller document
      if (sellerDoc.exists()) {
        const tempPosters = sellerDoc.data().tempPosters || [];
        const updatedTempPosters = tempPosters.map((p) =>
          p.id === posterId
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
    console.error("Error updating temp poster in admin panel:", error);
    return { success: false, error: error.message };
  }
};


// Reject a poster and move to sellers.rejectedPosters
export const rejectPoster = async (firestore, storage, posterId) => {
  try {
    // Fetch the poster document first
    const posterRef = doc(firestore, "tempPosters", posterId);
    const posterDoc = await getDoc(posterRef);
    if (!posterDoc.exists()) throw new Error("Poster not found");

    const posterData = posterDoc.data();
    const sellerUsername = posterData.sellerUsername;
    const imageUrl = posterData.originalImageUrl;
    const collections = posterData.collections || [];

    // Fetch seller document outside transaction
    const sellerRef = doc(firestore, "sellers", sellerUsername);
    const sellerDoc = await getDoc(sellerRef);
    if (!sellerDoc.exists()) throw new Error("Seller not found");

    // Fetch collection documents outside transaction
    const collectionDocs = await Promise.all(
      collections.map((col) =>
        getDoc(doc(firestore, "collections", normalizeCollection(col)))
      )
    );

    // Run the transaction
    await runTransaction(firestore, async (transaction) => {
      // Get seller data
      const sellerData = sellerDoc.data();
      const rejectedPosters = sellerData.rejectedPosters || [];
      const tempPosters = sellerData.tempPosters || [];
      const updatedTempPosters = tempPosters.filter((p) => p.id !== posterId);

      // Update seller's rejectedPosters
      transaction.update(sellerRef, {
        tempPosters: updatedTempPosters,
        rejectedPosters: [
          ...rejectedPosters,
          {
            id: posterId,
            title: posterData.title,
            imageUrl: posterData.originalImageUrl,
            rejectedAt: new Date(),
          },
        ],
        updatedAt: serverTimestamp(),
      });

      // Update collections
      collections.forEach((col, index) => {
        const colDoc = collectionDocs[index];
        const colId = normalizeCollection(col);
        if (colDoc.exists() && colDoc.data().posterIds) {
          const posterIds = colDoc.data().posterIds || [];
          transaction.update(doc(firestore, "collections", colId), {
            posterIds: posterIds.filter((pid) => pid !== posterId),
          });
        }
      });

      // Delete from tempPosters
      transaction.delete(posterRef);
    });

    // Delete image from storage
    if (imageUrl) {
      try {
        const imageRef = ref(storage, imageUrl);
        await deleteObject(imageRef);
      } catch (error) {
        console.warn("Failed to delete image from storage:", error);
      }
    }

    return { success: true };
  } catch (error) {
    console.error("Error rejecting poster:", error);
    return { success: false, error: error.message };
  }
};

export const saveFramedImage = async (firestore, storage, posterId, imageData, user) => {
  // try {
  //   if (!user) throw new Error("User not authenticated");
  //   const posterRef = doc(firestore, "tempPosters", posterId);
  //   const framedImageRef = ref(storage, `framedImages/${posterId}_${Date.now()}.png`);

  //   // Upload base64 image to Firebase Storage
  //   await uploadString(framedImageRef, imageData, "data_url");
  //   const framedImageUrl = await getDownloadURL(framedImageRef);

  //   // Update tempPosters document with framedImageUrl
  //   await setDoc(posterRef, { framedImageUrl }, { merge: true });

  //   return { success: true, framedImageUrl };
  // } catch (error) {
  //   console.error("Error saving framed image:", error);
  //   return { success: false, error: error.message };
  // }
};



export const saveFrame = async (firestore, storage, frameData, file, user) => {
  try {
    if (!user) throw new Error("User not authenticated");
    if (!file) throw new Error("No file selected");

    const frameRef = await addDoc(collection(firestore, "frames"), {
      ...frameData,
      createdBy: user.uid,
      createdAt: new Date(),
    });

    const imageRef = ref(storage, `frames/frame_${frameRef.id}_${Date.now()}.png`);
    await uploadBytes(imageRef, file);
    const imageUrl = await getDownloadURL(imageRef);

    await setDoc(frameRef, { imageUrl }, { merge: true });

    return { success: true, id: frameRef.id, imageUrl };
  } catch (error) {
    console.error("Error saving frame:", error);
    return { success: false, error: error.message };
  }
};

export const updateFrame = async (firestore, storage, frameId, frameData, file, user) => {
  try {
    if (!user) throw new Error("User not authenticated");
    const frameRef = doc(firestore, "frames", frameId);

    let imageUrl = frameData.imageUrl;
    if (file) {
      const imageRef = ref(storage, `frames/frame_${frameId}_${Date.now()}.png`);
      await uploadBytes(imageRef, file);
      imageUrl = await getDownloadURL(imageRef);
    }

    await setDoc(frameRef, {
      ...frameData,
      imageUrl,
      updatedBy: user.uid,
      updatedAt: new Date(),
    }, { merge: true });

    return { success: true, imageUrl };
  } catch (error) {
    console.error("Error updating frame:", error);
    return { success: false, error: error.message };
  }
};

export const deleteFrame = async (firestore, storage, frameId) => {
  try {
    const frameRef = doc(firestore, "frames", frameId);
    const frameSnap = await getDoc(frameRef);
    if (frameSnap.exists() && frameSnap.data().imageUrl) {
      const imageRef = ref(storage, frameSnap.data().imageUrl);
      await deleteObject(imageRef).catch((err) => console.warn("Failed to delete image:", err));
    }
    await deleteDoc(frameRef);
    return { success: true };
  } catch (error) {
    console.error("Error deleting frame:", error);
    return { success: false, error: error.message };
  }
};
