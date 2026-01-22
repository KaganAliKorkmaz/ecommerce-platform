import React, { useState, useEffect } from 'react';
import { Container, Table, Button, Badge, Spinner, Alert, Card, Row, Col, Form, Modal } from 'react-bootstrap';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import './OrderProcessing.scss';

const OrderProcessing = () => {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [adminNote, setAdminNote] = useState('');
  const [authError, setAuthError] = useState(false);

  // Fetch all orders for admin
  const fetchOrders = async () => {
    try {
      setLoading(true);
      setError(null);
      setAuthError(false);
      
      let url = `${API_BASE_URL}/orders`;
      if (statusFilter) {
        url = `${API_BASE_URL}/orders?status=${statusFilter}`;
      }
      
      console.log('Fetching orders from:', url);
      console.log('Current user role:', user?.role);
      const response = await axios.get(url);
      setOrders(response.data);
    } catch (err) {
      console.error('Error fetching orders:', err);
      
      if (err.response) {
        if (err.response.status === 403) {
          setAuthError(true);
          setError('You do not have permission to access this feature. Only product managers can access order processing.');
        } else {
          setError(`Failed to load orders: ${err.response.data?.error || 'Server error'}`);
        }
      } else {
        setError('Failed to load orders. Please check your connection and try again.');
      }
    } finally {
      setLoading(false);
    }
  };



  useEffect(() => {
    // Only fetch if user is logged in
    if (user && user.id) {
      fetchOrders();
    }
  }, [statusFilter, user]);

  // Handle status change
  const handleStatusChange = (order) => {
    setCurrentOrder(order);
    setSelectedStatus(order.status || 'processing');
    setAdminNote(order.admin_note || '');
    setShowModal(true);
  };

  // Update order status
  const handleUpdateStatus = async () => {
    try {
      await axios.patch(`${API_BASE_URL}/orders/${currentOrder.id}/status`, {
        status: selectedStatus,
        adminNote: adminNote
      });
      
      // Update the order in the local state
      setOrders(orders.map(order => 
        order.id === currentOrder.id 
          ? { ...order, status: selectedStatus, admin_note: adminNote } 
          : order
      ));
      
      setSuccess('Order status updated successfully');
      setShowModal(false);
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error updating order status:', err);
      
      if (err.response?.status === 403) {
        setError('You do not have permission to update order status. Only product managers can perform this action.');
      } else {
        setError(`Failed to update order status: ${err.response?.data?.error || 'Server error'}`);
      }
      
      // Clear error message after 5 seconds
      setTimeout(() => setError(null), 5000);
    }
  };



  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // Get appropriate badge color for status
  const getStatusBadgeClass = (status) => {
    switch (status) {
      case 'processing':
        return 'primary';
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

  // If user doesn't have product_manager role
  if (user && user.role !== 'product_manager') {
    return (
      <Container className="my-5">
        <Alert variant="danger">
          You don't have permission to access this page. This page is only for product managers.
        </Alert>
      </Container>
    );
  }

  // If no user or still loading authentication
  if (!user) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
        <p className="mt-3">Checking authentication...</p>
      </Container>
    );
  }

  return (
    <Container className="my-5 order-processing-page">
      <h2 className="mb-4">Order Management</h2>
      
      {success && <Alert variant="success">{success}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Card className="mb-4">
        <Card.Header>
          <h5 className="mb-0">Order Processing</h5>
        </Card.Header>
        <Card.Body>
                <Row>
                  <Col md={6}>
                    <Form.Group controlId="statusFilter" className="mb-3">
                      <Form.Label>Filter by Status</Form.Label>
                      <Form.Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                      >
                        <option value="">All Orders</option>
                        <option value="processing">Processing</option>
                        <option value="in-transit">In Transit</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                      </Form.Select>
                    </Form.Group>
                  </Col>
                  <Col md={6} className="d-flex align-items-end">
                    <Button 
                      variant="outline-primary" 
                      onClick={() => fetchOrders()}
                      disabled={loading || authError}
                      className="mb-2"
                    >
                      {loading ? (
                        <>
                          <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                          Loading...
                        </>
                      ) : 'Refresh Orders'}
                    </Button>
                  </Col>
                </Row>
                
                {loading ? (
                  <div className="text-center my-5">
                    <Spinner animation="border" role="status">
                      <span className="visually-hidden">Loading orders...</span>
                    </Spinner>
                  </div>
                ) : authError ? (
                  <Alert variant="danger">
                    <h5>Authentication Error</h5>
                    <p>You do not have permission to access order management. This feature is restricted to product managers only.</p>
                    <p>Please contact your administrator if you believe you should have access.</p>
                  </Alert>
                ) : orders.length === 0 ? (
                  <Alert variant="info">
                    No orders found.
                  </Alert>
                ) : (
                  <Table responsive className="order-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>User</th>
                        <th>Total Amount</th>
                        <th>Items</th>
                        <th>Product IDs</th>
                        <th>Date</th>
                        <th>Delivery Address</th>
                        <th>Status</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {orders.map(order => (
                        <tr key={order.id}>
                          <td>{order.id}</td>
                          <td>{order.user_name || `User #${order.user_id}`}</td>
                          <td>${parseFloat(order.total_amount || 0).toFixed(2)}</td>
                          <td>{order.items?.length || 0} items</td>
                          <td>
                            {order.items?.map(item => (
                              <div key={item.id}>
                                <small>{item.product_id}</small>
                              </div>
                            ))}
                          </td>
                          <td>{formatDate(order.created_at)}</td>
                          <td>
                            <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {order.delivery_address || order.full_address || 'Address not available'}
                              <Button 
                                variant="link" 
                                size="sm" 
                                onClick={() => {
                                  alert(order.delivery_address || order.full_address || 'No address available');
                                }}
                              >
                                View
                              </Button>
                            </div>
                          </td>
                          <td>
                            <Badge bg={getStatusBadgeClass(order.status)}>
                              {order.status || 'Processing'}
                            </Badge>
                          </td>
                          <td>
                            <Button 
                              variant="outline-primary" 
                              size="sm"
                              onClick={() => handleStatusChange(order)}
                            >
                              Update Status
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                )}
        </Card.Body>
      </Card>

      {/* Status Update Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Update Order Status</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group className="mb-3">
              <Form.Label>Order #{currentOrder?.id}</Form.Label>
              <Form.Select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
              >
                <option value="processing">Processing</option>
                <option value="in-transit">In Transit</option>
                <option value="delivered">Delivered</option>
                <option value="cancelled">Cancelled</option>
              </Form.Select>
            </Form.Group>
            
            {currentOrder && (
              <>
                <Card className="mb-3">
                  <Card.Header>Order Details</Card.Header>
                  <Card.Body>
                    <p><strong>Customer:</strong> {currentOrder.user_name || `User #${currentOrder.user_id}`}</p>
                    <p><strong>Total Amount:</strong> ${parseFloat(currentOrder.total_amount || 0).toFixed(2)}</p>
                    <p><strong>Items:</strong> {currentOrder.items?.length || 0}</p>
                    
                    <div className="mb-2">
                      <strong>Product IDs:</strong>
                      <ul className="mb-0 ps-3">
                        {currentOrder.items?.map(item => (
                          <li key={item.id}>
                            {item.product_id} - {item.product_name} (Qty: {item.quantity})
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <strong>Delivery Address:</strong>
                      <p className="mb-0">
                        {currentOrder.delivery_address || currentOrder.full_address || 'No address available'}
                      </p>
                    </div>
                  </Card.Body>
                </Card>
              </>
            )}
            
            <Form.Group className="mb-3">
              <Form.Label>Admin Note</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="Add an admin note (optional)"
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button variant="primary" onClick={handleUpdateStatus}>
            Update Status
          </Button>
        </Modal.Footer>
      </Modal>

    </Container>
  );
};

export default OrderProcessing; 