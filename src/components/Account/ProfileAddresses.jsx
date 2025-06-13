import React, { useEffect, useState } from "react";
import { useFirebase } from "../../context/FirebaseContext";
import { doc, collection, addDoc, getDocs } from "firebase/firestore";

export default function AddressBook() {
  const { user, firestore } = useFirebase();
  const [addresses, setAddresses] = useState([]);
  const [newAddress, setNewAddress] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.uid) fetchAddresses();
  }, [user]);

  const fetchAddresses = async () => {
    const userDocRef = doc(firestore, "users", user.uid);
    const addressColRef = collection(userDocRef, "addresses");
    const snap = await getDocs(addressColRef);
    const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setAddresses(data);
  };

  const handleAddAddress = async () => {
    if (!newAddress.trim()) return;
    setLoading(true);
    try {
      const userDocRef = doc(firestore, "users", user.uid);
      const addressColRef = collection(userDocRef, "addresses");

      await addDoc(addressColRef, {
        address: newAddress,
        createdAt: new Date(),
      });

      setNewAddress("");
      await fetchAddresses();
    } catch (error) {
      console.error("Error adding address:", error);
    }
    setLoading(false);
  };

  return (
    <div>
      <h4 className="mb-3">Address Book</h4>

      {addresses.map((addr) => (
        <div key={addr.id} className="card p-3 mb-3">
          <p className="mb-1">Saved Address</p>
          <small className="text-muted">{addr.address}</small>
        </div>
      ))}

      <div className="mb-3">
        <textarea
          className="form-control mb-2"
          placeholder="Enter new address"
          value={newAddress}
          onChange={(e) => setNewAddress(e.target.value)}
          rows={3}
        />
        <button
          className="btn btn-outline-primary"
          onClick={handleAddAddress}
          disabled={loading}
        >
          {loading ? "Saving..." : "Add New Address"}
        </button>
      </div>
    </div>
  );
}
