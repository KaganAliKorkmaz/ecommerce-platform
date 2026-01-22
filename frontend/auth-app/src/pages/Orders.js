import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Alert, Button, Spinner, Badge, Modal, Form } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { getToken } from '../utils/auth';
import { FaFileInvoice } from 'react-icons/fa';
import { API_BASE_URL } from '../config';

const Orders = () => {
  const { user, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadingInvoice, setDownloadingInvoice] = useState({});
  const navigate = useNavigate();
  const [retryCount, setRetryCount] = useState(0);
  const [cancellingOrder, setCancellingOrder] = useState({});
  const [requestingRefund, setRequestingRefund] = useState({});
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [currentOrderId, setCurrentOrderId] = useState(null);
  const [refundReason, setRefundReason] = useState('');
  const [cancellationReason, setCancellationReason] = useState('');
  const [refundSuccess, setRefundSuccess] = useState(null);
  const [cancelSuccess, setCancelSuccess] = useState(null);

  const fetchOrders = async () => {
    if (!user || !user.id) return;

    setLoading(true);
    setError('');
    console.log('Fetching orders for user ID:', user.id);
    
    try {
      // Token will be automatically added by axios interceptor
      const response = await axios.get(`${API_BASE_URL}/orders/user/${user.id}`);
      console.log('Orders response:', response.data);
      
      // Store the response as array or empty array
      setOrders(Array.isArray(response.data) ? response.data : []);
      setLoading(false);
    } catch (err) {
      console.error('Error fetching orders:', err);
      
      if (err.response) {
        console.error('Error response:', err.response.data);
        console.error('Status code:', err.response.status);
        
        if (err.response.status === 401) {
          setError('Authentication error. Please login again.');
          navigate('/login', { state: { from: '/orders' } });
        } else if (err.response.status === 500) {
          setError(`Server error: ${err.response.data.details || 'Internal server error'}`);
        } else {
          setError(`Error: ${err.response.data.error || 'Failed to load orders'}`);
        }
      } else if (err.request) {
        console.error('Error request:', err.request);
        setError('Could not connect to the server. Please check your connection.');
      } else {
        setError(`Error: ${err.message}`);
      }
      
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;

    if (!user || !user.id) {
      console.log('No user found, redirecting to login');
      setError('Please login to view your orders');
      setLoading(false);
      return;
    }

    // Check if token exists
    const token = getToken();
    if (!token) {
      console.log('No token found, redirecting to login');
      setError('Please login to view your orders');
      navigate('/login', { state: { from: '/orders' } });
      return;
    }

    fetchOrders();
  }, [user, authLoading, retryCount, navigate]);

  const handleGoToProducts = () => {
    navigate('/products');
  };
  
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
  };

  const handleDownloadInvoice = async (orderId) => {
    setDownloadingInvoice(prev => ({ ...prev, [orderId]: true }));
    
    try {
      console.log('Getting token...');
      const token = getToken();
      console.log('Token available:', !!token);

      if (!token) {
        throw new Error('No authentication token found');
      }

      const invoiceUrl = `${API_BASE_URL}/invoices/${orderId}`;
      console.log('Invoice URL:', invoiceUrl);
      
      // Use axios request to handle authentication
      const response = await axios({
        url: invoiceUrl,
        method: 'GET',
        responseType: 'blob', 
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-order-${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error accessing invoice:', err);
      alert('Failed to access invoice. Please try again later.');
    } finally {
      setDownloadingInvoice(prev => ({ ...prev, [orderId]: false }));
    }
  };

  const handleCancelOrder = async () => {
    if (!currentOrderId) return;
    
    setCancellingOrder(prev => ({ ...prev, [currentOrderId]: true }));
    
    try {
      await axios.patch(`${API_BASE_URL}/orders/${currentOrderId}/cancel`);
      
      // Update the order status in the local state
      setOrders(prevOrders => prevOrders.map(order => 
        order.id === currentOrderId 
          ? { ...order, status: 'cancelled' } 
          : order
      ));
      
      setCancelSuccess('Order cancelled successfully.');
      setShowCancelModal(false);
      setCancellationReason('');
    } catch (err) {
      console.error('Error cancelling order:', err);
      alert(err.response?.data?.error || 'Failed to cancel order');
    } finally {
      setCancellingOrder(prev => ({ ...prev, [currentOrderId]: false }));
    }
  };

  const handleRequestRefund = async () => {
    if (!currentOrderId || !refundReason.trim()) return;
    
    setRequestingRefund(prev => ({ ...prev, [currentOrderId]: true }));
    
    try {
      console.log('Sending refund request:', {
        order_id: currentOrderId,
        reason: refundReason
      });
      
      const response = await axios.post(`${API_BASE_URL}/refunds/request`, {
        order_id: currentOrderId,
        reason: refundReason
      });
      
      console.log('Refund request response:', response.data);
      
      // Update the order status in the local state
      setOrders(prevOrders => prevOrders.map(order => 
        order.id === currentOrderId 
          ? { ...order, status: 'refund-requested' } 
          : order
      ));
      
      setRefundSuccess('Refund request submitted successfully.');
      setShowRefundModal(false);
      setRefundReason('');
    } catch (err) {
      console.error('Error requesting refund:', err);
      let errorMessage = 'Failed to request refund';
      
      if (err.response) {
        console.error('Error response:', err.response.data);
        errorMessage = err.response?.data?.error || errorMessage;
      } else if (err.request) {
        console.error('Error request:', err.request);
        errorMessage = 'Could not connect to the server';
      } else {
        errorMessage = err.message || errorMessage;
      }
      
      alert(errorMessage);
    } finally {
      setRequestingRefund(prev => ({ ...prev, [currentOrderId]: false }));
    }
  };

  const openRefundModal = (orderId) => {
    setCurrentOrderId(orderId);
    setRefundReason('');
    setShowRefundModal(true);
  };

  const openCancelModal = (orderId) => {
    setCurrentOrderId(orderId);
    setCancellationReason('');
    setShowCancelModal(true);
  };

  // Deliver edilmiş siparişler için refund request butonu render etme - 
  // BİLEŞEN İÇİNE ALINARAK DEĞİŞKENLERE ERİŞİM SAĞLANDI
  const renderOrderActions = (order) => {
    const isRefundable = order.status === 'delivered';
    const hasRefundRequest = ['refund-requested', 'refund-approved', 'refund-denied'].includes(order.status);
    
    return (
      <div className="mt-3">
        <Button 
          variant="outline-primary" 
          size="sm"
          onClick={() => handleDownloadInvoice(order.id)}
          disabled={downloadingInvoice[order.id]}
          className="mt-2 me-2"
        >
          {downloadingInvoice[order.id] ? (
            <>
              <Spinner 
                as="span" 
                animation="border" 
                size="sm" 
                role="status" 
                aria-hidden="true" 
                className="me-1"
              />
              Downloading...
            </>
          ) : (
            <>
              <FaFileInvoice className="me-1" />
              Download Invoice
            </>
          )}
        </Button>
        
        {order.status === 'processing' && (
          <Button
            variant="outline-danger"
            size="sm"
            onClick={() => openCancelModal(order.id)}
            disabled={cancellingOrder[order.id]}
            className="mt-2"
          >
            {cancellingOrder[order.id] ? (
              <>
                <Spinner 
                  as="span" 
                  animation="border" 
                  size="sm" 
                  role="status" 
                  aria-hidden="true" 
                  className="me-1"
                />
                Cancelling...
              </>
            ) : (
              'Cancel Order'
            )}
          </Button>
        )}
        
        {isRefundable && !hasRefundRequest && (
          <Button
            variant="outline-warning"
            size="sm"
            onClick={() => openRefundModal(order.id)}
            disabled={requestingRefund[order.id]}
            className="mt-2"
          >
            {requestingRefund[order.id] ? (
              <>
                <Spinner 
                  as="span" 
                  animation="border" 
                  size="sm" 
                  role="status" 
                  aria-hidden="true" 
                  className="me-1"
                />
                Processing...
              </>
            ) : (
              'Request Refund'
            )}
          </Button>
        )}
      </div>
    );
  };

  if (authLoading) {
    return (
      <Container className="py-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  if (!user) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          Please login to view your orders.
        </Alert>
        <Link to="/login" className="me-2">
          <Button variant="primary">Go to Login</Button>
        </Link>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <h2 className="mb-4">My Orders</h2>
      
      {refundSuccess && (
        <Alert variant="success" onClose={() => setRefundSuccess(null)} dismissible>
          {refundSuccess}
        </Alert>
      )}
      
      {cancelSuccess && (
        <Alert variant="success" onClose={() => setCancelSuccess(null)} dismissible>
          {cancelSuccess}
        </Alert>
      )}
      
      {loading ? (
        <div className="text-center">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-2">Loading your orders...</p>
        </div>
      ) : error ? (
        <div>
          <Alert variant="danger">{error}</Alert>
          <div className="d-flex justify-content-center mt-3">
            <Button variant="primary" onClick={handleRetry} className="me-2">
              Try Again
            </Button>
            <Button variant="outline-primary" onClick={handleGoToProducts}>
              Browse Products
            </Button>
          </div>
        </div>
      ) : orders.length === 0 ? (
        <div>
          <Alert variant="info">
            You don't have any orders yet.
          </Alert>
          <div className="text-center mt-3">
            <Button variant="primary" onClick={handleGoToProducts}>
              Continue Shopping
            </Button>
          </div>
        </div>
      ) : (
        <div>
          <Row>
            {orders.map(order => (
              <Col md={12} key={order.id} className="mb-4">
                <Card className="shadow-sm">
                  <Card.Header className="d-flex justify-content-between align-items-center bg-light">
                    <div>
                      <strong>Order #{order.id}</strong>
                      <span className="ms-3 text-muted">
                        {new Date(order.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <Badge bg={getStatusBadgeClass(order.status)}>
                      {formatOrderStatus(order.status) || 'Processing'}
                    </Badge>
                  </Card.Header>
                  <Card.Body>
                    <Row>
                      <Col md={8}>
                        <h6 className="mb-3">Order Items</h6>
                        {order.items && order.items.length > 0 ? (
                          order.items.map(item => (
                            <div key={item.id} className="d-flex justify-content-between mb-2 border-bottom pb-2">
                              <div>
                                <span className="fw-medium">{item.product_name || 'Product'}</span>
                                <span className="text-muted ms-2">× {item.quantity}</span>
                              </div>
                              <span>${((item.price || 0) * item.quantity).toFixed(2)}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-muted">No items found for this order.</p>
                        )}
                      </Col>
                      <Col md={4}>
                        <div className="text-end">
                          <h6 className="mb-3">Order Summary</h6>
                          <div className="d-flex justify-content-between mb-2">
                            <span>Total Amount:</span>
                            <span className="fw-bold">${parseFloat(order.total_amount || 0).toFixed(2)}</span>
                          </div>
                          <div className="mt-4">
                            <h6 className="mb-2">Shipping Address:</h6>
                            <p className="text-muted mb-0">{order.delivery_address || 'Not specified'}</p>
                          </div>
                          {order.status === 'delivered' && order.delivered_at && (
                            <p className="text-muted mb-1">
                              <small>Delivered on: {formatDate(order.delivered_at)}</small>
                            </p>
                          )}
                          {renderOrderActions(order)}
                        </div>
                      </Col>
                    </Row>
                  </Card.Body>
                </Card>
              </Col>
            ))}
          </Row>
          
          <div className="mt-4 text-center">
            <Button variant="primary" onClick={handleGoToProducts}>
              Continue Shopping
            </Button>
          </div>
        </div>
      )}
      
      {/* Refund Request Modal */}
      <Modal show={showRefundModal} onHide={() => setShowRefundModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Request Refund</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Reason for Refund</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Please explain why you are requesting a refund"
                required
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowRefundModal(false)}>
            Cancel
          </Button>
          <Button 
            variant="primary" 
            onClick={handleRequestRefund}
            disabled={!refundReason.trim()}
          >
            Submit Request
          </Button>
        </Modal.Footer>
      </Modal>
      
      {/* Order Cancellation Modal */}
      <Modal show={showCancelModal} onHide={() => setShowCancelModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Cancel Order</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Reason for Cancellation</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="Please explain why you are cancelling this order"
              />
              <Form.Text className="text-muted">
                Providing a reason is optional but helps us improve our service.
              </Form.Text>
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowCancelModal(false)}>
            Back
          </Button>
          <Button 
            variant="danger" 
            onClick={handleCancelOrder}
          >
            Confirm Cancellation
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

// Helper function to get appropriate badge class based on status
const getStatusBadgeClass = (status) => {
  switch (status?.toLowerCase()) {
    case 'processing':
      return 'warning';
    case 'in-transit':
      return 'info';
    case 'delivered':
      return 'success';
    case 'cancelled':
      return 'danger';
    case 'refund-requested':
      return 'warning';
    case 'refund-approved':
      return 'success';
    case 'refund-denied':
      return 'danger';
    default:
      return 'secondary';
  }
};

// Helper function to format order status for display
const formatOrderStatus = (status) => {
  switch (status) {
    case 'processing':
      return 'Processing';
    case 'in-transit':
      return 'In Transit';
    case 'delivered':
      return 'Delivered';
    case 'cancelled':
      return 'Cancelled';
    case 'refund-requested':
      return 'Refund Requested';
    case 'refund-approved':
      return 'Refund Approved';
    case 'refund-denied':
      return 'Refund Denied';
    default:
      return status;
  }
};

// Add this function to format dates
const formatDate = (dateString) => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
};

export default Orders; 