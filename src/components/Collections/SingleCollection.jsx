import { useParams } from "react-router-dom";


export default function SingleCollection() {
  const collections = {
    "50-poster-mega-pack": {
      title: "50 Poster Mega Pack",
      description: "Get a massive bundle of 50 high-quality posters from all themes at a discounted price.",
      posters: Array.from({ length: 50 }, (_, i) => ({
        id: `mega-${i + 1}`,
        title: `Poster ${i + 1}`,
        img: `https://via.placeholder.com/300x375?text=Poster+${i + 1}`,
        price: 49,
      })),
    },

    "inspirational-quotes-pack": {
      title: "Inspirational Quotes Pack",
      description: "Uplift your space with 10 beautifully designed motivational posters.",
      posters: Array.from({ length: 10 }, (_, i) => ({
        id: `quote-${i + 1}`,
        title: `Quote Poster ${i + 1}`,
        img: `https://via.placeholder.com/300x375?text=Quote+${i + 1}`,
        price: 79,
      })),
    }
  };


  const { collectionId } = useParams();
  const collection = collections?.[collectionId];

  const totalPrice = collection.posters.reduce((sum, p) => sum + p.price, 0);

  // OR apply pack discount
  const discountedPrice = Math.round(totalPrice * 0.8);

  const handleBuyAll = () => {
    // addToCart(collection.posters); // assuming you can handle batch add
  };

  if (!collection) return <p>Collection not found</p>;

  return (
    <div className="container py-5">
      <h2 className="mb-3">{collection.title}</h2>
      <p className="mb-4 text-muted">{collection.description}</p>
      <button className="btn btn-dark mb-4">Buy Full Pack – ₹{totalPrice}</button>


      <div className="row">
        {collection.posters.map((poster) => (
          <div key={poster.id} className="col-6 col-md-4 col-lg-3 mb-4">
            <div className="card h-100 shadow-sm border-0">
              <img src={poster.img} alt={poster.title} className="card-img-top" style={{ aspectRatio: "20/23", objectFit: "cover" }} />
              <div className="card-body text-center">
                <h6 className="fw-semibold text-truncate mb-2">{poster.title}</h6>
                <p className="text-muted fw-semibold mb-0">₹{poster.price}</p>
                <button className="btn btn-sm btn-outline-dark mt-2">Add to Cart</button>

              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
