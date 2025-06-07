import React from 'react';

const features = [
  { icon: '🚚', label: 'Fast Delivery' },
  { icon: '💰', label: 'Affordable Prices' },
  { icon: '🎨', label: 'Unique Designs' },
  { icon: '✅', label: 'Premium Quality' },
];

export default function WhyChooseUs() {
  return (
    <section className="py-5 px-3 text-center bg-white">
      <h2 className="fs-2 fw-bold mb-4">Why Choose Us</h2>

      <div className="row row-cols-2 row-cols-md-4 g-4">
        {features.map((feat, i) => (
          <div key={i} className="col d-flex">
            <div
              className="w-100 p-4 border rounded d-flex flex-column align-items-center justify-content-center text-center shadow-sm"
              style={{
                minHeight: '160px',
                transition: 'box-shadow 0.3s',
                flexGrow: 1,
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.boxShadow =
                  '0 6px 20px rgba(0,0,0,0.12)')
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.boxShadow =
                  '0 2px 8px rgba(0,0,0,0.06)')
              }
            >
              <div className="fs-1 mb-2">{feat.icon}</div>
              <h4 className="fs-6 fw-semibold m-0">{feat.label}</h4>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
