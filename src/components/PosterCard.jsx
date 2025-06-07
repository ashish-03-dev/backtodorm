import { Link } from 'react-router-dom';

export default function PosterCard({ poster, addToCart }) {
  return (
    <div className="card border-0 shadow-sm h-100">
      <Link to={`/poster/${poster.id}`} className="text-decoration-none text-dark">
        <img src={poster.img} alt={poster.title} className="card-img-top" />
      </Link>
      <div className="card-body d-flex flex-column">
        <h5 className="card-title">{poster.title}</h5>
        <p className="text-muted small mb-2">{poster.description}</p>
        <p className="card-text fw-semibold">₹{poster.price}</p>
        <button
          onClick={() => addToCart(poster)}
          className="btn btn-dark mt-auto"
        >
          Add to Cart
        </button>
      </div>
    </div>
  );
}


// export default function PosterCard({ poster }) {
//   return (
//     <Link to={`/product/${poster.id}`} className="text-decoration-none text-dark">
//       <div className="card h-100 shadow-sm">
//         <img src={poster.image} className="card-img-top" alt={poster.title} />
//         <div className="card-body text-center">
//           <h5 className="card-title">{poster.title}</h5>
//           <p className="card-text">₹{poster.price}</p>
//         </div>
//       </div>
//     </Link>
//   );
// }


// export default function PosterCard({ poster, addToCart }) {
//   return (
//     <div className="card h-100 shadow-sm border-0">
//       <Link to={`/poster/${poster.id}`} className="text-decoration-none text-dark">
//         <div className="ratio ratio-4x3 overflow-hidden">
//           <img
//             src={poster.img}
//             className="card-img-top object-fit-cover"
//             alt={poster.title}
//           />
//         </div>
//       </Link>
//       <div className="card-body d-flex flex-column">
//         <h5 className="card-title">{poster.title}</h5>
//         <p className="card-text fw-semibold">{poster.price}</p>
//         <button
//           onClick={() => addToCart(poster)}
//           className="btn btn-dark mt-auto"
//         >
//           Add to Cart
//         </button>
//       </div>
//     </div>
//   );
// }



// export default function PosterCard({ poster, addToCart }) {
//   return (
//     <div className="card h-100 shadow-sm border-0">
//       <Link to={`/poster/${poster.id}`} className="text-decoration-none text-dark">
//         <img
//           src={poster.img}
//           className="card-img-top"
//           alt={poster.title}
//           style={{ height: '350px', objectFit: 'cover' }}
//         />
//       </Link>
//       <div className="card-body d-flex flex-column">
//         <h5 className="card-title">{poster.title}</h5>
//         <p className="card-text fw-semibold">{poster.price}</p>
//         <button
//           onClick={() => addToCart(poster)}
//           className="btn btn-dark mt-auto"
//         >
//           Add to Cart
//         </button>
//       </div>
//     </div>
//   );
// }