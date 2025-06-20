import { createContext, useContext, useState, useEffect } from "react";
import { collection, addDoc, doc, deleteDoc, getDocs, updateDoc } from "firebase/firestore";
import { useFirebase } from "./FirebaseContext";

const AddressContext = createContext();

export const useAddress = () => useContext(AddressContext);

export const AddressProvider = ({ children }) => {
  const { user, firestore } = useFirebase();
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !firestore) {
      setAddresses([]);
      setLoading(false);
      setError('User or Firestore not available');
      return;
    }

    const fetchAddresses = async () => {
      try {
        setLoading(true);
        const list = await getAddressList();
        setAddresses(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
        setLoading(false);
      } catch (err) {
        setError(`Failed to load addresses: ${err.message}`);
        setAddresses([]);
        setLoading(false);
      }
    };

    fetchAddresses();
  }, [user, firestore]);

  const getAddressList = async () => {
    if (!user?.uid || !firestore) return [];
    const colRef = collection(firestore, "users", user.uid, "addresses");
    const snap = await getDocs(colRef);
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  };

  const addAddress = async (data) => {
    if (!user?.uid || !firestore) {
      throw new Error('User or Firestore not available');
    }
    const colRef = collection(firestore, "users", user.uid, "addresses");
    await addDoc(colRef, { ...data, createdAt: new Date() });
    const updatedList = await getAddressList();
    setAddresses(updatedList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  };

  const deleteAddress = async (id) => {
    if (!user?.uid || !firestore) {
      throw new Error('User or Firestore not available');
    }
    const docRef = doc(firestore, "users", user.uid, "addresses", id);
    await deleteDoc(docRef);
    const updatedList = await getAddressList();
    setAddresses(updatedList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  };

  const updateAddress = async (id, data) => {
    if (!user?.uid || !firestore) {
      throw new Error('User or Firestore not available');
    }
    const docRef = doc(firestore, "users", user.uid, "addresses", id);
    await updateDoc(docRef, data);
    const updatedList = await getAddressList();
    setAddresses(updatedList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
  };

  return (
    <AddressContext.Provider value={{
      addresses,
      getAddressList,
      addAddress,
      deleteAddress,
      updateAddress,
      loading,
      error
    }}>
      {children}
    </AddressContext.Provider>
  );
};