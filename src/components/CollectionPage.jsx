import { useParams } from "react-router-dom";


export default function CollectionPage() {
    const collections = {
  "50-poster-mega-pack": {
    title: "50 Poster Mega Pack",
    description: "A massive pack of 50 bestsellers across themes.",
    posters: [
      { id: "m1", title: "Minimal Dream", img: "/images/minimal.jpg", price: 999 },
      { id: "m2", title: "Retro Vibes", img: "/images/retro.jpg", price: 1099 },
    ],
  },
  "inspirational-quotes-pack": {
    title: "Inspirational Quotes Pack",
    description: "10 motivational posters to keep you inspired.",
    posters: [
      { id: "q1", title: "Never Give Up", img: "/images/quote1.jpg", price: 199 },
    ],
  },
};


  const { collectionId } = useParams();
  const collection = collections?.[collectionId];

  if (!collection) return <p>Collection not found</p>;

  return (
    <div className="container py-5">
      <h2 className="mb-3">{collection.title}</h2>
      <p className="mb-4 text-muted">{collection.description}</p>
      <div className="row">
        {collection.posters.map((poster) => (
          <div key={poster.id} className="col-6 col-md-4 col-lg-3 mb-4">
            <div className="card h-100 shadow-sm border-0">
              <img src={poster.img} alt={poster.title} className="card-img-top" style={{ height: "16rem", objectFit: "cover" }} />
              <div className="card-body text-center">
                <h6 className="fw-semibold text-truncate mb-2">{poster.title}</h6>
                <p className="text-muted fw-semibold mb-0">₹{poster.price}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
