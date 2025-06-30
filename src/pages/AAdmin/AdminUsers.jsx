import React, { useState, useEffect } from 'react';
import { Table, Modal, Button, Form, Badge, Alert } from 'react-bootstrap';
import { useFirebase } from '../../context/FirebaseContext';
import { collection, query, where, getDocs, setDoc, doc, deleteDoc, serverTimestamp } from 'firebase/firestore';

export default function AdminUsers() {
  const { firestore } = useFirebase();
  const [admins, setAdmins] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [newAdmin, setNewAdmin] = useState({ name: '', email: '' });
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(true);

  // Fetch admins from Firestore
  useEffect(() => {
    const fetchAdmins = async () => {
      if (!firestore) {
        console.error('Firestore instance is not available');
        setErrorMsg('Failed to connect to database.');
        setIsLoading(false);
        return;
      }

      try {
        const usersRef = collection(firestore, 'users');
        const q = query(usersRef, where('isAdmin', '==', true));
        const querySnapshot = await getDocs(q);

        const fetchedAdmins = querySnapshot.docs.map((doc) => ({
          id: doc.id,
          name: doc.data().name || 'Unnamed User',
          email: doc.data().email || 'No Email',
          isActive: doc.data().isActive !== false, // Default to true if undefined
        }));

        console.log('Fetched admins:', fetchedAdmins);
        setAdmins(fetchedAdmins);
      } catch (err) {
        console.error('Failed to fetch admins:', err);
        setErrorMsg('Failed to load admins.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchAdmins();
  }, [firestore]);

  const handleOpenModal = (admin) => {
    setCurrentAdmin(admin);
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setCurrentAdmin(null);
  };

  const handleToggleActive = async (id) => {
    try {
      const admin = admins.find((a) => a.id === id);
      const newStatus = !admin.isActive;
      await setDoc(doc(firestore, 'users', id), { isActive: newStatus }, { merge: true });
      setAdmins((prev) =>
        prev.map((a) => (a.id === id ? { ...a, isActive: newStatus } : a))
      );
      setSuccessMsg(`Admin ${newStatus ? 'activated' : 'suspended'} successfully!`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to toggle admin status:', err);
      setErrorMsg('Failed to update status.');
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.name || !newAdmin.email) {
      setErrorMsg('Name and email are required.');
      setTimeout(() => setErrorMsg(''), 3000);
      return;
    }

    try {
      const id = `admin-${Date.now()}`; // Temporary ID; ideally use auth UID
      await setDoc(doc(firestore, 'users', id), {
        name: newAdmin.name,
        email: newAdmin.email,
        isAdmin: true,
        isActive: true,
        createdAt: serverTimestamp(),
      });

      setAdmins((prev) => [
        ...prev,
        { id, name: newAdmin.name, email: newAdmin.email, isActive: true },
      ]);
      setNewAdmin({ name: '', email: '' });
      setSuccessMsg('New admin added successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to add admin:', err);
      setErrorMsg('Failed to add admin.');
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };

  const handleRemoveAdmin = async (id) => {
    try {
      await deleteDoc(doc(firestore, 'users', id));
      setAdmins((prev) => prev.filter((a) => a.id !== id));
      setSuccessMsg('Admin removed successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      console.error('Failed to remove admin:', err);
      setErrorMsg('Failed to remove admin.');
      setTimeout(() => setErrorMsg(''), 3000);
    }
  };

  if (isLoading) {
    return <div className="container mt-4"><p>Loading admins...</p></div>;
  }

  return (
    <div className="p-4 p-md-5">
      <h3 className='mb-4'>👥 Admin Users</h3>

      {successMsg && <Alert variant="success">{successMsg}</Alert>}
      {errorMsg && <Alert variant="danger">{errorMsg}</Alert>}

      <h5 className="mt-4 mb-2">➕ Add New Admin</h5>
      <Form className="mb-4">
        <div className="row">
          <div className="col-md-4">
            <Form.Control
              type="text"
              placeholder="Name"
              value={newAdmin.name}
              onChange={(e) => setNewAdmin({ ...newAdmin, name: e.target.value })}
            />
          </div>
          <div className="col-md-4">
            <Form.Control
              type="email"
              placeholder="Email"
              value={newAdmin.email}
              onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
            />
          </div>
          <div className="col-md-4">
            <Button onClick={handleAddAdmin}>Add Admin</Button>
          </div>
        </div>
      </Form>

      <Table bordered hover responsive>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {admins.map((admin) => (
            <tr key={admin.id}>
              <td>{admin.name}</td>
              <td>{admin.email}</td>
              <td>
                <Badge
                  bg={admin.isActive ? 'success' : 'secondary'}
                  style={{ cursor: 'pointer' }}
                  onClick={() => handleToggleActive(admin.id)}
                >
                  {admin.isActive ? 'Active' : 'Suspended'}
                </Badge>
              </td>
              <td>
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => handleRemoveAdmin(admin.id)}
                >
                  Remove
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </Table>

      {/* Modal for admin details */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{currentAdmin?.name}'s Details</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p><strong>Name:</strong> {currentAdmin?.name}</p>
          <p><strong>Email:</strong> {currentAdmin?.email}</p>
          <p><strong>Status:</strong> {currentAdmin?.isActive ? 'Active' : 'Suspended'}</p>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}