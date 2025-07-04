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
import { ref, deleteObject } from "firebase/storage";

// Helper function to normalize collections
const normalizeCollection = (text) => {
  if (!text) return "";
  return text.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
};

// Add a new poster to tempPosters with Firestore-generated ID
export const addPoster = async (firestore, posterData) => {
  try {
    // Create references
    const posterRef = doc(collection(firestore, "tempPosters"));
    const posterId = posterRef.id;
    const sellerRef = doc(firestore, "sellers", posterData.sellerUsername);

    // Run transaction
    await runTransaction(firestore, async (transaction) => {
      // Get seller and collection documents
      const sellerDoc = await transaction.get(sellerRef);

      // Set poster document without posterId
      transaction.set(posterRef, {
        ...posterData,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      // Update seller document
      const existingTempPosters = sellerDoc.exists() ? sellerDoc.data().tempPosters || [] : [];
      transaction.set(
        sellerRef,
        {
          sellerUsername: posterData.sellerUsername,
          tempPosters: [
            ...existingTempPosters,
            {
              id: posterId,
              status: "Pending",
              createdAt: new Date(),
            },
          ],
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    });

    return { success: true};
  } catch (error) {
    return { success: false, error: error.message };
  }
};

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
        const updatedTempPosters = tempPosters.filter((p) => p.id !== posterId); // Fixed: p.id instead of p.posterId
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