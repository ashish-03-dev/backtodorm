import React, { useState, useEffect } from 'react';
import { useFirebase } from '../../context/FirebaseContext';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Alert, Spinner } from 'react-bootstrap';

export default function ProfileOrders() {
  const { user, firestore } = useFirebase();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user || !firestore) {
      setError('Please log in to view your orders.');
      setLoading(false);
      return;
    }

    const ordersQuery = query(
      collection(firestore, 'orders'),
      where('customerId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(
      ordersQuery,
      async (snapshot) => {
        try {
          const fetchedOrders = await Promise.all(
            snapshot.docs.map(async (orderDoc) => {
              const orderData = orderDoc.data();
              // Fetch poster details for item name
              let posterTitle = 'Unknown Poster';
              try {
                const posterRef = doc(firestore, 'posters', orderData.posterId);
                const posterSnap = await getDoc(posterRef);
                if (posterSnap.exists()) {
                  posterTitle = posterSnap.data().title || 'Untitled';
                }
              } catch (err) {
                console.error(`Failed to fetch poster ${orderData.posterId}:`, err);
              }

              return {
                id: orderDoc.id,
                date: orderData.orderDate
                  ? new Date(orderData.orderDate).toLocaleDateString('en-IN', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'N/A',
                items: [
                  {
                    name: posterTitle,
                    quantity: orderData.quantity || 1,
                    size: orderData.size || 'N/A',
                  },
                ],
                total: `₹${orderData.totalPrice || 0}`,
                status: orderData.status || 'Pending',
                shippingAddress: orderData.shippingAddress || null,
                paymentStatus: orderData.paymentStatus || 'N/A',
                paymentMethod: orderData.paymentMethod || 'N/A',
              };
            })
          );

          setOrders(fetchedOrders.sort((a, b) => new Date(b.date) - new Date(a.date))); // Sort by date descending
          setLoading(false);
        } catch (err) {
          setError(`Failed to load orders: ${err.message}`);
          setLoading(false);
        }
      },
      (err) => {
        setError(`Failed to load orders: ${err.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, firestore]);

  if (loading) {
    return (
      <div className="text-center my-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

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
                <span
                  className={`badge ${
                    order.status === 'Delivered'
                      ? 'bg-success'
                      : order.status === 'Shipped'
                      ? 'bg-primary'
                      : order.status === 'Pending'
                      ? 'bg-warning'
                      : 'bg-secondary'
                  }`}
                >
                  {order.status}
                </span>
              </div>
              <div className="text-muted mb-2">Placed on {order.date}</div>
              <ul className="mb-2 ps-3">
                {order.items.map((item, idx) => (
                  <li key={idx}>
                    {item.name} ({item.size}) × {item.quantity}
                  </li>
                ))}
              </ul>
              <div className="mb-2">
                <strong>Total:</strong> {order.total}
              </div>
              {order.shippingAddress && (
                <div className="mb-2">
                  <strong>Shipping Address:</strong>
                  <p className="mb-0 text-muted">
                    {order.shippingAddress.name}, {order.shippingAddress.address},{' '}
                    {order.shippingAddress.locality}, {order.shippingAddress.city},{' '}
                    {order.shippingAddress.state} - {order.shippingAddress.pincode}
                    {order.shippingAddress.landmark &&
                      `, Landmark: ${order.shippingAddress.landmark}`}
                  </p>
                </div>
              )}
              <div>
                <strong>Payment:</strong> {order.paymentStatus} via {order.paymentMethod}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}