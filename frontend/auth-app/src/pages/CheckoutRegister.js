import { useState } from "react";
import axios from "axios";
import { Container, Form, Button, Card, Row, Col, Alert } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import "./Checkout.scss";
import { API_BASE_URL } from '../config';

const CheckoutRegister = () => {
  const { cartItems, getCartTotal } = useCart();
  const navigate = useNavigate();
  
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [address, setAddress] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" or "danger"

  const handleRegister = async (e) => {
    e.preventDefault();
    
    // Validate passwords match
    if (password !== confirmPassword) {
      setMessage("Passwords don't match!");
      setMessageType("danger");
      return;
    }
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, {
        name,
        email,
        password,
        address,
      });

      if (response && response.data) {
        setMessage("Registration successful! Redirecting to payment...");
        setMessageType("success");
        
        // Redirect to shipping page after successful registration
        setTimeout(() => {
          navigate('/checkout/shipping');
        }, 1500);
      } else {
        setMessage("An unexpected error occurred!");
        setMessageType("danger");
      }
    } catch (error) {
      console.error("Register Error:", error);

      if (error.response) {
        setMessage("Registration failed: " + error.response.data.error);
        setMessageType("danger");
      } else {
        setMessage("Could not connect to server. Is the backend running?");
        setMessageType("danger");
      }
    }
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
          {/* Left Column - Registration Form */}
          <Col lg={8}>
            <Card className="mb-4 checkout-card">
              <Card.Body className="p-4">
                <h2 className="checkout-section-title mb-4">Create an Account</h2>
                
                {message && (
                  <Alert variant={messageType} className="mb-4">
                    {message}
                  </Alert>
                )}
                
                <Form onSubmit={handleRegister}>
                  <Form.Group className="mb-3">
                    <Form.Label>Name</Form.Label>
                    <Form.Control 
                      type="text" 
                      className="checkout-input" 
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)} 
                      required 
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Email Address</Form.Label>
                    <Form.Control 
                      type="email" 
                      className="checkout-input" 
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Password</Form.Label>
                    <Form.Control 
                      type="password" 
                      className="checkout-input"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                    />
                    <Form.Text className="text-muted">
                      Your password must be at least 8 characters long.
                    </Form.Text>
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Confirm Password</Form.Label>
                    <Form.Control 
                      type="password" 
                      className="checkout-input"
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)} 
                      required 
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <Form.Label>Address</Form.Label>
                    <Form.Control 
                      type="text" 
                      className="checkout-input"
                      placeholder="Your address"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)} 
                      required 
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-4">
                    <Form.Check 
                      type="checkbox" 
                      id="terms" 
                      label={
                        <span>
                          I accept the <Link to="/terms" className="terms-link">Terms of Use</Link> and <Link to="/privacy" className="terms-link">Privacy Policy</Link>
                        </span>
                      } 
                      required
                    />
                  </Form.Group>
                  
                  <div className="d-grid gap-2">
                    <Button 
                      variant="primary" 
                      type="submit" 
                      className="checkout-button"
                    >
                      Register and Continue
                    </Button>
                    
                    <Button 
                      variant="outline-secondary"
                      className="mt-2"
                      onClick={() => navigate('/checkout')}
                    >
                      Go Back
                    </Button>
                  </div>
                </Form>
                
                <div className="text-center mt-4">
                  <p className="mb-0">
                    Already have an account? {" "}
                    <Link to="/checkout" className="checkout-link">
                      Sign In
                    </Link>
                  </p>
                </div>
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

export default CheckoutRegister; 