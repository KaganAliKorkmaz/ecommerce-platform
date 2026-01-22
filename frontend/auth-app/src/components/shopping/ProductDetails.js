import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Badge, Spinner, ListGroup, Tabs, Tab, Alert, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import ProductReviews from '../products/ProductReviews';
import AddReview from '../products/AddReview';
import axios from 'axios';
import { API_BASE_URL } from '../../config';
import './ProductDetails.scss';

const ProductDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshReviews, setRefreshReviews] = useState(0);
  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistLoading, setWishlistLoading] = useState(false);
  const { addToCart } = useCart();
  const { user, isAuthenticated } = useAuth();

  useEffect(() => {
    const fetchProductDetails = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/products/${id}`);
        setProduct(response.data);
        setError(null);
      } catch (err) {
        setError('Error fetching product details. Please try again later.');
        console.error('Error fetching product details:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProductDetails();
  }, [id]);

  // Check if product is in wishlist when authenticated
  useEffect(() => {
    if (isAuthenticated && id) {
      checkWishlistStatus();
    }
  }, [isAuthenticated, id]);

  const checkWishlistStatus = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/wishlist/check/${id}`);
      setInWishlist(response.data.inWishlist);
    } catch (err) {
      console.error('Error checking wishlist status:', err);
    }
  };

  const handleAddToCart = () => {
    addToCart(product);
    // Show some kind of notification or feedback here
  };

  const handleToggleWishlist = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!isAuthenticated) {
      navigate(`/login?returnTo=/products/${id}`);
      return;
    }

    try {
      setWishlistLoading(true);
      if (inWishlist) {
        // Remove from wishlist
        await axios.delete(`${API_BASE_URL}/wishlist/${id}`);
        setInWishlist(false);
      } else {
        // Add to wishlist
        await axios.post(`${API_BASE_URL}/wishlist/${id}`);
        setInWishlist(true);
      }
    } catch (err) {
      console.error('Error updating wishlist:', err);
    } finally {
      setWishlistLoading(false);
    }
  };

  const handleReviewAdded = () => {
    // Trigger a refresh of the reviews
    setRefreshReviews(prev => prev + 1);
  };

  if (loading) {
    return (
      <Container className="my-5 text-center">
        <Spinner animation="border" role="status">
          <span className="visually-hidden">Loading...</span>
        </Spinner>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="my-5">
        <div className="alert alert-danger">{error}</div>
      </Container>
    );
  }

  if (!product) {
    return (
      <Container className="my-5">
        <div className="alert alert-info">Product not found.</div>
      </Container>
    );
  }

  return (
    <Container className="my-5 product-details-container">
      <Button 
        variant="outline-secondary" 
        className="mb-4 back-button"
        onClick={() => navigate('/products')}
      >
        &larr; Back to Products
      </Button>

      <Card className="product-detail-card mb-4">
        <Card.Body>
          <Row>
            <Col md={6} className="product-info">
              <h1 className="product-title">{product.name}</h1>
              
              <div className="product-price-stock">
                <Badge bg="primary" className="price-badge">${product.price}</Badge>
                <Badge bg={product.stock > 0 ? "success" : "danger"} className="stock-badge">
                  {product.stock > 0 ? "In Stock" : "Out of Stock"}
                </Badge>
                {product.stock <= 5 && product.stock > 0 && (
                  <Badge bg="warning" text="dark" className="low-stock-badge">Only {product.stock} left</Badge>
                )}
              </div>
              
              <p className="product-description">{product.description}</p>
              
              <ListGroup variant="flush" className="product-specs">
                <ListGroup.Item>
                  <strong>Model:</strong> {product.model}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Serial Number:</strong> {product.serial_number}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Warranty:</strong> {product.warranty_months} months
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Distributor:</strong> {product.distributor_info}
                </ListGroup.Item>
              </ListGroup>
              
              <div className="product-actions mt-4 d-flex">
                <Button 
                  variant="primary" 
                  size="lg" 
                  className="add-to-cart-btn"
                  onClick={handleAddToCart}
                  disabled={product.stock <= 0}
                >
                  {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
                </Button>
                
                <OverlayTrigger
                  placement="top"
                  overlay={
                    <Tooltip id="wishlist-tooltip">
                      {inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                    </Tooltip>
                  }
                >
                  <Button
                    variant={inWishlist ? "danger" : "outline-danger"}
                    className="wishlist-btn ms-2"
                    onClick={handleToggleWishlist}
                    disabled={wishlistLoading}
                    aria-label={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
                  >
                    <i className={`bi ${inWishlist ? "bi-heart-fill" : "bi-heart"}`}></i>
                  </Button>
                </OverlayTrigger>
              </div>
            </Col>
            
            <Col md={6} className="product-image-section">
              {(() => {
                // First try to use image_url from database
                if (product.image_url) {
                  return (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      style={{ width: '100%', height: '400px', objectFit: 'contain', borderRadius: '8px', background: '#f8f9fa' }}
                    />
                  );
                }
                
                // Fall back to hardcoded mappings
                let imageUrl = '';
                switch (product.name) {
                  case "iPhone 15 Pro":
                    imageUrl = "https://images.unsplash.com/photo-1710023038502-ba80a70a9f53?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
                    break;
                  case "MacBook Pro M2":
                    imageUrl = "https://images.unsplash.com/photo-1675868374786-3edd36dddf04?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
                    break;
                  case "Samsung QLED TV":
                    imageUrl = "https://images.unsplash.com/photo-1567690187548-f07b1d7bf5a9?q=80&w=736&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
                    break;
                  case "Sony WH-1000XM4":
                  case "Sony WH-1000XM4 Kulaklık":
                    imageUrl = "https://images.unsplash.com/photo-1614860243518-c12eb2fdf66c?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
                    break;
                  case "PlayStation 5":
                    imageUrl = "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?q=80&w=627&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
                    break;
                  case "Dell XPS 13":
                    imageUrl = "https://images.unsplash.com/photo-1720556405438-d67f0f9ecd44?q=80&w=2030&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
                    break;
                  case "Samsung Galaxy S23":
                    imageUrl = "https://images.unsplash.com/photo-1675452937281-24485562bd84?q=80&w=627&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
                    break;
                  case "LG OLED TV":
                    imageUrl = "https://images.unsplash.com/photo-1717295248230-93ea71f48f92?q=80&w=928&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
                    break;
                  case "Apple AirPods Pro":
                    imageUrl = "https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
                    break;
                  case "Xbox Series X":
                    imageUrl = "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?q=80&w=1032&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
                    break;
                  case "Apple Watch Series 8":
                    imageUrl = "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
                    break;
                  case "Samsung Galaxy Watch 6":
                    imageUrl = "https://images.unsplash.com/photo-1553545204-4f7d339aa06a?q=80&w=1093&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
                    break;
                  default:
                    imageUrl = '';
                }
                return imageUrl ? (
                  <img
                    src={imageUrl}
                    alt={product.name}
                    style={{ width: '100%', height: '400px', objectFit: 'contain', borderRadius: '8px', background: '#f8f9fa' }}
                  />
                ) : (
                  <div className="product-placeholder-image">
                    <div className="placeholder-text">Product Image</div>
                  </div>
                );
              })()}
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Tabs defaultActiveKey="reviews" id="product-tabs" className="mb-3">
        <Tab eventKey="reviews" title="Reviews">
          <ProductReviews 
            productId={id} 
            key={`reviews-${refreshReviews}`}  
          />
          
          {isAuthenticated ? (
            <AddReview 
              productId={id} 
              onReviewAdded={handleReviewAdded} 
            />
          ) : (
            <Card className="mt-4 mb-4">
              <Card.Body>
                <Alert variant="info">
                  You can view all product reviews without logging in. <Link to={`/login?returnTo=/products/${id}`}>Log in</Link> to leave your own review.
                </Alert>
              </Card.Body>
            </Card>
          )}
        </Tab>
        <Tab eventKey="specifications" title="Specifications">
          <Card>
            <Card.Body>
              <h3>Product Specifications</h3>
              <ListGroup variant="flush">
                <ListGroup.Item>
                  <strong>Model:</strong> {product.model}
                </ListGroup.Item>
                <ListGroup.Item>
                  <strong>Warranty:</strong> {product.warranty_months} months
                </ListGroup.Item>
                {product.serial_number && (
                  <ListGroup.Item>
                    <strong>Serial Number:</strong> {product.serial_number}
                  </ListGroup.Item>
                )}
                {product.distributor_info && (
                  <ListGroup.Item>
                    <strong>Distributor Information:</strong> {product.distributor_info}
                  </ListGroup.Item>
                )}
              </ListGroup>
            </Card.Body>
          </Card>
        </Tab>
      </Tabs>
    </Container>
  );
};

export default ProductDetails; 