import React from 'react';
import { Offcanvas, Button, ListGroup, Image } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import '../../styles/CartSidebar.css';

export default function CartSidebar({ cartItems = [], show, onClose, removeFromCart, updateQuantity }) {
  const navigate = useNavigate();

  const handleGoToCheckout = () => {
    onClose();
    navigate('/checkout');
  };

  // Group items by collectionId to calculate discounted totals
  const groupedByCollection = cartItems.reduce((acc, item) => {
    const key = item.type === 'collection' ? item.collectionId : `individual-${item.posterId || item.id}-${item.size}`;
    if (!acc[key]) {
      acc[key] = {
        items: [],
        discount: item.type === 'collection' ? item.collectionDiscount || 0 : 0,
        type: item.type,
        collectionId: item.type === 'collection' ? item.collectionId : null,
      };
    }
    acc[key].items.push(item);
    return acc;
  }, {});

  const totalPrice = Object.values(groupedByCollection).reduce((acc, group) => {
    const groupTotal = group.items.reduce((sum, item) => {
      if (item.type === 'collection') {
        return sum + item.posters.reduce((pSum, p) => pSum + (p.price || 0), 0) * (item.quantity || 1);
      }
      return sum + (item.price || 0) * (item.quantity || 1);
    }, 0);
    return acc + groupTotal * (1 - group.discount / 100);
  }, 0).toFixed(2);

  const handleUpdateQuantity = (id, size, newQuantity, isCollection = false) => {
    if (newQuantity < 1) return;
    updateQuantity(id, size, newQuantity, isCollection);
  };

  const handleRemoveFromCart = (id, size, isCollection = false) => {
    if (!id) {
      console.error('Invalid ID:', id);
      return;
    }
    removeFromCart(id, size, isCollection);
  };

  return (
    <>
      <div className={`cart-sidebar-overlay ${show ? 'show' : ''}`} onClick={onClose}></div>
      <Offcanvas
        show={show}
        onHide={onClose}
        placement="end"
        name="cart"
        className={`cart-sidebar ${show ? 'open' : ''}`}
        style={{ width: window.innerWidth <= 768 ? '320px' : '400px' }}
      >
        <Offcanvas.Header closeButton>
          <Offcanvas.Title>Your Cart ({cartItems.length} items)</Offcanvas.Title>
        </Offcanvas.Header>
        <Offcanvas.Body
          className="p-3 flex-grow-1"
          style={{ overflowY: 'auto', maxHeight: 'calc(100vh - 200px)' }}
        >
          {cartItems.length === 0 ? (
            <p className="text-center text-muted">No items in cart yet.</p>
          ) : (
            <ListGroup variant="flush">
              {Object.entries(groupedByCollection).map(([groupId, group]) => (
                <React.Fragment key={groupId}>
                  {group.type === 'collection' && (
                    <div className="mb-2">
                      <h6 className="fw-semibold">
                        Collection Pack: {group.items[0]?.collectionId || 'Untitled'} (Discount: {group.discount}%)
                      </h6>
                    </div>
                  )}
                  {group.items.map((item, index) => (
                    <ListGroup.Item
                      key={`${groupId}-${index}`}
                      className="d-flex align-items-start mb-3 border-bottom pb-2"
                    >
                      {item.type === 'collection' ? (
                        <>
                          <Image
                            src={item.posters[0]?.image || 'https://via.placeholder.com/60'}
                            alt="Collection"
                            style={{ width: '60px', aspectRatio: '4/5', objectFit: 'cover' }}
                            className="me-3 rounded flex-shrink-0"
                          />
                          <div className="flex-grow-1">
                            <h6 className="mb-1">Collection: {item.collectionId}</h6>
                            <ul className="mb-2 ps-3">
                              {item.posters.map((poster, i) => (
                                <li key={i} className="text-muted small">
                                  {poster.title || 'Untitled'} ({poster.size || 'N/A'}) - ₹{(poster.price || 0).toLocaleString('en-IN')}
                                </li>
                              ))}
                            </ul>
                            <p className="mb-2">
                              ₹{(
                                item.posters.reduce((sum, p) => sum + (p.price || 0), 0) * (item.quantity || 1) * (1 - group.discount / 100)
                              ).toLocaleString('en-IN')}
                              {group.discount > 0 && <span className="text-success ms-1">({group.discount}% off)</span>}
                            </p>
                            <div className="d-flex align-items-center gap-2">
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() =>
                                  handleUpdateQuantity(item.collectionId, '', item.quantity - 1, true)
                                }
                                disabled={item.quantity <= 1}
                                className="d-flex align-items-center justify-content-center"
                                style={{ width: '30px', height: '30px', lineHeight: '1' }}
                                aria-label={`Decrease quantity of collection ${item.collectionId}`}
                              >
                                <i className="bi bi-dash fs-6"></i>
                              </Button>
                              <span className="mx-2">{item.quantity || 1}</span>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() =>
                                  handleUpdateQuantity(item.collectionId, '', item.quantity + 1, true)
                                }
                                className="d-flex align-items-center justify-content-center"
                                style={{ width: '30px', height: '30px', lineHeight: '1' }}
                                aria-label={`Increase quantity of collection ${item.collectionId}`}
                              >
                                <i className="bi bi-plus fs-6"></i>
                              </Button>
                            </div>
                          </div>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleRemoveFromCart(item.collectionId, '', true)}
                            className="ms-3 d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{ width: '30px', height: '30px', lineHeight: '1' }}
                            aria-label={`Remove collection ${item.collectionId} from cart`}
                          >
                            <i className="bi bi-trash fs-6"></i>
                          </Button>
                        </>
                      ) : (
                        <>
                          <Image
                            src={item.image || 'https://via.placeholder.com/60'}
                            alt={item.title || 'Cart item'}
                            style={{ width: '60px', aspectRatio: '4/5', objectFit: 'cover' }}
                            className="me-3 rounded flex-shrink-0"
                            title={item.title || 'Untitled'}
                          />
                          <div
                            className="flex-grow-1"
                            style={{ maxWidth: 'calc(100% - 100px)' }}
                          >
                            <h6
                              className="mb-1 text-truncate"
                              title={item.title || 'Untitled'}
                              style={{ maxWidth: '100%', overflow: 'hidden' }}
                            >
                              {item.title || 'Untitled'} ({item.size || 'N/A'})
                            </h6>
                            {item.seller && <p className="mb-1 text-muted small">By: {item.seller}</p>}
                            <p className="mb-2">
                              ₹{((item.price || 0) * (item.quantity || 1)).toLocaleString('en-IN')}
                              {item.collectionDiscount > 0 && <span className="text-success ms-1">({item.collectionDiscount}% off)</span>}
                            </p>
                            <div className="d-flex align-items-center gap-2">
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() =>
                                  handleUpdateQuantity(item.posterId, item.size, item.quantity - 1)
                                }
                                disabled={item.quantity <= 1}
                                className="d-flex align-items-center justify-content-center"
                                style={{ width: '30px', height: '30px', lineHeight: '1' }}
                                aria-label={`Decrease quantity of ${item.title || 'item'}`}
                              >
                                <i className="bi bi-dash fs-6"></i>
                              </Button>
                              <span className="mx-2">{item.quantity || 1}</span>
                              <Button
                                variant="outline-secondary"
                                size="sm"
                                onClick={() =>
                                  handleUpdateQuantity(item.posterId, item.size, item.quantity + 1)
                                }
                                className="d-flex align-items-center justify-content-center"
                                style={{ width: '30px', height: '30px', lineHeight: '1' }}
                                aria-label={`Increase quantity of ${item.title || 'item'}`}
                              >
                                <i className="bi bi-plus fs-6"></i>
                              </Button>
                            </div>
                          </div>
                          <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={() => handleRemoveFromCart(item.posterId, item.size)}
                            className="ms-3 d-flex align-items-center justify-content-center flex-shrink-0"
                            style={{ width: '30px', height: '30px', lineHeight: '1' }}
                            aria-label={`Remove ${item.title || 'item'} from cart`}
                            title="Remove item"
                          >
                            <i className="bi bi-trash fs-6"></i>
                          </Button>
                        </>
                      )}
                    </ListGroup.Item>
                  ))}
                </React.Fragment>
              ))}
            </ListGroup>
          )}
        </Offcanvas.Body>
        <div className="p-3 border-top">
          <h6 className="fw-semibold mb-3">Total: ₹{totalPrice.toLocaleString('en-IN')}</h6>
          <Button
            onClick={handleGoToCheckout}
            variant="dark"
            className="w-100 d-flex align-items-center justify-content-center"
            disabled={cartItems.length === 0}
            style={{ height: '40px', lineHeight: '1' }}
          >
            <i className="bi bi-cart-check me-2 fs-6"></i> Go to Checkout
          </Button>
        </div>
      </Offcanvas>
    </>
  );
}