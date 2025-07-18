import React, { useState, useEffect } from 'react';
import { useFirebase } from '../../context/FirebaseContext';
import { collection, query, where, onSnapshot, doc, getDoc } from 'firebase/firestore';
import 'bootstrap/dist/css/bootstrap.min.css';

export default function ProfileOrders() {
  const { user, firestore } = useFirebase();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('all');

  useEffect(() => {
    if (!firestore || !user?.uid) {
      setError('User or Firestore not available.');
      setLoading(false);
      return;
    }

    const parseItem = async (item) => {
      const isPoster = item.type === 'poster';
      const ref = isPoster
        ? doc(firestore, 'posters', item.posterId)
        : doc(firestore, 'standaloneCollections', item.collectionId);
      const snap = await getDoc(ref);

      if (isPoster) {
        return {
          type: 'poster',
          name: item.title || (snap.exists() ? snap.data().title : 'Unknown Poster'),
          quantity: item.quantity || 1,
          size: item.size || 'N/A',
          price: item.finalPrice || item.price || 0,
        };
      }

      return {
        type: 'collection',
        name: snap.exists() ? snap.data().title : 'Unknown Collection',
        quantity: item.quantity || 1,
        collectionDiscount: item.collectionDiscount || 0,
        posters: (item.posters || []).map((poster) => ({
          name: poster.title || 'Unknown Poster',
          size: poster.size || 'N/A',
          price: poster.finalPrice || poster.price || 0,
        })),
      };
    };

    const fetchOrders = async (snapshot, isTemporary) => {
      const orders = await Promise.all(snapshot.docs.map(async (orderDoc) => {
        const orderData = orderDoc.data();
        const orderId = orderData.orderId;

        const orderRef = doc(firestore, isTemporary ? 'temporaryOrders' : 'orders', orderId);
        const orderSnap = await getDoc(orderRef);
        if (!orderSnap.exists()) return null;

        const fullOrder = orderSnap.data();
        const items = await Promise.all((fullOrder.items || []).map(parseItem));
        const rawDate = fullOrder.orderDate || fullOrder.createdAt || null;

        return {
          id: orderId,
          orderDate: rawDate,
          items,
          total: `₹${(fullOrder.total || fullOrder.totalPrice || 0).toLocaleString('en-IN')}`,
          status: isTemporary ? 'Pending Payment' : fullOrder.status || 'Pending',
          shippingAddress: fullOrder.shippingAddress || null,
          paymentStatus: isTemporary
            ? 'Pending'
            : fullOrder.paymentStatus || orderData.paymentStatus || 'Pending',
          paymentMethod: fullOrder.paymentMethod || (isTemporary ? 'Razorpay' : 'N/A'),
        };
      }));

      return orders.filter(Boolean);
    };

    const confirmedOrdersRef = query(collection(firestore, `userOrders/${user.uid}/orders`));
    const pendingOrdersRef = query(collection(firestore, `userOrders/${user.uid}/pendingOrders`));

    const unsubscribeConfirmed = onSnapshot(confirmedOrdersRef, async (confirmedSnap) => {
      try {
        const confirmed = await fetchOrders(confirmedSnap, false);
        const unsubscribePending = onSnapshot(pendingOrdersRef, async (pendingSnap) => {
          try {
            const pending = await fetchOrders(pendingSnap, true);
            const combined = [...confirmed, ...pending].sort((a, b) => {
              return new Date(b.orderDate?.toDate?.() || b.orderDate) - new Date(a.orderDate?.toDate?.() || a.orderDate);
            });
            setOrders(combined);
          } catch (err) {
            setError(`Failed to load pending orders: ${err.message}`);
          } finally {
            setLoading(false);
          }
        });

        return () => unsubscribePending();
      } catch (err) {
        setError(`Failed to load confirmed orders: ${err.message}`);
        setLoading(false);
      }
    });

    return () => unsubscribeConfirmed();
  }, [firestore, user?.uid]);

  const renderOrders = (orderList) => (
    <div className="d-flex flex-column gap-3">
      {orderList.length === 0 ? (
        <p className="text-muted text-center my-4">No orders found.</p>
      ) : (
        orderList.map((order) => (
          <div key={order.id} className="card border rounded-3">
            <div className="card-body p-3">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0 text-muted">Order #{order.id}</h6>
                <span className={`badge bg-${order.paymentStatus === 'Failed' ? 'danger'
                    : order.paymentStatus === 'Pending' ? 'warning'
                      : order.status === 'Order Placed' ? 'primary'   // Blue
                        : order.status === 'Shipped' ? 'primary'            // Blue
                          : order.status === 'Delivered' ? 'success'          // Green
                            : order.status === 'Cancelled' ? 'danger'           // Red
                              : 'secondary'                                       // Fallback
                  }`}>
                  {order.paymentStatus === 'Completed' ? order.status : order.paymentStatus}
                </span>
              </div>
              <p className="text-muted small mb-2">
                <i className="bi bi-calendar me-1"></i>
                {order.orderDate?.toDate().toLocaleString('en-IN', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: '2-digit',
                  hour12: true,
                })}
              </p>
              {order.paymentStatus === 'Pending' && (
                <div className="alert alert-warning py-1 mb-2 small">
                  Awaiting payment confirmation.
                </div>
              )}
              {order.paymentStatus === 'Failed' && (
                <div className="alert alert-danger py-1 mb-2 small">
                  Payment Failed. Please retry or contact support.
                </div>
              )}
              <ul className="list-unstyled mb-2">
                {order.items.map((item, idx) => (
                  <li key={idx} className="mb-2">
                    {item.type === 'poster' ? (
                      <div className="d-flex justify-content-between small">
                        <span>{item.name} ({item.size}) × {item.quantity}</span>
                        <span>₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                      </div>
                    ) : (
                      <>
                        <div className="d-flex justify-content-between small">
                          <span>Collection: {item.name} × {item.quantity}</span>
                          <span>{item.collectionDiscount}% off</span>
                        </div>
                        <ul className="list-unstyled ps-3 small text-muted">
                          {item.posters.map((poster, i) => (
                            <li key={i} className="d-flex justify-content-between">
                              <span>- {poster.name} ({poster.size})</span>
                              <span>₹{poster.price.toLocaleString('en-IN')}</span>
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                  </li>
                ))}
              </ul>
              <div className="d-flex justify-content-between small mb-2">
                <strong>Total:</strong>
                <span>{order.total}</span>
              </div>
              {order.shippingAddress && (
                <div className="small text-muted mb-2">
                  <strong>Shipping:</strong> {order.shippingAddress.name}, {order.shippingAddress.address}, {order.shippingAddress.locality}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                </div>
              )}
              <div className="small text-muted">
                <strong>Payment:</strong> {order.paymentStatus} via {order.paymentMethod}
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger text-center w-50 mx-auto my-4" role="alert">
        {error}
      </div>
    );
  }

  const filteredOrders = {
    all: orders,
    pending: orders.filter((order) => order.paymentStatus === 'Pending'),
    confirmed: orders.filter((order) => order.paymentStatus === 'Completed'),
  };

  return (
    <div className="container py-4">
      <h5 className="mb-3 fw-bold">My Orders</h5>
      <ul className="nav nav-tabs mb-3">
        {['all', 'pending', 'confirmed'].map((tab) => (
          <li key={tab} className="nav-item">
            <button
              className={`nav-link ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'all' ? 'All Orders' : tab === 'pending' ? 'Pending' : 'Confirmed'}
            </button>
          </li>
        ))}
      </ul>
      {renderOrders(filteredOrders[activeTab])}
    </div>
  );
}