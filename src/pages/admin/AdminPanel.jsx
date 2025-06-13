import React, { useEffect, useState } from 'react';
// import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
// import { db } from '../firebase';
import { Link } from 'react-router-dom';

export default function AdminPanel() {
  const [posters, setPosters] = useState([]);

  const fetchPosters = async () => {
    // const snapshot = await getDocs(collection(db, 'posters'));
    // setPosters(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
  };

  const handleDelete = async (id) => {
    // await deleteDoc(doc(db, 'posters', id));
    // fetchPosters();
  };

  useEffect(() => { fetchPosters(); }, []);

  return (
    <div className="container py-5">
      <h2 className="mb-4">Admin Panel</h2>
      <Link to="/admin/add" className="btn btn-dark mb-3">Add New Poster</Link>
      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Image</th>
              <th>Title</th>
              <th>Price</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {posters.map((poster) => (
              <tr key={poster.id}>
                <td><img src={poster.img} alt="thumb" width="60" /></td>
                <td>{poster.title}</td>
                <td>₹{poster.price}</td>
                <td>
                  <Link to={`/admin/edit/${poster.id}`} className="btn btn-sm btn-outline-primary me-2">Edit</Link>
                  <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(poster.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}