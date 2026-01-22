import React, { useState, useEffect } from 'react';
import { Container, Card, Table, Button, Badge, Alert, Spinner, Modal, Form } from 'react-bootstrap';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const SalesRefundPanel = () => {
  const { user } = useAuth();
  const [refundRequests, setRefundRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [currentOrder, setCurrentOrder] = useState(null);
  const [refundAction, setRefundAction] = useState('');
  const [adminNote, setAdminNote] = useState('');

  // Fetch refund requests
  const fetchRefundRequests = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching refund requests');
      // First, get orders with refund-requested status
      const ordersResponse = await axios.get(`${API_BASE_URL}/orders?status=refund-requested`);
      console.log('Fetched refund-requested orders:', ordersResponse.data);
      
      // For each order, find the corresponding refund request
      const ordersWithRefunds = ordersResponse.data;
      const refundsWithDetails = [];
      
      if (ordersWithRefunds && ordersWithRefunds.length > 0) {
        const promises = ordersWithRefunds.map(async (order) => {
          try {
            // Get refund details for this order
            const refundResponse = await axios.get(`${API_BASE_URL}/refunds/order/${order.id}`);
            const refundData = refundResponse.data;
            
            // Combine order and refund data
            return {
              ...order,
              refund_id: refundData.id,
              refund_details: refundData
            };
          } catch (err) {
            console.error(`Error fetching refund for order ${order.id}:`, err);
            return order; // Return just the order if refund details can't be fetched
          }
        });
        
        const results = await Promise.all(promises);
        refundsWithDetails.push(...results);
      }
      
      console.log('Combined refund data:', refundsWithDetails);
      setRefundRequests(refundsWithDetails);
    } catch (err) {
      console.error('Error fetching refund requests:', err);
      setError(`Failed to load refund requests: ${err.response?.data?.error || 'Server error'}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fetch if user is logged in and is a sales manager
    if (user && user.role === 'sales_manager') {
      fetchRefundRequests();
    }
  }, [user]);

  // Handle refund processing - approve or deny
  const handleProcessRefund = (order, action) => {
    console.log('Processing refund for order:', order);
    setCurrentOrder(order);
    setRefundAction(action);
    setAdminNote('');
    setShowModal(true);
  };

  // Submit refund action
  const handleSubmitRefundAction = async () => {
    try {
      console.log('Processing refund action:', refundAction);
      console.log('Current order:', currentOrder);
      console.log('Admin note:', adminNote);
      
      // Get the refund ID from the current order object
      const refundId = currentOrder.refund_id || null;
      
      if (!refundId) {
        throw new Error('Refund ID not found. Cannot process the request.');
      }
      
      console.log('Using refund ID:', refundId);
      
      let response;
      if (refundAction === 'approve') {
        response = await axios.patch(`${API_BASE_URL}/refunds/approve/${refundId}`, {
          adminNote
        });
      } else {
        response = await axios.patch(`${API_BASE_URL}/refunds/reject/${refundId}`, {
          adminNote
        });
      }
      
      console.log('Refund process response:', response.data);
      
      // Update the refund request in the local state
      setRefundRequests(refundRequests.filter(req => req.id !== currentOrder.id));
      
      // Set success message
      setSuccess(`Refund request ${refundAction === 'approve' ? 'approved' : 'denied'} successfully`);
      setShowModal(false);
      
      // Refresh the refund requests list
      fetchRefundRequests();
      
      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      console.error('Error processing refund request:', err);
      
      let errorMessage = 'Failed to process refund request';
      if (err.response) {
        console.error('Error response:', err.response.data);
        errorMessage = err.response.data.error || errorMessage;
      }
      
      setError(`Failed to process refund request: ${errorMessage}`);
      
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

  // If user doesn't have sales_manager role
  if (user && user.role !== 'sales_manager') {
    return (
      <Container className="my-5">
        <Alert variant="danger">
          You don't have permission to access this page. This page is only for sales managers.
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
    <Container className="my-5">
      <h2 className="mb-4">Refund Management</h2>
      
      {success && <Alert variant="success">{success}</Alert>}
      {error && <Alert variant="danger">{error}</Alert>}
      
      <Card>
        <Card.Header className="d-flex justify-content-between align-items-center">
          <h5 className="mb-0">Pending Refund Requests</h5>
          <Button 
            variant="outline-primary" 
            size="sm"
            onClick={() => fetchRefundRequests()}
            disabled={loading}
          >
            {loading ? (
              <>
                <Spinner as="span" animation="border" size="sm" role="status" aria-hidden="true" className="me-2" />
                Loading...
              </>
            ) : 'Refresh'}
          </Button>
        </Card.Header>
        <Card.Body>
          {loading ? (
            <div className="text-center my-5">
              <Spinner animation="border" role="status">
                <span className="visually-hidden">Loading refund requests...</span>
              </Spinner>
            </div>
          ) : refundRequests.length === 0 ? (
            <Alert variant="info">
              No refund requests pending.
            </Alert>
          ) : (
            <Table responsive hover>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Refund ID</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Request Date</th>
                  <th>Reason</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {refundRequests.map(request => (
                  <tr key={request.id}>
                    <td>#{request.id}</td>
                    <td>
                      <Badge bg="secondary">
                        {request.refund_id || 'N/A'}
                      </Badge>
                    </td>
                    <td>{request.user_name || `User #${request.user_id}`}</td>
                    <td>
                      <strong>${parseFloat(request.total_amount || 0).toFixed(2)}</strong>
                    </td>
                    <td>{formatDate(request.created_at)}</td>
                    <td>
                      <div style={{ maxWidth: '300px' }}>
                        {request.refund_reason || 'No reason provided'}
                      </div>
                    </td>
                    <td>
                      <Button 
                        variant="success" 
                        size="sm"
                        className="me-2"
                        onClick={() => handleProcessRefund(request, 'approve')}
                      >
                        Approve
                      </Button>
                      <Button 
                        variant="danger" 
                        size="sm"
                        onClick={() => handleProcessRefund(request, 'deny')}
                      >
                        Deny
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </Card.Body>
      </Card>

      {/* Refund Action Modal */}
      <Modal show={showModal} onHide={() => setShowModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>
            {refundAction === 'approve' ? 'Approve Refund' : 'Deny Refund'}
          </Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Alert variant={refundAction === 'approve' ? 'info' : 'warning'}>
            You are about to {refundAction === 'approve' ? 'APPROVE' : 'DENY'} this refund request.
            {refundAction === 'approve' && ' The customer will be notified and the product stock will be updated.'}
          </Alert>
          
          {currentOrder && (
            <Card className="mb-3">
              <Card.Body>
                <p><strong>Order ID:</strong> #{currentOrder.id}</p>
                <p><strong>Customer:</strong> {currentOrder.user_name || `User #${currentOrder.user_id}`}</p>
                <p><strong>Amount:</strong> ${parseFloat(currentOrder.total_amount || 0).toFixed(2)}</p>
                <p><strong>Reason:</strong> {currentOrder.refund_reason || 'No reason provided'}</p>
              </Card.Body>
            </Card>
          )}
          
          <Form.Group className="mb-3">
            <Form.Label>Admin Note (Optional)</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={adminNote}
              onChange={(e) => setAdminNote(e.target.value)}
              placeholder={refundAction === 'approve' 
                ? 'Add any notes about the approval...' 
                : 'Please provide a reason for denial...'}
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowModal(false)}>
            Cancel
          </Button>
          <Button 
            variant={refundAction === 'approve' ? 'success' : 'danger'}
            onClick={handleSubmitRefundAction}
          >
            {refundAction === 'approve' ? 'Approve Refund' : 'Deny Refund'}
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
};

export default SalesRefundPanel; 