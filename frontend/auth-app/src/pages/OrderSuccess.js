import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Container, Card, Button, Spinner } from 'react-bootstrap';
import { FaCheckCircle, FaFileInvoice } from 'react-icons/fa';
import axios from 'axios';
import { getToken } from '../utils/auth';
import { API_BASE_URL } from '../config';

const OrderSuccess = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const orderId = location.state?.orderId;
  const [downloadingInvoice, setDownloadingInvoice] = useState(false);

  useEffect(() => {
    // Debug bilgisi
    console.log('OrderSuccess - Order ID:', orderId);
    console.log('OrderSuccess - Location state:', location.state);
  }, [orderId, location.state]);

  const handleViewOrders = () => {
    console.log('Navigating to orders page');
    navigate('/orders');
  };

  const handleDownloadInvoice = async () => {
    if (!orderId) return;
    
    setDownloadingInvoice(true);
    
    try {
      console.log('Getting token...');
      const token = getToken();
      console.log('Token available:', !!token);

      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Generate the full URL
      const invoiceUrl = `${API_BASE_URL}/invoices/${orderId}`;
      console.log('Invoice URL:', invoiceUrl);
      
      // Open the PDF in a new window/tab - Requires token in header, so direct open won't work for protected route
      // window.open(invoiceUrl, '_blank'); 

      // Use axios request to handle authentication
      const response = await axios({
        url: invoiceUrl,
        method: 'GET',
        responseType: 'blob', // Important for handling binary files
        // Token should be added automatically by interceptor
      });
      
      // Create a URL for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      
      // Create a temporary link element and trigger download
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `invoice-order-${orderId}.pdf`);
      document.body.appendChild(link);
      link.click();
      
      // Clean up
      link.parentNode.removeChild(link);
      window.URL.revokeObjectURL(url);

    } catch (err) {
      console.error('Error accessing invoice:', err);
      alert('Failed to access invoice. Please try again later.');
    } finally {
      setDownloadingInvoice(false);
    }
  };

  return (
    <Container className="py-5">
      <Card className="text-center shadow-sm">
        <Card.Body className="p-5">
          <div className="text-success mb-4">
            <FaCheckCircle size={64} />
          </div>
          
          <h1 className="mb-4">Order Successful!</h1>
          
          <p className="text-muted mb-4">
            Thank you for your purchase. Your order has been successfully placed.
          </p>
          
          <div className="mb-4">
            <h5>Order ID: #{orderId}</h5>
            <p className="text-muted">
              You should receive an email confirmation shortly.
            </p>
          </div>
          
          <div className="d-flex justify-content-center gap-3 flex-wrap">
            <Button
              variant="outline-primary"
              onClick={handleViewOrders}
            >
              View Orders
            </Button>
            <Button
              variant="outline-secondary"
              onClick={handleDownloadInvoice}
              disabled={!orderId || downloadingInvoice}
            >
              {downloadingInvoice ? (
                <>
                  <Spinner 
                    as="span" 
                    animation="border" 
                    size="sm" 
                    role="status" 
                    aria-hidden="true" 
                    className="me-1"
                  />
                  Generating...
                </>
              ) : (
                <>
                  <FaFileInvoice className="me-1" /> Download Invoice
                </>
              )}
            </Button>
            <Button
              variant="primary"
              onClick={() => navigate('/products')}
            >
              Continue Shopping
            </Button>
          </div>
        </Card.Body>
      </Card>
    </Container>
  );
};

export default OrderSuccess; 