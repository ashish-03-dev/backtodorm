import { collection, doc, setDoc, updateDoc, deleteDoc, getDoc } from "firebase/firestore";

export const addPosterToFirebase = async (firestore, posterData, posterId) => {
  try {
    if (!posterData.title) {
      throw new Error("Poster title is required");
    }
    // Use provided posterId or generate a new one
    const id = posterId || `${posterData.title
      .toLowerCase()
      .replace(/\s+/g, "-")
      .replace(/[^a-z0-9\-_]/g, "")}-${Date.now()}`;
    
    // Check for duplicate ID
    const docRef = doc(firestore, "posters", id);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      throw new Error("Poster ID already exists");
    }

    // Exclude id from the document data
    const { id: _, ...data } = posterData;
    const poster = {
      ...data,
      createdAt: posterData.createdAt || new Date().toISOString(),
    };

    // Save with setDoc using the custom ID
    await setDoc(docRef, poster);
    return { success: true, id };
  } catch (error) {
    console.error("Error adding poster to Firebase:", error);
    return { success: false, error: error.message };
  }
};

export const approvePosterInFirebase = async (firestore, posterId) => {
  try {
    const posterRef = doc(firestore, "posters", posterId);
    await updateDoc(posterRef, {
      approved: "approved",
    });
    return { success: true };
  } catch (error) {
    console.error("Error approving poster in Firebase:", error);
    return { success: false, error: error.message };
  }
};

export const rejectPosterInFirebase = async (firestore, posterId) => {
  try {
    const posterRef = doc(firestore, "posters", posterId);
    await updateDoc(posterRef, {
      approved: "rejected",
    });
    return { success: true };
  } catch (error) {
    console.error("Error rejecting poster in Firebase:", error);
    return { success: false, error: error.message };
  }
};

export const deletePosterInFirebase = async (firestore, posterId) => {
  try {
    const posterRef = doc(firestore, "posters", posterId);
    await deleteDoc(posterRef);
    return { success: true };
  } catch (error) {
    console.error("Error deleting poster in Firebase:", error);
    return { success: false, error: error.message };
  }
};

export const submitPosterInFirebase = async (firestore, posterId) => {
  try {
    const posterRef = doc(firestore, "posters", posterId);
    await updateDoc(posterRef, {
      approved: "pending",
    });
    return { success: true };
  } catch (error) {
    console.error("Error submitting poster in Firebase:", error);
    return { success: false, error: error.message };
  }
};