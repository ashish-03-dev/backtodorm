import React from "react";
import '../../styles/SellerComponents.css';

export default function OrderTable({ orders }) {
  return (
    <div className="table-responsive">
      <table className="table table-hover table-bordered align-middle">
        <thead className="table-light">
          <tr>
            <th>Order ID</th>
            <th>Poster Title</th>
            <th>Quantity</th>
            <th>Total Price</th>
            <th>Order Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {Array.isArray(orders) && orders.length > 0 ? (
            orders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{order.posterTitle || "Unknown"}</td>
                <td>{order.quantity || 1}</td>
                <td>₹{order.totalPrice || 0}</td>
                <td>{order.createdAt ? new Date(order.createdAt).toLocaleString() : "N/A"}</td>
                <td>{order.status || "Unknown"}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="6" className="text-center text-muted">
                No orders found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}