import React from "react";

const wishlistItems = [
  {
    id: "item1",
    title: "Vintage Batman Poster",
    image: "https://via.placeholder.com/150",
    price: "₹249"
  },
  {
    id: "item2",
    title: "Nature Landscape Poster",
    image: "https://via.placeholder.com/150",
    price: "₹199"
  }
];

export default function ProfileWishlist() {
  return (
    <div>
      <h5 className="mb-4 border-bottom pb-2">My Wishlist</h5>

      {wishlistItems.length === 0 ? (
        <p className="text-muted">Your wishlist is empty.</p>
      ) : (
        <div className="row g-3">
          {wishlistItems.map((item) => (
            <div key={item.id} className="col-12 col-md-6">
              <div className="d-flex border rounded p-2 gap-3 align-items-center shadow-sm">
                <img
                  src={item.image}
                  alt={item.title}
                  style={{ width: "80px", height: "100px", objectFit: "cover" }}
                  className="rounded"
                />
                <div className="flex-grow-1">
                  <h6 className="mb-1">{item.title}</h6>
                  <p className="mb-1 text-muted">{item.price}</p>
                  <button className="btn btn-sm btn-outline-danger">
                    Remove
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
