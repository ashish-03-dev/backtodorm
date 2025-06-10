import { useParams } from "react-router-dom";
import allCollections from "../data/allCollections";
import { Link } from "react-router-dom";

export default function CategoryCollectionsPage() {
  const { categoryType } = useParams();
  const collectionsInCategory = allCollections[categoryType];

  if (!collectionsInCategory) {
    return <p className="p-5 text-center">No such category found.</p>;
  }

  return (
    <div className="container py-5">
      <h2 className="mb-4 text-capitalize">{categoryType.replace("-", " ")}</h2>
      {Object.entries(collectionsInCategory).map(([collectionId, posters]) => (
        <div key={collectionId} className="mb-5">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h4 className="text-capitalize mb-0">{collectionId.replace("-", " ")}</h4>
            <Link
              to={`/collections/${categoryType}/${collectionId}`}
              className="btn btn-sm btn-outline-dark"
            >
              View All
            </Link>
          </div>
          <div className="row">
            {posters.slice(0, 4).map((poster) => (
              <div key={poster.id} className="col-6 col-md-3 mb-3">
                <div className="card h-100 border-0 shadow-sm">
                  <img
                    src={poster.img}
                    alt={poster.title}
                    className="card-img-top"
                    style={{ aspectRatio:"20/23", objectFit: "cover", borderRadius: ".375rem" }}
                  />
                  <div className="card-body text-center">
                    <h6 className="fw-semibold text-truncate mb-1">{poster.title}</h6>
                    <p className="text-muted fw-semibold mb-0">₹{poster.price}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
