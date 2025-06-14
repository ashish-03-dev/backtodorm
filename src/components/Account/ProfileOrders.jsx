import React from "react";

const orders = [
  {
    id: "ORD123456",
    date: "2025-06-10",
    items: [
      { name: "Marvel Poster", quantity: 1 },
      { name: "Nature Wall Art", quantity: 2 }
    ],
    total: "₹599",
    status: "Delivered"
  },
  {
    id: "ORD123457",
    date: "2025-05-25",
    items: [{ name: "Cyberpunk Poster", quantity: 1 }],
    total: "₹299",
    status: "Shipped"
  }
];

export default function ProfileOrders() {
  return (
    <div>
      <h5 className="mb-4 border-bottom pb-2">My Orders</h5>

      {orders.length === 0 ? (
        <p className="text-muted">You have no orders yet.</p>
      ) : (
        <div className="d-flex flex-column gap-4">
          {orders.map((order) => (
            <div key={order.id} className="border rounded p-3 shadow-sm">
              <div className="d-flex justify-content-between mb-2">
                <div>
                  <strong>Order ID:</strong> {order.id}
                </div>
                <span className="badge bg-success">{order.status}</span>
              </div>
              <div className="text-muted mb-2">Placed on {order.date}</div>
              <ul className="mb-2 ps-3">
                {order.items.map((item, idx) => (
                  <li key={idx}>
                    {item.name} &times; {item.quantity}
                  </li>
                ))}
              </ul>
              <div>
                <strong>Total:</strong> {order.total}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
