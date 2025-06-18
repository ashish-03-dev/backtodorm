import { collection, getDocs, query, where } from "firebase/firestore";

export const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

export const fetchImages = async (ids, firestore) => {
  const uniqueIds = [...new Set(ids.filter(id => id))];
  const chunks = [];
  for (let i = 0; i < uniqueIds.length; i += 10) {
    chunks.push(uniqueIds.slice(i, i + 10));
  }

  const imageResults = [];
  for (const chunk of chunks) {
    const q = query(collection(firestore, "posters"), where("__name__", "in", chunk));
    const querySnap = await getDocs(q);
    querySnap.forEach(doc => imageResults.push([doc.id, doc.data().imageUrl || ""]));
  }
  return imageResults;
};

export const fetchFormPosterImage = debounce(async (id, firestore, setFormPosterImages, posterImages) => {
  if (!id || posterImages[id] !== undefined) return;
  setFormPosterImages(prev => ({ ...prev, [id]: null }));
  try {
    const q = query(collection(firestore, "posters"), where("__name__", "==", id));
    const querySnap = await getDocs(q);
    setFormPosterImages(prev => ({
      ...prev,
      [id]: querySnap.docs.length > 0 ? querySnap.docs[0].data().imageUrl || "" : "",
    }));
  } catch {
    setFormPosterImages(prev => {
      const newImages = { ...prev };
      delete newImages[id];
      return newImages;
    });
  }
}, 300);