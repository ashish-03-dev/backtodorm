import { doc, setDoc, updateDoc, deleteDoc, collection, addDoc } from "firebase/firestore";

export async function addPoster(firestore, data) {
  try {
    const docRef = await addDoc(collection(firestore, "posters"), data);
    return { success: true, id: docRef.id };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function updatePoster(firestore, data, id) {
  try {
    await updateDoc(doc(firestore, "posters", id), data);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function deletePoster(firestore, id) {
  try {
    await deleteDoc(doc(firestore, "posters", id));
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

export async function submitPoster(firestore, id) {
  try {
    await updateDoc(doc(firestore, "posters", id), { approved: "pending" });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}