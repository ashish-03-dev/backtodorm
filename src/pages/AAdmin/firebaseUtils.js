import { collection, doc, setDoc, updateDoc, deleteDoc, getDoc, runTransaction, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// Helper function to generate keywords
const generateKeywords = (title, description, tags, collections = []) => {
  const stopWords = new Set(["a", "an", "the", "and", "or", "but", "in", "on", "at", "to"]);
  const words = [
    ...(title?.toLowerCase().split(/\s+/) || []),
    ...(description?.toLowerCase().split(/\s+/) || []),
    ...(tags?.map((tag) => tag.toLowerCase()) || []),
    ...(collections?.map((col) => col.toLowerCase()) || []),
  ];
  const keywords = [...new Set(words)]
    .filter(word => !stopWords.has(word) && word.length > 2)
    .slice(0, 50);
  console.log("Generated keywords:", keywords);
  return keywords;
};

// Save a poster (handles image upload and calls appropriate function)
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
      collections: posterData.collections || [],
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

    // Prepare poster data with keywords
    const { id: _, ...data } = posterData;
    const poster = {
      ...data,
      keywords: generateKeywords(data.title, data.description, data.tags, data.collections) || [],
      createdAt: data.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    };

    // Generate ID if not provided
    const id = posterId || `${posterData.title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-_]/g, "")}-${Date.now()}`;
    const posterRef = doc(firestore, "posters", id);

    // Check for duplicate ID
    const docSnap = await getDoc(posterRef);
    if (docSnap.exists()) {
      throw new Error("Poster ID already exists");
    }

    // Run a transaction to update posters, categories, and collections
    const categoryRef = doc(firestore, "categories", data.category);
    const collectionRefs = (data.collections || []).map((col) =>
      doc(firestore, "collections", col.toLowerCase().replace(/\s+/g, "-"))
    );

    await runTransaction(firestore, async (transaction) => {
      const categoryDoc = await transaction.get(categoryRef);
      const collectionDocs = await Promise.all(
        collectionRefs.map(ref => transaction.get(ref))
      );

      // Set poster
      transaction.set(posterRef, poster);

      // Update category
      if (!categoryDoc.exists()) {
        transaction.set(categoryRef, {
          name: data.category,
          description: "",
          posterIds: [posterRef.id],
          createdAt: serverTimestamp(),
        });
      } else {
        const posterIds = categoryDoc.data().posterIds || [];
        if (!posterIds.includes(posterRef.id)) {
          transaction.update(categoryRef, {
            posterIds: [...posterIds, posterRef.id],
          });
        }
      }

      // Update collections
      data.collections.forEach((col, index) => {
        const colDoc = collectionDocs[index];
        const colId = col.toLowerCase().replace(/\s+/g, "-");
        if (!colDoc.exists()) {
          transaction.set(doc(firestore, "collections", colId), {
            name: col,
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

    // Prepare poster data with keywords
    const { id: _, ...data } = posterData;
    const poster = {
      ...data,
      keywords: generateKeywords(data.title, data.description, data.tags, data.collections) || [],
      updatedAt: serverTimestamp(),
    };

    const posterRef = doc(firestore, "posters", posterId);

    // Run a transaction to update posters, categories, and collections
    const categoryRef = doc(firestore, "categories", data.category);
    const collectionRefs = (data.collections || []).map((col) =>
      doc(firestore, "collections", col.toLowerCase().replace(/\s+/g, "-"))
    );

    await runTransaction(firestore, async (transaction) => {
      // Perform all reads
      const existingPoster = await transaction.get(posterRef);
      if (!existingPoster.exists()) {
        throw new Error("Poster not found");
      }
      const oldCategory = existingPoster.data().category;
      const oldCollections = existingPoster.data().collections || [];

      const oldCategoryDoc = oldCategory ? await transaction.get(doc(firestore, "categories", oldCategory)) : null;
      const categoryDoc = await transaction.get(categoryRef);

      const collectionsToRemove = oldCollections.filter(col => !data.collections.includes(col));
      const collectionsToAdd = data.collections.filter(col => !oldCollections.includes(col));
      const collectionDocsToRemove = await Promise.all(
        collectionsToRemove.map(col => transaction.get(doc(firestore, "collections", col.toLowerCase().replace(/\s+/g, "-")))
      ));
      const collectionDocsToAdd = await Promise.all(
        collectionsToAdd.map(col => transaction.get(doc(firestore, "collections", col.toLowerCase().replace(/\s+/g, "-")))
      ));

      // Perform all writes
      // Update poster
      transaction.update(posterRef, poster);

      // Update old category (remove poster ID)
      if (oldCategory && oldCategory !== data.category && oldCategoryDoc?.exists()) {
        const oldPosterIds = oldCategoryDoc.data().posterIds || [];
        transaction.update(doc(firestore, "categories", oldCategory), {
          posterIds: oldPosterIds.filter(pid => pid !== posterRef.id),
        });
      }

      // Update new category
      if (!categoryDoc.exists()) {
        transaction.set(categoryRef, {
          name: data.category,
          description: "",
          posterIds: [posterRef.id],
          createdAt: serverTimestamp(),
        });
      } else {
        const posterIds = categoryDoc.data().posterIds || [];
        if (!posterIds.includes(posterRef.id)) {
          transaction.update(categoryRef, {
            posterIds: [...posterIds, posterRef.id],
          });
        }
      }

      // Update collections
      collectionsToAdd.forEach((col, index) => {
        const colDoc = collectionDocsToAdd[index];
        const colId = col.toLowerCase().replace(/\s+/g, "-");
        if (!colDoc.exists()) {
          transaction.set(doc(firestore, "collections", colId), {
            name: col,
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

      // Remove poster from old collections
      collectionsToRemove.forEach((col, index) => {
        const colDoc = collectionDocsToRemove[index];
        const colId = col.toLowerCase().replace(/\s+/g, "-");
        if (colDoc?.exists() && colDoc.data().posterIds) {
          const posterIds = colDoc.data().posterIds || [];
          transaction.update(doc(firestore, "collections", colId), {
            posterIds: posterIds.filter(pid => pid !== posterRef.id),
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
      const { category, collections } = posterDoc.data();

      // Read category and collections
      const categoryDoc = await transaction.get(doc(firestore, "categories", category));
      const collectionDocs = await Promise.all(
        (collections || []).map(col => transaction.get(doc(firestore, "collections", col.toLowerCase().replace(/\s+/g, "-")))
      ));

      // Write updates
      if (categoryDoc.exists()) {
        const posterIds = categoryDoc.data().posterIds || [];
        transaction.update(doc(firestore, "categories", category), {
          posterIds: posterIds.filter(pid => pid !== posterId),
        });
      }

      collectionDocs.forEach((colDoc, index) => {
        if (colDoc.exists() && colDoc.data().posterIds) {
          const posterIds = colDoc.data().posterIds || [];
          transaction.update(doc(firestore, "collections", collections[index].toLowerCase().replace(/\s+/g, "-")), {
            posterIds: posterIds.filter(pid => pid !== posterId),
          });
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