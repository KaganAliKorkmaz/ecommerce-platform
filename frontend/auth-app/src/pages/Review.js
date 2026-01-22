import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { getToken, getUserData } from '../utils/auth';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const Review = () => {
  const navigate = useNavigate();
  const { cartItems, getCartTotal, clearCart } = useCart();
  const { user, loading: authLoading } = useAuth();
  const [paymentInfo, setPaymentInfo] = useState(null);
  const [shippingAddress, setShippingAddress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Debug logs
    console.log('Auth Loading:', authLoading);
    console.log('User Object:', user);
    
    // Wait for auth to load
    if (authLoading) return;

    // Redirect to login if user is not authenticated
    if (!user || !user.id) {
      console.log('User not found, redirecting to login');
      navigate('/login', { state: { from: '/checkout/review' } });
      return;
    }

    // Get payment info from sessionStorage
    const storedPaymentInfo = sessionStorage.getItem('paymentInfo');
    if (storedPaymentInfo) {
      setPaymentInfo(JSON.parse(storedPaymentInfo));
    }
    
    // Get shipping address from sessionStorage
    const storedShippingAddress = sessionStorage.getItem('shippingAddress');
    if (storedShippingAddress) {
      setShippingAddress(JSON.parse(storedShippingAddress));
    }
  }, [user, authLoading, navigate]);

  const handlePlaceOrder = async () => {
    console.log('Placing order with user:', user);
    console.log('Cart items:', cartItems);

    // Wait for auth to load
    if (authLoading) {
      console.log('Auth still loading...');
      return;
    }

    // Check user authentication
    if (!user || !user.id) {
      console.log('No user found when placing order');
      setError('Please login to place an order');
      navigate('/login', { state: { from: '/checkout/review' } });
      return;
    }

    // Verify token exists
    const token = getToken();
    if (!token) {
      console.log('No token found, redirecting to login');
      setError('Please login to place an order');
      navigate('/login', { state: { from: '/checkout/review' } });
      return;
    }

    setLoading(true);
    setError('');

    try {
      const storedPaymentInfo = JSON.parse(sessionStorage.getItem('paymentInfo'));
      if (!storedPaymentInfo) {
        throw new Error('Payment information not found');
      }

      // Clean card number
      const cleanCardNumber = storedPaymentInfo.cardNumber.replace(/\s/g, '');

      // Get shipping address
      const storedShippingAddress = JSON.parse(sessionStorage.getItem('shippingAddress'));
      if (!storedShippingAddress) {
        throw new Error('Shipping address not found');
      }

      const orderData = {
        cardNumber: cleanCardNumber,
        cardName: storedPaymentInfo.cardName,
        expirationMonth: storedPaymentInfo.expirationMonth,
        expirationYear: storedPaymentInfo.expirationYear,
        cvv: storedPaymentInfo.cvv,
        userId: user.id,
        checkoutEmail: storedPaymentInfo.invoiceEmail,
        shippingAddress: storedShippingAddress.formattedAddress,
        items: cartItems.map(item => ({
          productId: item.id,
          quantity: item.quantity,
          price: item.price
        })),
        totalAmount: getCartTotal()
      };

      console.log('Sending order data:', { 
        ...orderData, 
        cardNumber: '****' + cleanCardNumber.slice(-4)
      });

      // Token will be automatically added by axios interceptor
      const response = await axios.post(`${API_BASE_URL}/payment/process`, orderData);

      console.log('Order response:', response.data);

      if (response.data.success) {
        clearCart();
        sessionStorage.removeItem('paymentInfo');
        navigate('/order-success', { 
          state: { 
            orderId: response.data.orderId 
          }
        });
      } else {
        throw new Error(response.data.error || 'Failed to place order');
      }
    } catch (err) {
      console.error('Order Error:', err);
      if (err.response) {
        console.error('Error response:', err.response.data);
        setError(err.response.data.error || 'Failed to place order. Please try again.');
      } else {
        console.error('Error details:', err);
        setError(err.message || 'Failed to place order. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!paymentInfo) {
    return (
      <Container className="py-5">
        <Alert variant="warning">
          Payment information not found. Please complete the payment step first.
        </Alert>
        <Button onClick={() => navigate('/checkout/payment')}>
          Go to Payment
        </Button>
      </Container>
    );
  }

  return (
    <Container className="py-4">
      <h2 className="mb-4">Review Your Order</h2>

      {error && (
        <Alert variant="danger" onClose={() => setError('')} dismissible>
          {error}
        </Alert>
      )}

      <Row>
        <Col md={8}>
          <Card className="mb-4">
            <Card.Body>
              <h4>Payment Details</h4>
              <p>Card ending in: **** **** **** {paymentInfo.cardNumber.slice(-4)}</p>
              <p>Name on card: {paymentInfo.cardName}</p>
              <p>Expires: {paymentInfo.expirationMonth}/{paymentInfo.expirationYear}</p>
              <p>Invoice email: {paymentInfo.invoiceEmail}</p>
            </Card.Body>
          </Card>
          
          <Card className="mb-4">
            <Card.Body>
              <h4>Shipping Address</h4>
              {shippingAddress && (
                <>
                  <p>{shippingAddress.firstName} {shippingAddress.lastName}</p>
                  <p>{shippingAddress.formattedAddress}</p>
                  <p>Phone: {shippingAddress.phoneNumber}</p>
                </>
              )}
            </Card.Body>
          </Card>

          <Card className="mb-4">
            <Card.Body>
              <h4>Order Items</h4>
              {cartItems.map(item => (
                <div key={item.id} className="d-flex justify-content-between mb-2">
                  <div>
                    {item.name} x {item.quantity}
                  </div>
                  <div>${(item.price * item.quantity).toFixed(2)}</div>
                </div>
              ))}
            </Card.Body>
          </Card>
        </Col>

        <Col md={4}>
          <Card>
            <Card.Body>
              <h4>Order Summary</h4>
              <div className="d-flex justify-content-between mb-2">
                <span>Subtotal:</span>
                <span>${getCartTotal().toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Shipping:</span>
                <span>Free</span>
              </div>
              <div className="d-flex justify-content-between mb-2">
                <span>Tax:</span>
                <span>Calculated at checkout</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between mb-3">
                <strong>Total:</strong>
                <strong>${getCartTotal().toFixed(2)}</strong>
              </div>
              <Button
                variant="primary"
                className="w-100"
                onClick={handlePlaceOrder}
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Place Order'}
              </Button>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Review; 