import {
  doc,
  updateDoc,
  getDoc,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";

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

// Update an existing poster for admin panel
export const updatePosterAdmin = async (
  firestore,
  posterData,
  posterId,
  collectionName = "tempPosters",
  adminUser
) => {
  try {
    // Validate inputs
    if (!posterData.title) throw new Error("Poster title is required");
    if (!Array.isArray(posterData.sizes) || posterData.sizes.length === 0)
      throw new Error("At least one valid size is required");
    if (!posterId) throw new Error("Poster ID is required for update");
    if (!posterData.sellerUsername) throw new Error("Seller username is required");
    if (!adminUser?.isAdmin) throw new Error("Admin access required");

    // Prepare poster data with keywords
    const poster = {
      ...posterData,
      keywords: generateKeywords(
        posterData.title,
        posterData.description,
        posterData.tags,
        posterData.collections
      ),
      updatedAt: serverTimestamp(),
      // Allow admin to update approved status explicitly
      approved: posterData.approved || "pending",
    };

    const posterRef = doc(firestore, collectionName, posterId);

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
        if (colDoc?.exists() && colDoc.data().posterIds) {
          const posterIds = colDoc.data().posterIds || [];
          transaction.update(doc(firestore, "collections", colId), {
            posterIds: posterIds.filter((pid) => pid !== posterId),
          });
        }
      });

      // Update seller document if in tempPosters
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
    console.error("Error updating poster in admin panel:", error);
    return { success: false, error: error.message };
  }
};