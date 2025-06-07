import React from "react";
import { useParams } from "react-router-dom";
import posters from "../data/posters"; // Centralized poster data
import PosterCard from "./PosterCard";
import allCollections from '../data/allCollections';

export default function CollectionDetail({ addToCart }) {

  const { categoryType, collectionId } = useParams();
  const posters = allCollections?.[categoryType]?.[collectionId] || [];

  return (
    <div className="container py-5">
      <h2 className="mb-4 text-capitalize">{collectionId.replace("-", " ")}</h2>
      <div className="row">
        {posters.length === 0 ? (
          <p>No posters found.</p>
        ) : (
          posters.map((poster) => (
            <div key={poster.id} className="col-6 col-md-4 col-lg-3 mb-4">
              {/* <PosterCard poster={poster} addToCart={addToCart} /> */}
              <div className="card h-100 shadow-sm border-0">
                <img src={poster.img} alt={poster.title} className="card-img-top" style={{ height: "16rem", objectFit: "cover" }} />
                <div className="card-body text-center">
                  <h6 className="fw-semibold text-truncate mb-2">{poster.title}</h6>
                  <p className="text-muted fw-semibold mb-0">₹{poster.price}</p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}