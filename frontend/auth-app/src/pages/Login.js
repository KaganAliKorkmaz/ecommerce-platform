import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Card, Row, Col, Alert } from "react-bootstrap";
import { Link, useNavigate, useLocation } from "react-router-dom";
import "./Auth.scss";
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" or "danger"
  const navigate = useNavigate();
  const location = useLocation();
  const { login, user, isAuthenticated } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Get the return path from location state, default to '/'
  const from = location.state?.from || '/';

  // Check for returnTo parameter in URL query
  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const returnTo = queryParams.get('returnTo');
    if (returnTo) {
      console.log('Return path found in URL:', returnTo);
      // Store it for later redirect after login
      sessionStorage.setItem('returnAfterLogin', returnTo);
    }
  }, [location.search]);

  // Check if user is already logged in
  useEffect(() => {
    if (isAuthenticated && user) {
      // Check for stored return path
      const returnPath = sessionStorage.getItem('returnAfterLogin');
      
      if (returnPath) {
        console.log('Redirecting to stored return path:', returnPath);
        // Clear the stored path
        sessionStorage.removeItem('returnAfterLogin');
        navigate(returnPath);
      } else {
        console.log('User is already logged in, redirecting to:', from);
        // If coming from checkout, redirect to shipping
        if (from.includes('/checkout')) {
          navigate('/checkout/shipping');
        } else {
          navigate(from);
        }
      }
    }
  }, [isAuthenticated, user, navigate, from]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, {
        email,
        password,
      });

      if (response && response.data) {
        // Login işlemini gerçekleştir
        login(response.data);
        
        setMessage("Login successful! Redirecting...");
        setMessageType("success");
        
        // Redirect after successful login
        setTimeout(() => {
          // Check for stored return path
          const returnPath = sessionStorage.getItem('returnAfterLogin');
          
          if (returnPath) {
            console.log('Redirecting to stored return path after login:', returnPath);
            // Clear the stored path
            sessionStorage.removeItem('returnAfterLogin');
            navigate(returnPath);
          } else {
            // If coming from checkout, redirect to shipping
            if (from.includes('/checkout')) {
              navigate('/checkout/shipping');
            } else {
              navigate(from);
            }
          }
        }, 1500);
      } else {
        setMessage("An unexpected error occurred!");
        setMessageType("danger");
      }
    } catch (error) {
      console.error("Login Error:", error);
      
      if (error.response) {
        setError(error.response.data.error || 'Failed to login. Please try again.');
        setMessageType("danger");
      } else {
        setError("Could not connect to server. Is the backend running?");
        setMessageType("danger");
      }
    } finally {
      setLoading(false);
    }
  };

  // If user is authenticated, show loading while redirecting
  if (isAuthenticated && user) {
    return (
      <Container className="py-5 text-center">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-3">Already logged in, redirecting...</p>
      </Container>
    );
  }

  return (
    <div className="login-page">
      {/* Login header */}
      <div className="checkout-header">
        <Container>
          <Row className="align-items-center py-3">
            <Col className="checkout-logo">
              <Link to="/" className="text-white text-decoration-none">
                <h3><strong>TECH</strong>STORE</h3>
              </Link>
            </Col>
          </Row>
        </Container>
      </div>
      
      <Container className="py-5">
        <Row className="justify-content-center">
          <Col md={8} lg={5}>
            <Card className="checkout-card shadow border-0">
              <Card.Header className="bg-white border-0 pt-4 pb-0">
                <h2 className="text-center fw-bold mb-0">Welcome Back</h2>
                <p className="text-center text-muted mt-2">Sign in to your account</p>
              </Card.Header>
              <Card.Body className="p-4 p-md-5 pt-md-4">
                {message && (
                  <Alert variant={messageType} className="mb-4">
                    {message}
                  </Alert>
                )}
                
                {error && (
                  <Alert variant="danger" onClose={() => setError('')} dismissible>
                    {error}
                  </Alert>
                )}
                
                <Form onSubmit={handleLogin}>
                  <Form.Group className="mb-3">
                    <Form.Label>Email Address</Form.Label>
                    <Form.Control 
                      type="email" 
                      className="form-control py-2" 
                      placeholder="email@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)} 
                      required 
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <Form.Label>Password</Form.Label>
                      <Link to="/forgot-password" className="checkout-link small">
                        Forgot Password?
                      </Link>
                    </div>
                    <Form.Control 
                      type="password" 
                      className="form-control py-2"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)} 
                      required 
                    />
                  </Form.Group>
                  
                  <Form.Group className="mb-4">
                    <Form.Check 
                      type="checkbox" 
                      id="remember" 
                      label="Remember me on this device" 
                    />
                  </Form.Group>
                  
                  <div className="d-grid">
                    <Button 
                      variant="primary" 
                      type="submit" 
                      className="py-2 fw-bold"
                      size="lg"
                      disabled={loading}
                    >
                      {loading ? 'Logging in...' : 'Login'}
                    </Button>
                  </div>
                  
                  <div className="text-center mt-4">
                    <p className="mb-0">
                      Don't have an account? {" "}
                      <Link to="/register" className="checkout-link">
                        Create Account
                      </Link>
                    </p>
                  </div>
                </Form>
              </Card.Body>
            </Card>
            
            <div className="text-center mt-4">
              <Link to="/" className="text-decoration-none text-muted">
                <i className="bi bi-arrow-left me-1"></i> Back to Home
              </Link>
            </div>
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default Login;
