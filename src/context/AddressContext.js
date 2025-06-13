import { createContext, useContext } from "react";
import { collection, doc, addDoc, getDocs, deleteDoc, updateDoc, setDoc } from "firebase/firestore";
import { useFirebase } from "./FirebaseContext";

const AddressContext = createContext();

export const useAddress = () => useContext(AddressContext);

export const AddressProvider = ({ children }) => {
    const { user, firestore } = useFirebase();

    const getAddressList = async () => {
        if (!user?.uid) return [];
        const colRef = collection(firestore, "users", user.uid, "addresses");
        const snap = await getDocs(colRef);
        return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    };

    const addAddress = async (data) => {
        if (!user?.uid) return [];
        const colRef = collection(firestore, "users", user.uid, "addresses");
        await addDoc(colRef, { ...data, createdAt: new Date() });
    };

    const deleteAddress = async (id) => {
        if (!user?.uid) return [];
        const docRef = doc(firestore, "users", user.uid, "addresses", id);
        await deleteDoc(docRef);
    };

    const updateAddress = async (id, data) => {
        if (!user?.uid) return [];
        const docRef = doc(firestore, "users", user.uid, "addresses", id);
        await updateDoc(docRef, data);
    };

    return (
        <AddressContext.Provider value={{
            getAddressList, addAddress, deleteAddress, updateAddress
        }}>
            {children}
        </AddressContext.Provider>
    )
}