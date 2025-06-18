import React, { useState, useEffect } from "react";
import { Spinner, Alert } from "react-bootstrap";
import { useFirebase } from "../../context/FirebaseContext";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import OrderTable from "./OrderTable";
import '../../styles/SellerComponents.css';

export default function SalesHistory() {
  const { firestore, user } = useFirebase();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!firestore || !user) return;
    const ordersQuery = query(
      collection(firestore, "orders"),
      where("sellerId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(
      ordersQuery,
      (snapshot) => {
        setOrders(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        setLoading(false);
      },
      (err) => {
        setError(`Failed to fetch orders: ${err.message}`);
        setLoading(false);
      }
    );
    return () => unsubscribe();
  }, [firestore, user]);

  if (loading) {
    return <Spinner animation="border" className="d-block mx-auto my-5" />;
  }

  return (
    <div>
      <h4 className="mb-4">Sales History</h4>
      {error && <Alert variant="danger" onClose={() => setError("")} dismissible>{error}</Alert>}
      <OrderTable orders={orders} />
    </div>
  );
}