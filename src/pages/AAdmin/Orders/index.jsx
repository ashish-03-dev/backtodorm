import React, { useState, useEffect } from 'react';
import { Tabs, Tab, Form, Alert, Spinner, Button } from 'react-bootstrap';
import { useFirebase } from '../../../context/FirebaseContext';
import { collection, query, onSnapshot, getDoc, doc, updateDoc, where } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import OrderTable from './OrderTable';
import OrderDetailModal from './OrderDetailModal';
import SupplierModal from './SupplierModal';

const Orders = () => {
  const { firestore, userData, error: firebaseError, functions } = useFirebase();
  const [orders, setOrders] = useState([]);
  const [pendingOrders, setPendingOrders] = useState([]);
  const [filter, setFilter] = useState({ search: '' });
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierData, setSupplierData] = useState({
    supplierName: '',
    items: [],
    address: {
      name: '',
      address: '',
      locality: '',
      city: '',
      state: '',
      pincode: '',
      landmark: ''
    },
    supplierOrderId: '',
    sentOrderId: null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const filteredOrders = (tab) => {
    let filtered = [];
    if (tab === 'pendingPayment') {
      filtered = pendingOrders;
    } else {
      filtered = orders.filter((order) => {
        const matchesTab = tab == 'unforwarded' ? !order.sentToSupplier : order.sentToSupplier;
        return matchesTab;
      });
    }
    return filtered.filter((order) => {
      if (!order) return false; // Guard against undefined orders
      const searchTerm = filter.search ? filter.search.toLowerCase() : '';
      return (
        searchTerm === '' ||
        (order.customerName && typeof order.customerName === 'string' && order.customerName.toLowerCase().includes(searchTerm)) ||
        (order.id && typeof order.id === 'string' && order.id.toLowerCase().includes(searchTerm)) ||
        (order.items &&
          order.items.some((item) => {
            if (item.type === 'poster' && item.posterTitle && typeof item.posterTitle === 'string') {
              return item.posterTitle.toLowerCase().includes(searchTerm);
            }
            if (item.type === 'collection' && item.collectionTitle && typeof item.collectionTitle === 'string') {
              return item.collectionTitle.toLowerCase().includes(searchTerm);
            }
            return false;
          }))
      );
    });
  };

  const handleSendToSupplier = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (!supplierData.supplierOrderId) {
        throw new Error('Supplier Order ID is required');
      }
      await updateDoc(doc(firestore, 'orders', supplierData.sentOrderId), {
        sentToSupplier: true,
        supplierInfo: {
          supplierName: supplierData.supplierName,
          items: supplierData.items.map((item) => ({
            ...item,
          })),
          address: supplierData.address,
          supplierOrderId: supplierData.supplierOrderId,
        },
      });
      setShowSupplierModal(false);
      setSupplierData({
        supplierName: '',
        items: [],
        address: {
          name: '',
          address: '',
          locality: '',
          city: '',
          state: '',
          pincode: '',
          landmark: ''
        },
        supplierOrderId: '',
        sentOrderId: null,
      });
    } catch (err) {
      setError(`Failed to send to supplier: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCheckPendingPayments = async () => {
    setSubmitting(true);
    setError('');
    try {
      const checkPendingPayments = httpsCallable(functions, 'checkPendingPayments');
      const result = await checkPendingPayments();
      const { results } = result.data;
      const completed = results.filter(r => r.status === 'Completed').length;
      const failed = results.filter(r => r.status === 'Failed').length;
      const pending = results.filter(r => r.status === 'Pending').length;
      const errors = results.filter(r => r.status === 'Error').length;
      setError(
        results.length > 0
          ? `Checked ${results.length} pending payments: ${completed} completed, ${failed} failed, ${pending} pending, ${errors} errors.`
          : 'No pending payments to check.'
      );
    } catch (err) {
      setError(`Failed to check pending payments: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyPricing = async (orderId) => {
    setSubmitting(true);
    setError('');
    try {
      const verifyOrderPricing = httpsCallable(functions, 'verifyOrderPricing');
      const result = await verifyOrderPricing({ orderId });
      const { verified, issues } = result.data;
      setError(
        verified
          ? `Order ${orderId} pricing verified successfully.`
          : `Order ${orderId} pricing verification failed: ${issues.join(', ')}`
      );
    } catch (err) {
      setError(`Failed to verify pricing for order ${orderId}: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    if (!firestore || !userData?.isAdmin) return;

    // Fetch confirmed orders (Completed and Failed)
    const ordersQuery = query(collection(firestore, 'orders'));
    const unsubscribeOrders = onSnapshot(
      ordersQuery,
      async (snapshot) => {
        try {
          const orderList = await Promise.all(
            snapshot.docs.map(async (orderDoc) => {
              const orderData = orderDoc.data();
              if (!orderData || !orderData.customerId) {
                console.warn(`Order ${orderDoc.id} has incomplete data`);
                return null; // Skip incomplete orders
              }

              const customerDoc = await getDoc(doc(firestore, 'users', orderData.customerId));
              const customerName = customerDoc.exists() && customerDoc.data().name ? customerDoc.data().name : 'Unknown';

              const items = await Promise.all(
                (orderData.items || []).map(async (item) => {
                  if (!item || !item.type) {
                    console.warn(`Item in order ${orderDoc.id} is incomplete`);
                    return { ...item, posterTitle: 'Unknown', collectionTitle: 'Unknown' };
                  }
                  if (item.type === 'poster' && item.posterId) {
                    const posterDoc = await getDoc(doc(firestore, 'posters', item.posterId));
                    return {
                      ...item,
                      posterTitle: posterDoc.exists() && posterDoc.data().title ? posterDoc.data().title : 'Unknown Poster',
                    };
                  } else if (item.type === 'collection' && item.collectionId) {
                    const collectionDoc = await getDoc(doc(firestore, 'standaloneCollections', item.collectionId));
                    return {
                      ...item,
                      collectionTitle: collectionDoc.exists() && collectionDoc.data().title ? collectionDoc.data().title : 'Unknown Collection',
                    };
                  }
                  return { ...item, posterTitle: 'Unknown', collectionTitle: 'Unknown' };
                })
              );

              return {
                id: orderDoc.id,
                ...orderData,
                customerName,
                items: items.filter(item => item !== null), // Remove null items
              };
            })
          );
          setOrders(orderList.filter(order => order !== null)); // Remove null orders
          setLoading(false);
        } catch (err) {
          console.error('Error fetching orders:', err);
          setError(`Failed to fetch orders: ${err.message}`);
          setLoading(false);
        }
      },
      (err) => {
        console.error('Snapshot error for orders:', err);
        setError(`Failed to fetch orders: ${err.message}`);
        setLoading(false);
      }
    );

    // Fetch pending orders (only paymentStatus: Pending)
    const pendingOrdersQuery = query(
      collection(firestore, 'temporaryOrders'),
      where('paymentStatus', '==', 'Pending')
    );
    const unsubscribePendingOrders = onSnapshot(
      pendingOrdersQuery,
      async (snapshot) => {
        try {
          const pendingOrderList = await Promise.all(
            snapshot.docs.map(async (orderDoc) => {
              const orderData = orderDoc.data();
              if (!orderData || !orderData.userId) {
                console.warn(`Pending order ${orderDoc.id} has incomplete data`);
                return null; // Skip incomplete orders
              }

              const customerDoc = await getDoc(doc(firestore, 'users', orderData.userId));
              const customerName = customerDoc.exists() && customerDoc.data().name ? customerDoc.data().name : 'Unknown';

              const items = await Promise.all(
                (orderData.items || []).map(async (item) => {
                  if (!item || !item.type) {
                    console.warn(`Item in pending order ${orderDoc.id} is incomplete`);
                    return { ...item, posterTitle: 'Unknown', collectionTitle: 'Unknown' };
                  }
                  if (item.type === 'poster' && item.posterId) {
                    const posterDoc = await getDoc(doc(firestore, 'posters', item.posterId));
                    return {
                      ...item,
                      posterTitle: posterDoc.exists() && posterDoc.data().title ? posterDoc.data().title : 'Unknown Poster',
                    };
                  } else if (item.type === 'collection' && item.collectionId) {
                    const collectionDoc = await getDoc(doc(firestore, 'standaloneCollections', item.collectionId));
                    return {
                      ...item,
                      collectionTitle: collectionDoc.exists() && collectionDoc.data().title ? collectionDoc.data().title : 'Unknown Collection',
                    };
                  }
                  return { ...item, posterTitle: 'Unknown', collectionTitle: 'Unknown' };
                })
              );

              return {
                id: orderDoc.id,
                customerId: orderData.userId,
                customerName,
                items: items.filter(item => item !== null),
                subtotal: orderData.subtotal || 0,
                deliveryCharge: orderData.deliveryCharge || 0,
                totalPrice: orderData.total || 0,
                orderDate: orderData.createdAt || null,
                paymentStatus: orderData.paymentStatus || 'Pending',
                shippingAddress: orderData.shippingAddress || {},
                razorpay_order_id: orderData.orderId || null,
                razorpay_payment_id: orderData.razorpay_payment_id || null,
              };
            })
          );
          setPendingOrders(pendingOrderList.filter(order => order !== null));
          setLoading(false);
        } catch (err) {
          console.error('Error fetching pending orders:', err);
          setError(`Failed to fetch pending orders: ${err.message}`);
          setLoading(false);
        }
      },
      (err) => {
        console.error('Snapshot error for pending orders:', err);
        setError(`Failed to fetch pending orders: ${err.message}`);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeOrders();
      unsubscribePendingOrders();
    };
  }, [firestore, userData]);

  if (!userData?.isAdmin) {
    return (
      <div className="container mt-4">
        <Alert variant="danger">Access Denied: Admin privileges required.</Alert>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100svh' }}>
        <Spinner animation="border" className="text-primary" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </div>
    );
  }

  if (firebaseError) {
    return (
      <div className="container mt-4">
        <Alert variant="danger">Firebase Error: {firebaseError}</Alert>
      </div>
    );
  }

  return (
    <div className="p-4 p-md-5">
      <h3 className="mb-4">📦 Orders Management</h3>
      {error && <Alert variant="danger" onClose={() => setError('')} dismissible>{error}</Alert>}

      <div className="row g-3 mb-4">
        <div className="col-md-5">
          <Form.Control
            type="search"
            placeholder="Search by Customer, Order ID, or Item"
            value={filter.search}
            onChange={(e) => setFilter((prev) => ({ ...prev, search: e.target.value }))}
            disabled={submitting}
          />
        </div>
        <div className="col-md-7">
          <Button
            variant="primary"
            onClick={handleCheckPendingPayments}
            disabled={submitting}
            className="me-2"
          >
            Check Pending Payments
          </Button>
        </div>
      </div>

      <Tabs defaultActiveKey="pendingPayment" className="mb-3">
        <Tab eventKey="pendingPayment" title="Pending Payment">
          <OrderTable
            orders={filteredOrders('pendingPayment')}
            handleShowDetail={setSelectedOrder}
            setShowDetailModal={setShowDetailModal}
            setSupplierData={setSupplierData}
            setShowSupplierModal={setShowSupplierModal}
            handleVerifyPricing={handleVerifyPricing}
            submitting={submitting}
            isPendingTab
          />
        </Tab>
        <Tab eventKey="unforwarded" title="Unforwarded Orders">
          <OrderTable
            orders={filteredOrders('unforwarded')}
            handleShowDetail={setSelectedOrder}
            setShowDetailModal={setShowDetailModal}
            setSupplierData={setSupplierData}
            setShowSupplierModal={setShowSupplierModal}
            handleVerifyPricing={handleVerifyPricing}
            submitting={submitting}
          />
        </Tab>
        <Tab eventKey="forwarded" title="Forwarded Orders">
          <OrderTable
            orders={filteredOrders('forwarded')}
            handleShowDetail={setSelectedOrder}
            setShowDetailModal={setShowDetailModal}
            setSupplierData={setSupplierData}
            setShowSupplierModal={setShowSupplierModal}
            handleVerifyPricing={handleVerifyPricing}
            submitting={submitting}
          />
        </Tab>
      </Tabs>

      <OrderDetailModal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        order={selectedOrder}
      />

      <SupplierModal
        show={showSupplierModal}
        onHide={() => setShowSupplierModal(false)}
        supplierData={supplierData}
        setSupplierData={setSupplierData}
        submitting={submitting}
        handleSendToSupplier={handleSendToSupplier}
      />
    </div>
  );
};

export default Orders;