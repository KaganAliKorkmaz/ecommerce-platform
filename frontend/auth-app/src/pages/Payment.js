import React, { useState, useContext } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert, InputGroup } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import axios from 'axios';
import { useAuth } from '../context/AuthContext';
import './Checkout.scss';

const Payment = () => {
  const { cartItems, getCartTotal, clearCart } = useCart();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [paymentInfo, setPaymentInfo] = useState({
    cardName: '',
    cardNumber: '',
    expirationMonth: '',
    expirationYear: '',
    cvv: '',
    saveCard: false,
    invoiceEmail: user?.email || ''
  });
  
  const [validated, setValidated] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setPaymentInfo(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const formatCardNumber = (value) => {
    // Remove non-numeric characters
    const val = value.replace(/\D/g, '');
    // Add space after every 4 digits
    const formatted = val.replace(/(\d{4})(?=\d)/g, '$1 ');
    return formatted.substring(0, 19); // Limit to 16 digits + 3 spaces
  };

  const handleCardNumberChange = (e) => {
    const formatted = formatCardNumber(e.target.value);
    setPaymentInfo(prevState => ({
      ...prevState,
      cardNumber: formatted
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Kart numarasından boşlukları temizle
      const cleanCardNumber = paymentInfo.cardNumber.replace(/\s/g, '');
      
      // Validate card info
      if (!cleanCardNumber || !paymentInfo.cardName || !paymentInfo.expirationMonth || 
          !paymentInfo.expirationYear || !paymentInfo.cvv) {
        throw new Error('Please fill in all card information');
      }

      if (cleanCardNumber.length !== 16) {
        throw new Error('Card number must be 16 digits');
      }

      if (paymentInfo.cvv.length !== 3) {
        throw new Error('CVV must be 3 digits');
      }

      // Get shipping address from session storage
      const shippingAddressData = sessionStorage.getItem('shippingAddress');
      const shippingAddress = shippingAddressData ? JSON.parse(shippingAddressData) : null;

      if (!shippingAddress) {
        throw new Error('Shipping address not found. Please go back to the shipping step.');
      }

      // Store payment info in sessionStorage for review
      sessionStorage.setItem('paymentInfo', JSON.stringify({
        cardNumber: cleanCardNumber,
        cardName: paymentInfo.cardName,
        expirationMonth: paymentInfo.expirationMonth,
        expirationYear: paymentInfo.expirationYear,
        cvv: paymentInfo.cvv,
        invoiceEmail: paymentInfo.invoiceEmail
      }));
      
      // Navigate to review page
      navigate('/checkout/review');
      
    } catch (err) {
      console.error('Validation Error:', err);
      setError(err.message || 'Please check your card information.');
    } finally {
      setLoading(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 10 }, (_, i) => currentYear + i);

  if (cartItems.length === 0) {
    return (
      <Container className="checkout-page my-5">
        <div className="text-center py-5">
          <h2>Your cart is empty</h2>
          <p className="mb-4">Visit our products page to start shopping.</p>
          <Button variant="primary" onClick={() => navigate('/products')}>
            Go to Products
          </Button>
        </div>
      </Container>
    );
  }

  return (
    <div className="checkout-page">
      {/* Checkout Header */}
      <div className="checkout-header">
        <Container>
          <Row className="align-items-center py-3">
            <Col xs={12} md={6}>
              <h1 className="checkout-logo">
                <Link to="/">TECH<span>STORE</span></Link>
              </h1>
            </Col>
            <Col xs={12} md={6}>
              <div className="checkout-steps">
                <div className="step">
                  <span className="step-number">1</span>
                  <span className="step-name">Sign In</span>
                </div>
                <div className="step-divider"></div>
                <div className="step">
                  <span className="step-number">2</span>
                  <span className="step-name">Shipping</span>
                </div>
                <div className="step-divider"></div>
                <div className="step active">
                  <span className="step-number">3</span>
                  <span className="step-name">Payment</span>
                </div>
                <div className="step-divider"></div>
                <div className="step">
                  <span className="step-number">4</span>
                  <span className="step-name">Review</span>
                </div>
              </div>
            </Col>
          </Row>
        </Container>
      </div>

      {/* Main Checkout Content */}
      <Container className="checkout-container py-4">
        <Row>
          {/* Left Column - Payment Form */}
          <Col lg={8}>
            <Card className="mb-4 checkout-card">
              <Card.Body className="p-4">
                <h2 className="checkout-section-title mb-4">Payment Information</h2>
                
                {error && (
                  <Alert variant="danger" onClose={() => setError('')} dismissible>
                    {error}
                  </Alert>
                )}
                
                <div className="payment-methods mb-4">
                  <div className="d-flex">
                    <div className="payment-method-icon me-2">
                      <i className="bi bi-credit-card"></i>
                    </div>
                    <div className="payment-method-icon me-2">
                      <i className="bi bi-paypal"></i>
                    </div>
                    <div className="payment-method-icon me-2">
                      <i className="bi bi-wallet2"></i>
                    </div>
                  </div>
                </div>
                
                <Form noValidate validated={validated} onSubmit={handleSubmit}>
                  <Form.Group className="mb-3">
                    <Form.Label>Name on Card</Form.Label>
                    <Form.Control
                      type="text"
                      name="cardName"
                      value={paymentInfo.cardName}
                      onChange={handleInputChange}
                      className="checkout-input"
                      placeholder="Enter name as shown on card"
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      Please enter the name on your card.
                    </Form.Control.Feedback>
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Card Number</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="text"
                        name="cardNumber"
                        value={paymentInfo.cardNumber}
                        onChange={handleCardNumberChange}
                        className="checkout-input"
                        placeholder="xxxx xxxx xxxx xxxx"
                        required
                        maxLength="19"
                      />
                      <InputGroup.Text>
                        <i className="bi bi-credit-card"></i>
                      </InputGroup.Text>
                    </InputGroup>
                    <Form.Control.Feedback type="invalid">
                      Please enter a valid card number.
                    </Form.Control.Feedback>
                  </Form.Group>
                  
                  <Row>
                    <Col md={8}>
                      <Form.Label>Expiration Date</Form.Label>
                      <Row>
                        <Col xs={6}>
                          <Form.Group className="mb-3">
                            <Form.Select
                              name="expirationMonth"
                              value={paymentInfo.expirationMonth}
                              onChange={handleInputChange}
                              className="checkout-input"
                              required
                            >
                              <option value="">Month</option>
                              {Array.from({ length: 12 }, (_, i) => i + 1).map(month => (
                                <option key={month} value={month.toString().padStart(2, '0')}>
                                  {month.toString().padStart(2, '0')}
                                </option>
                              ))}
                            </Form.Select>
                            <Form.Control.Feedback type="invalid">
                              Please select a month.
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                        <Col xs={6}>
                          <Form.Group className="mb-3">
                            <Form.Select
                              name="expirationYear"
                              value={paymentInfo.expirationYear}
                              onChange={handleInputChange}
                              className="checkout-input"
                              required
                            >
                              <option value="">Year</option>
                              {years.map(year => (
                                <option key={year} value={year}>
                                  {year}
                                </option>
                              ))}
                            </Form.Select>
                            <Form.Control.Feedback type="invalid">
                              Please select a year.
                            </Form.Control.Feedback>
                          </Form.Group>
                        </Col>
                      </Row>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>CVV</Form.Label>
                        <Form.Control
                          type="password"
                          name="cvv"
                          value={paymentInfo.cvv}
                          onChange={handleInputChange}
                          className="checkout-input"
                          placeholder="***"
                          maxLength="3"
                          required
                        />
                        <Form.Control.Feedback type="invalid">
                          Please enter the CVV code.
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Form.Group className="mb-4">
                    <div className="d-flex align-items-center">
                      <Form.Check
                        type="checkbox"
                        id="saveCard"
                        name="saveCard"
                        checked={paymentInfo.saveCard}
                        onChange={handleInputChange}
                        label="Save card information"
                      />
                    </div>
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Invoice Email</Form.Label>
                    <InputGroup>
                      <Form.Control
                        type="email"
                        name="invoiceEmail"
                        value={paymentInfo.invoiceEmail}
                        onChange={handleInputChange}
                        className="checkout-input"
                        placeholder="Email address for invoice"
                        required
                      />
                      <InputGroup.Text>
                        <i className="bi bi-envelope"></i>
                      </InputGroup.Text>
                    </InputGroup>
                    <Form.Text className="text-muted">
                      Your invoice will be sent to this email address
                    </Form.Text>
                  </Form.Group>
                  
                  <div className="payment-security-info mb-4">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-shield-lock me-2"></i>
                      <small>All your payment information is processed securely. Your card details are not stored.</small>
                    </div>
                  </div>
                  
                  <div className="d-flex justify-content-between mt-4">
                    <Button
                      variant="outline-secondary"
                      onClick={() => navigate('/checkout/shipping')}
                      className="back-button"
                    >
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      className="checkout-button"
                      disabled={loading}
                    >
                      {loading ? 'Processing...' : 'Continue to Review'}
                    </Button>
                  </div>
                </Form>
              </Card.Body>
            </Card>
          </Col>

          {/* Right Column - Order Summary */}
          <Col lg={4}>
            <Card className="checkout-summary-card">
              <Card.Body className="p-4">
                <h3 className="summary-title mb-4">Order Summary</h3>
                
                <div className="summary-items">
                  {cartItems.map(item => (
                    <div key={item.id} className="summary-item">
                      <div className="d-flex mb-3">
                        <div className="item-name">{item.name}</div>
                        <div className="item-price ms-auto">${(item.price * item.quantity).toFixed(2)}</div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <hr className="summary-divider" />
                
                <div className="d-flex justify-content-between mb-2">
                  <span>Subtotal</span>
                  <span>${getCartTotal().toFixed(2)}</span>
                </div>
                
                <div className="d-flex justify-content-between mb-2">
                  <span>Shipping</span>
                  <span>Free</span>
                </div>
                
                <div className="d-flex justify-content-between mb-2">
                  <span>Taxes</span>
                  <span>Calculated at checkout</span>
                </div>
                
                <hr className="summary-divider" />
                
                <div className="d-flex justify-content-between order-total">
                  <strong>Total</strong>
                  <strong>${getCartTotal().toFixed(2)}</strong>
                </div>
                
                <div className="summary-notes mt-4">
                  <p className="mb-2">
                    <i className="bi bi-shield-check"></i> Secure Payment
                  </p>
                  <p className="mb-0">
                    <i className="bi bi-truck"></i> Fast Delivery
                  </p>
                </div>
              </Card.Body>
            </Card>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Payment; 