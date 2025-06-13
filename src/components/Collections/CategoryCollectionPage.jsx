import { useParams } from "react-router-dom";
import allCollections from "../../data/allCollections";
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
          <div className="d-flex overflow-auto gap-2"
            style={{
              scrollbarWidth: "none",
              msOverflowStyle: "none",
              WebkitScrollbar: 'none',
              scrollBehavior: "smooth",
              scrollSnapType: "x mandatory",
              WebkitOverflowScrolling: "touch",
            }}>
            {posters.slice(0, 4).map((poster) => (
              <div
                key={poster.id}
                style={{
                  flex: "0 0 auto",
                  width: "clamp(160px, 25%, 300px)", // min 160px, ideal 25%, max 240px
                }}
              >


                <div className="card h-100 border">
                  <img
                    src={poster.img}
                    alt={poster.title}
                    className="card-img-top"
                    style={{ aspectRatio: "4/5", objectFit: "cover" }}
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
