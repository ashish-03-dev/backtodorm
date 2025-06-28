import React, { useState, useEffect } from 'react';
import { useAddress } from '../../context/AddressContext';
import { useFirebase } from '../../context/FirebaseContext';
import { onAuthStateChanged } from 'firebase/auth';
import { Alert, Spinner, Button, Card } from 'react-bootstrap';
import AddressForm from './AddressForm';

export default function AddressBook() {
  const { getAddressList, addAddress, deleteAddress, updateAddress } = useAddress();
  const [addresses, setAddresses] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAddressId, setEditingAddressId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAddresses();
  }, []);

  const fetchAddresses = async () => {
    try {
      setLoading(true);
      const list = await getAddressList();
      setAddresses(list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)));
      setLoading(false);
    } catch (err) {
      setAddresses([]);
      setError(`Failed to load addresses: ${err.message}`);
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAddress(id);
      await fetchAddresses();
    } catch (err) {
      setError(`Failed to delete address: ${err.message}`);
      console.error('Delete failed:', err);
    }
  };

  const handleEdit = (id) => {
    setEditingAddressId(id);
    setShowAddForm(false);
  };

  const handleUpdate = async (id, updatedAddress) => {
    try {
      await updateAddress(id, updatedAddress);
      await fetchAddresses();
      setEditingAddressId(null);
    } catch (err) {
      setError(`Failed to update address: ${err.message}`);
      console.error('Update failed:', err);
    }
  };

  const handleCancelEdit = () => {
    setEditingAddressId(null);
  };

  if (loading) {
    return (
      <div className="text-center d-flex align-items-center justify-content-center" style={{height:"calc(100svh - 65px - 3rem)"}}>
        <p className="mt-2">Loading your addresses...</p>
      </div>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" dismissible onClose={() => setError('')}>
        {error}
      </Alert>
    );
  }

  return (
    <div className='p-4 p-md-5'>
      <h4 className="mb-4">Saved Addresses</h4>

      {!showAddForm && !editingAddressId && (
        <Button
          variant="outline-primary"
          className="mb-3"
          onClick={() => setShowAddForm(true)}
        >
          Add New Address
        </Button>
      )}

      {showAddForm && (
        <AddressForm
          fetchAddresses={fetchAddresses}
          addAddress={addAddress}
          setShowForm={setShowAddForm}
          onCancel={() => setShowAddForm(false)}
        />
      )}

      {addresses.length === 0 && !showAddForm && !editingAddressId && (
        <p className="text-muted">You have no saved addresses yet.</p>
      )}

      {addresses.map((addr) => (
        <Card key={addr.id} className="p-3 mb-3">
          {editingAddressId === addr.id ? (
            <AddressForm
              fetchAddresses={fetchAddresses}
              initialData={addr}
              onSubmit={(updatedAddress) => handleUpdate(addr.id, updatedAddress)}
              setShowForm={handleCancelEdit}
              isEditMode={true}
              onCancel={handleCancelEdit}
            />
          ) : (
            <div className="d-flex justify-content-between align-items-start">
              <div>
                <p className="mb-1">
                  <strong>{addr.name}</strong>
                  <span className="ms-2">+91 {addr.phone}</span>
                </p>
                <small className="text-muted">
                  {addr.address}, {addr.locality}, {addr.city}
                  {addr.landmark && `, Landmark: ${addr.landmark}`}
                </small>
                <br />
                <small className="text-muted">
                  {addr.state} - {addr.pincode}
                </small>
              </div>
              <div className="d-flex gap-2">
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => handleEdit(addr.id)}
                >
                  <i className="bi bi-pencil"></i>
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={() => handleDelete(addr.id)}
                >
                  <i className="bi bi-trash"></i>
                </Button>
              </div>
            </div>
          )}
        </Card>
      ))}
    </div>
  );
}