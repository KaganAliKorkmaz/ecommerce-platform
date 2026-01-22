import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Form, Button, Nav, Alert, Tabs, Tab } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import './Checkout.scss';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const Checkout = () => {
  const { cartItems, getCartTotal } = useCart();
  const { user, isAuthenticated, login } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  // Check if user is already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('User is already logged in, redirecting to shipping');
      navigate('/checkout/shipping');
    }
  }, [isAuthenticated, user, navigate]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setMessage("");
    setMessageType("");
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });
      if (response && response.data) {
        login(response.data);
        setMessage("Login successful! Redirecting to shipping...");
        setMessageType("success");
        setTimeout(() => {
          navigate('/checkout/shipping');
        }, 1500);
      } else {
        setMessage("An unexpected error occurred!");
        setMessageType("danger");
      }
    } catch (error) {
      if (error.response) {
        setMessage(error.response.data.error || 'Failed to login. Please try again.');
        setMessageType("danger");
      } else {
        setMessage("Could not connect to server. Is the backend running?");
        setMessageType("danger");
      }
    }
  };

  const handleCreateAccount = () => {
    navigate('/checkout/register');
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

  // If user is authenticated, we should not see this page (will redirect in useEffect)
  if (isAuthenticated && user) {
    return (
      <Container className="checkout-page my-5">
        <div className="text-center py-5">
          <h2>Redirecting to shipping...</h2>
          <div className="spinner-border mt-3" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
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
                <div className="step active">
                  <span className="step-number">1</span>
                  <span className="step-name">Sign In</span>
                </div>
                <div className="step-divider"></div>
                <div className="step">
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
          {/* Left Column - Authentication */}
          <Col lg={8}>
            <Card className="mb-4 checkout-card shadow">
              <Card.Body className="p-4 p-md-5">
                <h2 className="checkout-section-title mb-4">Sign in</h2>

                {message && (
                  <Alert variant={messageType} className="mb-4">
                    {message}
                  </Alert>
                )}

                <Tabs
                  activeKey={activeTab}
                  onSelect={(k) => setActiveTab(k)}
                  id="checkout-auth-tabs"
                  className="mb-4"
                >
                  <Tab eventKey="signin" title="Sign In">
                    <Form onSubmit={handleSignIn} className="auth-form">
                      <Form.Group className="mb-3">
                        <Form.Label>Email</Form.Label>
                        <Form.Control
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                          className="checkout-input"
                          placeholder="email@example.com"
                        />
                      </Form.Group>
                      
                      <Form.Group className="mb-3">
                        <Form.Label>Password</Form.Label>
                        <Form.Control
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          className="checkout-input"
                          placeholder="••••••••"
                        />
                        <div className="text-end mt-2">
                          <Link to="/forgot-password" className="checkout-link">
                            Forgot Password?
                          </Link>
                        </div>
                      </Form.Group>
                      
                      <Button variant="primary" type="submit" className="checkout-button w-100 mt-4">
                        Sign In & Continue
                      </Button>
                    </Form>
                    
                    <div className="mt-4 text-center">
                      <p>Don't have an account yet?</p>
                      <Button 
                        variant="outline-primary" 
                        className="mt-2"
                        onClick={handleCreateAccount}
                      >
                        Create an Account
                      </Button>
                    </div>
                  </Tab>
                </Tabs>
              </Card.Body>
            </Card>
          </Col>

          {/* Right Column - Order Summary */}
          <Col lg={4}>
            <Card className="checkout-summary-card shadow">
              <Card.Body className="p-4">
                <h3 className="summary-title mb-4">Order Summary</h3>
                
                <div className="summary-items mb-3">
                  {cartItems.map(item => (
                    <div key={item.id} className="d-flex justify-content-between mb-3">
                      <div className="d-flex align-items-center">
                        <div className="summary-item-image me-2 bg-light rounded">
                          <img 
                            src={item.image || "https://via.placeholder.com/40"} 
                            alt={item.name}
                            className="img-fluid"
                            style={{ width: '40px', height: '40px', objectFit: 'contain' }}
                          />
                        </div>
                        <div>
                          <p className="mb-0 summary-item-name">{item.name}</p>
                          <small className="text-muted">Qty: {item.quantity}</small>
                        </div>
                      </div>
                      <p className="mb-0 fw-bold">${(item.price * item.quantity).toFixed(2)}</p>
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
                  <span>Tax</span>
                  <span>${(getCartTotal() * 0.18).toFixed(2)}</span>
                </div>
                
                <hr className="summary-divider" />
                
                <div className="d-flex justify-content-between order-total mb-4">
                  <strong>Total</strong>
                  <strong>${(getCartTotal() * 1.18).toFixed(2)}</strong>
                </div>
                
                <div className="summary-footer">
                  <div className="payment-methods mb-3">
                    <div className="d-flex justify-content-center">
                      <i className="bi bi-credit-card-2-front me-2"></i>
                      <i className="bi bi-paypal me-2"></i>
                      <i className="bi bi-wallet2"></i>
                    </div>
                  </div>
                  
                  <div className="security-badges text-center">
                    <div className="d-flex align-items-center justify-content-center mb-1">
                      <i className="bi bi-shield-lock me-1"></i>
                      <small>Secure Payment</small>
                    </div>
                  </div>
                </div>
              </Card.Body>
            </Card>
            
            <div className="text-center mt-3">
              <Link to="/cart" className="checkout-link">
                <i className="bi bi-arrow-left"></i> Return to cart
              </Link>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Checkout; 