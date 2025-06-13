import React, { useState } from 'react';
// import { addDoc, collection } from 'firebase/firestore';
// import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function AddPoster() {
  const [poster, setPoster] = useState({ title: '', price: '', img: '', category: '', collection: '' });
  const navigate = useNavigate();

  const handleChange = (e) => setPoster({ ...poster, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    // e.preventDefault();
    // await addDoc(collection(db, 'posters'), poster);
    // navigate('/admin');
  };

  return (
    <div className="container py-5">
      <h2>Add New Poster</h2>
      <form onSubmit={handleSubmit} className="mt-3">
        <input name="title" placeholder="Title" className="form-control mb-2" onChange={handleChange} required />
        <input name="price" placeholder="Price" type="number" className="form-control mb-2" onChange={handleChange} required />
        <input name="img" placeholder="Image URL" className="form-control mb-2" onChange={handleChange} required />
        <input name="category" placeholder="Category (e.g. pop-culture)" className="form-control mb-2" onChange={handleChange} />
        <input name="collection" placeholder="Collection (e.g. anime)" className="form-control mb-2" onChange={handleChange} />
        <button className="btn btn-dark mt-2">Add Poster</button>
      </form>
    </div>
  );
}
