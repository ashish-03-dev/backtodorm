import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL, deleteObject, uploadBytesResumable } from "firebase/storage";

// Helper function to normalize collections
const normalizeCollection = (text) => {
  if (!text) return "";
  return text.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
};

const denormalizeCollectionName = (id) => {
  if (!id) return "";
  return id
    .replace(/-/g, " ")                // Replace hyphens with spaces
    .replace(/\b\w/g, (c) => c.toUpperCase()); // Capitalize each word
};

export const submitPoster = async (
  firestore,
  storage,
  posterData,
  posterId,
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

    // Prepare poster data, excluding imageFile
    const { imageFile, ...posterDataWithoutImage } = posterData;
    const poster = {
      ...posterDataWithoutImage,
      posterId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      approved: "pending",
      isActive: posterData.isActive !== false,
      originalImageUrl: imageUrl,
    };

    await runTransaction(firestore, async (transaction) => {
      // Step 1: Perform all reads
      const posterRef = doc(firestore, "tempPosters", posterId);
      const posterDoc = await transaction.get(posterRef);
      if (posterDoc.exists()) throw new Error("Poster ID already exists");

      const sellerRef = doc(firestore, "sellers", posterData.sellerUsername);
      const sellerDoc = await transaction.get(sellerRef);
      if (!sellerDoc.exists()) throw new Error("Seller not found");

      const collections = posterData.collections || [];
      const collectionDocs = await Promise.all(
        collections.map((col) =>
          transaction.get(doc(firestore, "collections", normalizeCollection(col)))
        )
      );

      // Step 2: Perform all writes
      // Write poster to tempPosters
      transaction.set(posterRef, poster);

      // Update seller document
      const sellerData = sellerDoc.data();
      const tempPosters = sellerData.tempPosters || [];
      transaction.update(sellerRef, {
        tempPosters: [...tempPosters, { id: posterId, status: "pending" }],
        updatedAt: serverTimestamp(),
      });

      // Update collections
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
      const existingPoster = await transaction.get(posterRef);
      if (!existingPoster.exists()) throw new Error("Poster not found");

      const collectionsToAdd = posterData.collections || [];

      // Pre-normalize collections once
      const normalizedCollections = collectionsToAdd.map((name) => ({
        id: normalizeCollection(name),
      }));

      // Read all collection docs (normalized IDs)
      const collectionDocsToAdd = await Promise.all(
        normalizedCollections.map(({ id }) =>
          transaction.get(doc(firestore, "collections", id))
        )
      );

      // Update the poster document
      transaction.update(posterRef, poster);

      // Loop through and update each collection
      normalizedCollections.forEach(({ id }, index) => {
        const colDoc = collectionDocsToAdd[index];

        const colRef = doc(firestore, "collections", id);

        if (!colDoc.exists()) {
          // New collection
          transaction.set(colRef, {
            name: denormalizeCollectionName(id),
            posterIds: [posterData.posterId],
            createdAt: serverTimestamp(),
          });
        } else {
          // Existing collection
          const posterIds = colDoc.data().posterIds || [];
          if (!posterIds.includes(posterData.posterId)) {
            transaction.update(colRef, {
              posterIds: [...posterIds, posterData.posterId],
            });
          }
        }
      });
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
  if (!user) {
    return { success: false, error: "User not authenticated" };
  }

  if (!firestore || !storage || !posterId || !imageData) {
    return { success: false, error: "Missing required parameters" };
  }

  try {
    // Convert base64 data URL to Blob
    const base64String = imageData.split(",")[1]; // Remove "data:image/png;base64," prefix
    const byteCharacters = atob(base64String);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: "image/png" });

    // Create storage reference
    const framedImageRef = ref(storage, `framedImages/${posterId}_${Date.now()}.png`);

    // Upload using uploadBytesResumable
    const uploadTask = uploadBytesResumable(framedImageRef, blob);

    // Wait for upload to complete
    await new Promise((resolve, reject) => {
      uploadTask.on(
        "state_changed",
        null, // Progress callback (optional)
        (error) => reject(error), // Error callback
        () => resolve() // Completion callback
      );
    });

    // Get download URL
    const framedImageUrl = framedImageRef.fullPath; // e.g., "framedImages/poster123_1720000000000.png"

    // Update Firestore document
    const posterRef = doc(firestore, "tempPosters", posterId);
    await setDoc(posterRef, { framedImageUrl, frameSet: true }, { merge: true });
    return { success: true, framedImageUrl };
  } catch (error) {
    return { success: false, error: `Failed to save framed image: ${error.message}` };
  }
};

export const saveFrame = async (firestore, storage, frameData, file) => {
  try {
    const frameRef = doc(firestore, "frames", `frame_${Date.now()}`);
    let imageUrl = "";
    let fileName = "";
    if (file) {
      fileName = file.name;
      const storageRef = ref(storage, `frames/${fileName}`);
      await uploadBytes(storageRef, file);
      imageUrl = await getDownloadURL(storageRef);
    }
    await setDoc(frameRef, {
      ...frameData,
      imageUrl,
      fileName,
      uploaded: false,
      createdAt: serverTimestamp(),
    });
    return { success: true, id: frameRef.id, imageUrl };
  } catch (error) {
    console.error("Failed to save frame:", error);
    return { success: false, error: error.message };
  }
};

export const updateFrame = async (firestore, storage, frameId, frameData, file, user) => {
  try {
    if (!user) throw new Error("User not authenticated");
    const frameRef = doc(firestore, "frames", frameId);
    let imageUrl = frameData.imageUrl || "";
    if (file) {
      const storageRef = ref(storage, `frames/${frameId}/${file.name}`);
      await uploadBytes(storageRef, file);
      imageUrl = await getDownloadURL(storageRef);
    }
    await updateDoc(frameRef, {
      ...frameData,
      imageUrl,
      updatedBy: user.uid,
      updatedAt: new Date().toISOString(),
    });
    return { success: true, imageUrl };
  } catch (error) {
    return { success: false, error: error.message };
  }
};