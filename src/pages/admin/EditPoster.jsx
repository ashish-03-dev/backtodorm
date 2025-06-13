import React, { useEffect, useState } from 'react';
// import { doc, getDoc, updateDoc } from 'firebase/firestore';
// import { db } from '../firebase';
import { useNavigate, useParams } from 'react-router-dom';

export default function EditPoster() {
  const [poster, setPoster] = useState(null);
  const { id } = useParams();
  const navigate = useNavigate();

  useEffect(() => {
    // const fetchPoster = async () => {
    //   const ref = doc(db, 'posters', id);
    //   const snap = await getDoc(ref);
    //   setPoster(snap.data());
    // };
    // fetchPoster();
  }, [id]);

  const handleChange = (e) => setPoster({ ...poster, [e.target.name]: e.target.value });

  const handleUpdate = async (e) => {
    // e.preventDefault();
    // await updateDoc(doc(db, 'posters', id), poster);
    // navigate('/admin');
  };

  if (!poster) return <p>Loading...</p>;

  return (
    <div className="container py-5">
      <h2>Edit Poster</h2>
      <form onSubmit={handleUpdate} className="mt-3">
        <input name="title" value={poster.title} className="form-control mb-2" onChange={handleChange} required />
        <input name="price" value={poster.price} type="number" className="form-control mb-2" onChange={handleChange} required />
        <input name="img" value={poster.img} className="form-control mb-2" onChange={handleChange} required />
        <input name="category" value={poster.category} className="form-control mb-2" onChange={handleChange} />
        <input name="collection" value={poster.collection} className="form-control mb-2" onChange={handleChange} />
        <button className="btn btn-dark mt-2">Update Poster</button>
      </form>
    </div>
  );
}
