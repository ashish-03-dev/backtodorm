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
    if (!firestore) {
      setError('User or Firestore not available.');
      setLoading(false);
      return;
    }

    const fetchOrders = async (snapshot, isPending = false) => {
      const fetchedOrders = await Promise.all(
        snapshot.docs.map(async (orderDoc) => {
          const orderData = orderDoc.data();
          const orderRef = doc(firestore, isPending ? 'temporaryOrders' : 'orders', orderData.orderId);
          const orderSnap = await getDoc(orderRef);
          if (!orderSnap.exists()) return null;

          const fullOrderData = isPending ? orderData : orderSnap.data();
          const items = await Promise.all(
            (fullOrderData.items || []).map(async (item) => {
              const ref = item.type === 'poster'
                ? doc(firestore, 'posters', item.posterId)
                : doc(firestore, 'standaloneCollections', item.collectionId);
              const snap = await getDoc(ref);

              return item.type === 'poster'
                ? {
                  type: 'poster',
                  name: item.title || (snap.exists() ? snap.data().title : 'Unknown Poster'),
                  quantity: item.quantity || 1,
                  size: item.size || 'N/A',
                  price: item.finalPrice || item.price || 0,
                }
                : {
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
            })
          );

          return {
            id: orderData.orderId,
            date: (isPending ? orderData.createdAt?.toDate() : orderData.orderDate)
              ? new Date(isPending ? orderData.createdAt.toDate() : orderData.orderDate).toLocaleDateString('en-US', {
                year: 'numeric', month: 'short', day: 'numeric',
              })
              : 'N/A',
            items: items.filter(Boolean),
            total: `₹${(fullOrderData.total || fullOrderData.totalPrice || 0).toLocaleString('en-IN')}`,
            status: isPending ? 'Pending Payment' : orderData.status || 'Pending',
            shippingAddress: fullOrderData.shippingAddress || null,
            paymentStatus: fullOrderData.paymentStatus || (isPending ? 'Pending' : 'Completed'),
            paymentMethod: fullOrderData.paymentMethod || (isPending ? 'Razorpay' : 'N/A'),
            isPending,
          };
        })
      );
      return fetchedOrders.filter(Boolean);
    };

    const ordersQuery = query(collection(firestore, `userOrders/${user.uid}/orders`));
    const pendingOrdersQuery = query(collection(firestore, 'temporaryOrders'), where('userId', '==', user.uid));

    const unsubscribeOrders = onSnapshot(ordersQuery, async (snapshot) => {
      try {
        const confirmedOrders = await fetchOrders(snapshot);
        const unsubscribePending = onSnapshot(pendingOrdersQuery, async (pendingSnapshot) => {
          try {
            const pendingOrders = await fetchOrders(pendingSnapshot, true);
            setOrders([...confirmedOrders, ...pendingOrders].sort((a, b) => new Date(b.date) - new Date(a.date)));
            setLoading(false);
          } catch (err) {
            setError(`Failed to load pending orders: ${err.message}`);
            setLoading(false);
          }
        });
        return () => unsubscribePending();
      } catch (err) {
        setError(`Failed to load orders: ${err.message}`);
        setLoading(false);
      }
    });

    return () => unsubscribeOrders();
  }, []);

  const renderOrders = (orderList) => (
    <div className="d-flex flex-column gap-4">
      {orderList.length === 0 ? (
        <p className="text-muted ms-3">No Orders Yet.</p>
      ) : (
        orderList.map((order) => (
          <div key={order.id} className="card shadow-sm border-0 rounded-3 overflow-hidden">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <div>
                <strong className="fs-6">Order ID:</strong>{' '}
                <span className="text-muted">{order.id}</span>
              </div>
              <span className={`badge px-3 py-2 fs-6 bg-${order.paymentStatus === 'Completed'
                ? order.status === 'Delivered'
                  ? 'success'
                  : order.status === 'Shipped'
                    ? 'primary'
                    : 'warning'
                : order.paymentStatus === 'Pending'
                  ? 'warning'
                  : 'danger'
                }`}>
                {order.paymentStatus === 'Completed' ? order.status : order.paymentStatus}
              </span>
            </div>
            <div className="card-body p-4">
              <div className="row mb-3">
                <div className="col text-muted fs-6">
                  <i className="bi bi-calendar me-2"></i>Placed on {order.date}
                </div>
              </div>
              {order.isPending && (
                <div className="alert alert-warning py-2 mb-4">
                  Awaiting payment confirmation.
                </div>
              )}
              {!order.isPending && order.paymentStatus === 'Failed' && (
                <div className="alert alert-danger py-2 fw-bold text-center mb-4">
                  Payment Failed. Please place a new order or contact support.
                </div>
              )}
              <div className="mb-4">
                <h6 className="fw-bold mb-3">Items</h6>
                <ul className="list-unstyled ps-3">
                  {order.items.map((item, idx) => (
                    <li key={idx} className="mb-3">
                      {item.type === 'poster' ? (
                        <div className="d-flex justify-content-between">
                          <span>
                            {item.name} ({item.size}) × {item.quantity}
                          </span>
                          <span>₹{(item.price * item.quantity).toLocaleString('en-IN')}</span>
                        </div>
                      ) : (
                        <>
                          <div className="d-flex justify-content-between">
                            <span>
                              Collection: {item.name} × {item.quantity} (Discount: {item.collectionDiscount}%)
                            </span>
                            <span></span>
                          </div>
                          <ul className="list-unstyled ps-4 mt-2">
                            {item.posters.map((poster, i) => (
                              <li key={i} className="text-muted">
                                <div className="d-flex justify-content-between">
                                  <span>- {poster.name} ({poster.size})</span>
                                  <span>₹{poster.price.toLocaleString('en-IN')}</span>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="row mb-3">
                <div className="col">
                  <strong>Total:</strong> {order.total}
                </div>
              </div>
              {order.shippingAddress && (
                <div className="row mb-3">
                  <div className="col">
                    <strong>Shipping Address:</strong>
                    <p className="text-muted mb-0">
                      {order.shippingAddress.name}, {order.shippingAddress.address}, {order.shippingAddress.locality}, {order.shippingAddress.city}, {order.shippingAddress.state} - {order.shippingAddress.pincode}
                    </p>
                  </div>
                </div>
              )}
              <div className="row mb-3">
                <div className="col">
                  <strong>Payment:</strong> {order.paymentStatus} via {order.paymentMethod}
                </div>
              </div>
            </div>
          </div>
        ))
      )}
    </div>
  );

  if (loading) {
    return (
      <div className="text-center d-flex align-items-center justify-content-center" style={{ height: "calc(100svh - 65px - 3rem)" }}>
        <p className="mt-2">Loading your orders...</p>
      </div>
    );
  }

  if (error) {
    return <div className="alert alert-danger w-75 mx-auto mt-5">{error}</div>;
  }

  const filteredOrders = {
    all: orders,
    pending: orders.filter((order) => order.isPending),
    confirmed: orders.filter((order) => !order.isPending),
  };

  return (
    <div className="container p-4 p-md-5">
      <div className="row align-items-center">
        <div className="col">
          <h4 className="mb-4">My Orders</h4>
        </div>
      </div>
      <ul className="nav nav-pills mb-4 gap-2">
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'all' ? 'active' : ''}`} onClick={() => setActiveTab('all')}>
            All Orders
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => setActiveTab('pending')}>
            Pending Payment
          </button>
        </li>
        <li className="nav-item">
          <button className={`nav-link ${activeTab === 'confirmed' ? 'active' : ''}`} onClick={() => setActiveTab('confirmed')}>
            Confirmed Orders
          </button>
        </li>
      </ul>
      {renderOrders(filteredOrders[activeTab])}
    </div>
  );
}
