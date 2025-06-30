import {
  doc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { ref, deleteObject } from "firebase/storage";

// Helper function to normalize collections
const normalizeCollection = (text) => {
  if (!text) return "";
  return text.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
};

// Reject a poster
export const rejectPoster = async (firestore, storage, posterId) => {
  try {
    const tempPosterRef = doc(firestore, "tempPosters", posterId);
    await runTransaction(firestore, async (transaction) => {
      const posterDoc = await transaction.get(tempPosterRef);
      if (!posterDoc.exists()) throw new Error("Poster not found");

      const posterData = posterDoc.data();
      const { originalImageUrl, sellerUsername, ...rest } = posterData;

      const sellerRef = doc(firestore, "sellers", sellerUsername);
      const sellerDoc = await transaction.get(sellerRef);
      let updatedTempPosters = [];
      if (sellerDoc.exists()) {
        const tempPosters = sellerDoc.data().tempPosters || [];
        updatedTempPosters = tempPosters.map((p) =>
          p.posterId === posterId
            ? {
              ...p,
              status: "rejected",
              data: { ...rest, approved: "rejected", updatedAt: new Date().toISOString() },
            }
            : p
        );
      } else {
        updatedTempPosters = [
          {
            posterId: posterId,
            status: "rejected",
            data: { ...rest, approved: "rejected", updatedAt: new Date().toISOString() },
            createdAt: serverTimestamp(),
          },
        ];
      }

      transaction.set(sellerRef, {
        sellerUsername: sellerUsername,
        tempPosters: updatedTempPosters,
        updatedAt: serverTimestamp(),
      }, { merge: true });

      if (originalImageUrl) {
        const imageRef = ref(storage, originalImageUrl);
        await deleteObject(imageRef).catch((err) => {
          console.warn("Failed to delete image from storage:", err);
        });
      }

      transaction.delete(tempPosterRef);

      const collectionRefs = (posterData.collections || []).map((col) =>
        doc(firestore, "collections", normalizeCollection(col))
      );
      const collectionDocs = await Promise.all(
        collectionRefs.map((ref) => transaction.get(ref))
      );

      collectionDocs.forEach((colDoc, index) => {
        if (colDoc.exists() && colDoc.data().posterIds) {
          const posterIds = colDoc.data().posterIds || [];
          transaction.update(
            doc(firestore, "collections", normalizeCollection(posterData.collections[index])),
            {
              posterIds: posterIds.filter((pid) => pid !== posterId),
            }
          );
        }
      });
    });

    return { success: true };
  } catch (error) {
    console.error("Error rejecting poster:", error);
    return { success: false, error: error.message };
  }
};