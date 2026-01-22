import React, { useState } from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import './Checkout.scss';

const Shipping = () => {
  const { cartItems, getCartTotal } = useCart();
  const navigate = useNavigate();
  
  const [shippingAddress, setShippingAddress] = useState({
    firstName: '',
    lastName: '',
    address: '',
    apartment: '',
    city: '',
    state: '',
    zipCode: '',
    phoneNumber: ''
  });
  
  const [validated, setValidated] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setShippingAddress(prevState => ({
      ...prevState,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const form = e.currentTarget;
    if (form.checkValidity() === false) {
      e.stopPropagation();
      setValidated(true);
      return;
    }
    
    // Format complete address for invoice
    const formattedAddress = `${shippingAddress.firstName} ${shippingAddress.lastName}, ${shippingAddress.address}${shippingAddress.apartment ? ', ' + shippingAddress.apartment : ''}, ${shippingAddress.city}, ${shippingAddress.state} ${shippingAddress.zipCode}`;
    
    // Save shipping address in session storage
    sessionStorage.setItem('shippingAddress', JSON.stringify({
      ...shippingAddress,
      formattedAddress
    }));
    
    // Save shipping address and continue to payment
    console.log('Shipping details:', shippingAddress);
    navigate('/checkout/payment');
  };

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
                <div className="step active">
                  <span className="step-number">2</span>
                  <span className="step-name">Shipping</span>
                </div>
                <div className="step-divider"></div>
                <div className="step">
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
          {/* Left Column - Shipping Form */}
          <Col lg={8}>
            <Card className="mb-4 checkout-card">
              <Card.Body className="p-4">
                <h2 className="checkout-section-title mb-4">Shipping Address</h2>
                
                <Form noValidate validated={validated} onSubmit={handleSubmit}>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>First Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="firstName"
                          value={shippingAddress.firstName}
                          onChange={handleInputChange}
                          className="checkout-input"
                          required
                        />
                        <Form.Control.Feedback type="invalid">
                          Please enter your first name.
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>Last Name</Form.Label>
                        <Form.Control
                          type="text"
                          name="lastName"
                          value={shippingAddress.lastName}
                          onChange={handleInputChange}
                          className="checkout-input"
                          required
                        />
                        <Form.Control.Feedback type="invalid">
                          Please enter your last name.
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Address</Form.Label>
                    <Form.Control
                      type="text"
                      name="address"
                      value={shippingAddress.address}
                      onChange={handleInputChange}
                      className="checkout-input"
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      Please enter your address.
                    </Form.Control.Feedback>
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Apartment, Suite, etc. (Optional)</Form.Label>
                    <Form.Control
                      type="text"
                      name="apartment"
                      value={shippingAddress.apartment}
                      onChange={handleInputChange}
                      className="checkout-input"
                    />
                  </Form.Group>
                  
                  <Row>
                    <Col md={5}>
                      <Form.Group className="mb-3">
                        <Form.Label>City</Form.Label>
                        <Form.Control
                          type="text"
                          name="city"
                          value={shippingAddress.city}
                          onChange={handleInputChange}
                          className="checkout-input"
                          required
                        />
                        <Form.Control.Feedback type="invalid">
                          Please enter your city.
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={4}>
                      <Form.Group className="mb-3">
                        <Form.Label>State</Form.Label>
                        <Form.Select
                          name="state"
                          value={shippingAddress.state}
                          onChange={handleInputChange}
                          className="checkout-input"
                          required
                        >
                          <option value="">Select</option>
                          <option value="New York">New York</option>
                          <option value="California">California</option>
                          <option value="Texas">Texas</option>
                          <option value="Istanbul">Istanbul</option>
                          <option value="Ankara">Ankara</option>
                          {/* Add more options as needed */}
                        </Form.Select>
                        <Form.Control.Feedback type="invalid">
                          Please select a state.
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                    <Col md={3}>
                      <Form.Group className="mb-3">
                        <Form.Label>Zip Code</Form.Label>
                        <Form.Control
                          type="text"
                          name="zipCode"
                          value={shippingAddress.zipCode}
                          onChange={handleInputChange}
                          className="checkout-input"
                          required
                        />
                        <Form.Control.Feedback type="invalid">
                          Please enter your zip code.
                        </Form.Control.Feedback>
                      </Form.Group>
                    </Col>
                  </Row>
                  
                  <Form.Group className="mb-4">
                    <Form.Label>Phone</Form.Label>
                    <Form.Control
                      type="tel"
                      name="phoneNumber"
                      value={shippingAddress.phoneNumber}
                      onChange={handleInputChange}
                      className="checkout-input"
                      required
                    />
                    <Form.Control.Feedback type="invalid">
                      Please enter your phone number.
                    </Form.Control.Feedback>
                  </Form.Group>
                  
                  <div className="d-flex justify-content-between mt-4">
                    <Button
                      variant="outline-secondary"
                      onClick={() => navigate('/checkout')}
                      className="back-button"
                    >
                      Back
                    </Button>
                    <Button
                      variant="primary"
                      type="submit"
                      className="checkout-button"
                    >
                      Continue to Payment
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
            
            <div className="back-to-cart mt-3">
              <Link to="/cart">
                <i className="bi bi-arrow-left"></i> Back to cart
              </Link>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Shipping; 