import React, { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Button, Alert, Spinner, Badge } from 'react-bootstrap';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import './Wishlist.scss';

const Wishlist = () => {
  const [wishlistItems, setWishlistItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [discountedProducts, setDiscountedProducts] = useState({});
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { addToCart } = useCart();

  useEffect(() => {
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      navigate('/login?returnTo=/wishlist');
      return;
    }

    fetchWishlistItems();
  }, [isAuthenticated, navigate]);

  const fetchDiscounts = async (productsData) => {
    const discounts = {};
    for (const product of productsData) {
      try {
        const response = await axios.get(`${API_BASE_URL}/discounts/product/${product.id}`);
        if (response.data.hasDiscount) {
          discounts[product.id] = response.data;
        }
      } catch (error) {
        console.error(`Error fetching discount for product ${product.id}:`, error);
      }
    }
    setDiscountedProducts(discounts);
  };

  const fetchWishlistItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_BASE_URL}/wishlist`);
      const items = response.data;
      setWishlistItems(items);
      await fetchDiscounts(items);
      setError(null);
    } catch (err) {
      console.error('Error fetching wishlist:', err);
      setError('Failed to load wishlist items. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFromWishlist = async (productId) => {
    try {
      await axios.delete(`${API_BASE_URL}/wishlist/${productId}`);
      // Update the wishlist items
      setWishlistItems(wishlistItems.filter(item => item.id !== productId));
    } catch (err) {
      console.error('Error removing from wishlist:', err);
      setError('Failed to remove item from wishlist. Please try again.');
    }
  };

  const handleAddToCart = (product) => {
    // Get the discount information for the product
    const discount = discountedProducts[product.id];
    const finalPrice = discount ? discount.discountedPrice : product.price;

    // Get the correct image URL for the product - use image_url from database first
    const imageUrl = getProductImage(product);

    // Add image and final price to product before adding to cart
    const productWithImage = {
      ...product,
      image: imageUrl,
      price: finalPrice
    };

    // Add the product with image to cart
    addToCart(productWithImage);
  };

  // Helper function to get product image
  const getProductImage = (product) => {
    // First, try to use image_url from database
    if (product.image_url) {
      return product.image_url;
    }

    // Fall back to hardcoded mapping for legacy products
    switch (product.name) {
      case "iPhone 15 Pro":
      case "iPhone 15 Pro (Product B - Limited Stock)":
        return "https://images.unsplash.com/photo-1710023038502-ba80a70a9f53?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
      case "MacBook Pro M2":
      case "MacBook Pro M2 (Product A - Out of Stock)":
        return "https://images.unsplash.com/photo-1675868374786-3edd36dddf04?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
      case "Samsung QLED TV":
      case "Samsung QLED TV (Product C - In Stock)":
        return "https://images.unsplash.com/photo-1567690187548-f07b1d7bf5a9?q=80&w=736&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
      case "Sony WH-1000XM4":
      case "Sony WH-1000XM4 Kulaklık":
      case "Sony WH-1000XM4 (Product E - Old Order)":
        return "https://images.unsplash.com/photo-1614860243518-c12eb2fdf66c?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
      case "PlayStation 5":
      case "PlayStation 5 (Product F - Recent Order)":
        return "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?q=80&w=627&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
      case "Dell XPS 13":
      case "Dell XPS 13 (Product G - Processing)":
        return "https://images.unsplash.com/photo-1720556405438-d67f0f9ecd44?q=80&w=2030&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
      case "Samsung Galaxy S23":
      case "Samsung Galaxy S23 (Product H - In Transit)":
        return "https://images.unsplash.com/photo-1675452937281-24485562bd84?q=80&w=627&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
      case "LG OLED TV":
        return "https://images.unsplash.com/photo-1717295248230-93ea71f48f92?q=80&w=928&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
      case "Apple AirPods Pro":
        return "https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
      case "Xbox Series X":
        return "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?q=80&w=1032&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
      case "Apple Watch Series 8":
        return "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
      case "Samsung Galaxy Watch 6":
        return "https://images.unsplash.com/photo-1553545204-4f7d339aa06a?q=80&w=1093&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
      case "testdemo":
        return "https://images.unsplash.com/photo-1560472354-b33ff0c44a43?q=80&w=1176&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D";
      default:
        return 'https://via.placeholder.com/150';
    }
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

  return (
    <Container className="wishlist-page py-5">
      <h1 className="mb-4">My Wishlist</h1>
      
      {error && <Alert variant="danger">{error}</Alert>}
      
      {wishlistItems.length === 0 ? (
        <Card className="text-center p-5">
          <Card.Body>
            <i className="bi bi-heart wishlist-empty-icon"></i>
            <h3>Your wishlist is empty</h3>
            <p>Add items to your wishlist to save them for later.</p>
            <Button 
              as={Link} 
              to="/products" 
              variant="primary"
              className="mt-3"
            >
              Browse Products
            </Button>
          </Card.Body>
        </Card>
      ) : (
        <Row xs={1} md={2} lg={3} className="g-4">
          {wishlistItems.map(product => {
            const discount = discountedProducts[product.id];
            const finalPrice = discount ? discount.discountedPrice : product.price;
            const isDiscounted = discount && discount.hasDiscount;

            return (
              <Col key={product.id}>
                <Card className="h-100 wishlist-item">
                  <Card.Body>
                    <div className="wishlist-item-image">
                      {(() => {
                        const imageUrl = getProductImage(product);
                        return imageUrl && imageUrl !== 'https://via.placeholder.com/150' ? (
                          <img
                            src={imageUrl}
                            alt={product.name}
                            className="wishlist-product-image"
                          />
                        ) : (
                          <div className="wishlist-placeholder-image">
                            <span>No image</span>
                          </div>
                        );
                      })()}
                    </div>
                    
                    <Link to={`/products/${product.id}`} className="product-link">
                      <h3 className="product-title">{product.name}</h3>
                    </Link>
                    
                    <div className="product-price">
                      {isDiscounted ? (
                        <div>
                          <span className="text-decoration-line-through text-muted me-2">
                            ${product.price}
                          </span>
                          <Badge bg="danger" className="price-badge">
                            ${finalPrice.toFixed(2)}
                          </Badge>
                          <Badge bg="danger" className="ms-2">
                            {discount.discount_type === 'percentage'
                              ? `${discount.discount_value}% OFF`
                              : `$${discount.discount_value} OFF`}
                          </Badge>
                        </div>
                      ) : (
                        <Badge bg="primary" className="price-badge">
                          ${product.price}
                        </Badge>
                      )}
                    </div>
                    
                    <div className="stock-status">
                      {product.stock > 0 ? (
                        <span className="in-stock">In Stock</span>
                      ) : (
                        <span className="out-of-stock">Out of Stock</span>
                      )}
                    </div>
                    
                    <div className="wishlist-actions">
                      <Button 
                        variant="primary" 
                        className="add-to-cart-btn"
                        onClick={() => handleAddToCart(product)}
                        disabled={product.stock <= 0}
                      >
                        Add to Cart
                      </Button>
                      
                      <Button 
                        variant="outline-danger" 
                        className="remove-btn"
                        onClick={() => handleRemoveFromWishlist(product.id)}
                      >
                        <i className="bi bi-trash"></i>
                      </Button>
                    </div>
                  </Card.Body>
                </Card>
              </Col>
            );
          })}
        </Row>
      )}
    </Container>
  );
};

export default Wishlist; 