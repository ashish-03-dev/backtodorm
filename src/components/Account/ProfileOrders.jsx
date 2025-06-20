import React, { useState, useEffect } from 'react';
import { useFirebase } from '../../context/FirebaseContext';
import { collection, query, onSnapshot, doc, getDoc } from 'firebase/firestore';
import { Alert, Spinner, Card } from 'react-bootstrap';

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

    const ordersQuery = query(collection(firestore, `userOrders/${user.uid}/orders`));

    const unsubscribe = onSnapshot(
      ordersQuery,
      async (snapshot) => {
        try {
          const fetchedOrders = await Promise.all(
            snapshot.docs.map(async (orderDoc) => {
              const orderData = orderDoc.data();
              const orderRef = doc(firestore, 'orders', orderData.orderId);
              const orderSnap = await getDoc(orderRef);

              if (!orderSnap.exists()) {
                console.warn(`Order ${orderData.orderId} not found in 'orders' collection.`);
                return null;
              }

              const fullOrderData = orderSnap.data();

              const items = await Promise.all(
                (fullOrderData.items || []).map(async (item) => {
                  if (item.type === 'poster') {
                    const posterRef = doc(firestore, 'posters', item.posterId);
                    const posterSnap = await getDoc(posterRef);
                    return {
                      type: 'poster',
                      name: item.title || (posterSnap.exists() ? posterSnap.data().title : 'Unknown Poster'),
                      quantity: item.quantity,
                      size: item.size,
                      price: item.price,
                    };
                  } else {
                    const collectionRef = doc(firestore, 'standaloneCollections', item.collectionId);
                    const collectionSnap = await getDoc(collectionRef);
                    return {
                      type: 'collection',
                      name: collectionSnap.exists() ? collectionSnap.data().title : 'Unknown Collection',
                      quantity: item.quantity,
                      collectionDiscount: item.collectionDiscount || 0,
                      posters: item.posters.map((poster) => ({
                        name: poster.title,
                        size: poster.size,
                        price: poster.price,
                      })),
                    };
                  }
                })
              );

              return {
                id: orderData.orderId,
                date: orderData.orderDate
                  ? new Date(orderData.orderDate).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric',
                    })
                  : 'N/A',
                items: items.filter((item) => item),
                total: `₹${fullOrderData.totalPrice || 0}`,
                status: orderData.status || 'Pending',
                shippingAddress: fullOrderData.shippingAddress || null,
                paymentStatus: fullOrderData.paymentStatus || 'N/A',
                paymentMethod: fullOrderData.paymentMethod || 'N/A',
              };
            })
          );

          setOrders(fetchedOrders.filter((order) => order).sort((a, b) => new Date(b.date) - new Date(a.date)));
          setLoading(false);
        } catch (err) {
          setError(`Failed to load orders: ${err.message}`);
          setLoading(false);
        }
      },
      (err) => {
        setError(`Failed to fetch orders: ${err.message}`);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, firestore]);

  if (loading) {
    return (
      <div className="text-center mt-5">
        <Spinner animation="border" variant="primary" />
      </div>
    );
  }

  if (error) {
    return <Alert variant="danger" className="mt-4">{error}</Alert>;
  }

  return (
    <div className="container mt-4">
      <h5 className="mb-4 border-bottom pb-2">My Orders</h5>

      {orders.length === 0 ? (
        <p className="text-muted">You have no orders yet.</p>
      ) : (
        <div className="d-flex flex-column gap-4">
          {orders.map((order) => (
            <Card key={order.id} className="shadow-sm">
              <Card.Body>
                <div className="d-flex justify-content-between mb-3">
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
                        ? 'bg-warning text-dark'
                        : 'bg-secondary'
                    }`}
                  >
                    {order.status}
                  </span>
                </div>
                <div className="text-muted mb-2">Placed on {order.date}</div>
                <ul className="mb-3 ps-3">
                  {order.items.map((item, idx) => (
                    <li key={idx}>
                      {item.type === 'poster' ? (
                        <span>
                          {item.name} ({item.size}) × {item.quantity} - ₹{item.price * item.quantity}
                        </span>
                      ) : (
                        <span>
                          Collection: {item.name} × {item.quantity} (Discount: {item.collectionDiscount}%)
                          <ul className="ms-3">
                            {item.posters.map((poster, i) => (
                              <li key={i}>
                                {poster.name} ({poster.size}) - ₹{poster.price}
                              </li>
                            ))}
                          </ul>
                        </span>
                      )}
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
              </Card.Body>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}