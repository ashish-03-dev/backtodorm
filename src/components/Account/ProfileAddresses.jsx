import React, { useEffect, useState } from "react";
import { useAddress } from '../../context/AddressContext';
import AddressForm from './AddressForm';

export default function AddressBook() {
  const { getAddressList, addAddress, deleteAddress, updateAddress } = useAddress();
  const [showForm, setShowForm] = useState(false);
  const [addresses, setAddresses] = useState([]);

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    const list = await getAddressList();
    setAddresses(list);
  }

  const handleDelete = async (id) => {
    try {
      await deleteAddress(id);
      const updated = await getAddressList();
      setAddresses(updated); // Assuming you're managing `addresses` via useState
    } catch (error) {
      console.error("Delete failed:", error);
    }
  };

  return (
    <div>
      <h4 className="mb-3">Saved Addresses</h4>

      {!showForm && (
        <button className="btn btn-outline-primary mb-3" onClick={() => setShowForm(true)}>
          Add New Address
        </button>
      )}

      {showForm && <AddressForm setShowForm={setShowForm} fetchAddresses={fetchAddresses} addAddress={addAddress} />}

      {addresses.map((addr) => (
        <div key={addr.id} className="card p-3 mb-3">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <p className="mb-1">
                <span>{addr.name}</span>
                <span className="ms-2">{addr.phone}</span>
              </p>
              <small className="text-muted">
                {addr.address}, {addr.locality}, {addr.city},
                {addr.landmark && `, Landmark: ${addr.landmark}`}
              </small>
              <br />
              <small className="text-muted">
                {addr.state} - {addr.pincode}
              </small>
            </div>
            <button
              className="btn btn-sm btn-outline-danger"
              onClick={() => handleDelete(addr.id)}
            >
              <i className="bi bi-trash"></i>
            </button>
          </div>
        </div>
      ))}



    </div>
  );
}
