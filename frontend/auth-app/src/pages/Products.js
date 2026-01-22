import React, { useState, useEffect } from 'react';
import { Container, Card, Row, Col, Button, Badge, Form, Spinner, Dropdown, OverlayTrigger, Tooltip } from 'react-bootstrap';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { FaExclamationTriangle } from 'react-icons/fa';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import './Products.scss';
import '../components/shopping/ProductCard.scss';

// Map of product names to image URLs
const productImages = {
  "iPhone 15 Pro": "https://images.unsplash.com/photo-1710023038502-ba80a70a9f53?q=80&w=764&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "MacBook Pro M2": "https://images.unsplash.com/photo-1675868374786-3edd36dddf04?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "Samsung QLED TV": "https://images.unsplash.com/photo-1567690187548-f07b1d7bf5a9?q=80&w=736&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "Sony WH-1000XM4": "https://images.unsplash.com/photo-1614860243518-c12eb2fdf66c?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "Sony WH-1000XM4 Kulaklık": "https://images.unsplash.com/photo-1614860243518-c12eb2fdf66c?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "PlayStation 5": "https://images.unsplash.com/photo-1607853202273-797f1c22a38e?q=80&w=627&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "Dell XPS 13": "https://images.unsplash.com/photo-1720556405438-d67f0f9ecd44?q=80&w=2030&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "Samsung Galaxy S23": "https://images.unsplash.com/photo-1675452937281-24485562bd84?q=80&w=627&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "LG OLED TV": "https://images.unsplash.com/photo-1717295248230-93ea71f48f92?q=80&w=928&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "Apple AirPods Pro": "https://images.unsplash.com/photo-1606841837239-c5a1a4a07af7?q=80&w=1074&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "Xbox Series X": "https://images.unsplash.com/photo-1621259182978-fbf93132d53d?q=80&w=1032&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "Apple Watch Series 8": "https://images.unsplash.com/photo-1434493789847-2f02dc6ca35d?q=80&w=1171&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
  "Samsung Galaxy Watch 6": "https://images.unsplash.com/photo-1553545204-4f7d339aa06a?q=80&w=1093&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D",
};

const Products = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState(0); // 0 means all categories
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('default'); // 'default', 'price-asc', 'price-desc', 'popularity'
  const [wishlistMap, setWishlistMap] = useState({});
  const [discountedProducts, setDiscountedProducts] = useState({});
  const { addToCart } = useCart();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Function to fetch all products
  const fetchProducts = async () => {
    try {
      setLoading(true);
      const url = sortOption === 'popularity' 
        ? `${API_BASE_URL}/products?sort=popularity`
        : `${API_BASE_URL}/products`;
      console.log('Fetching products with URL:', url);
      console.log('Current sort option:', sortOption);
      const response = await axios.get(url);
      
      // Add image URLs to products
      const productsWithImages = response.data.map(product => {
        // First try to use image_url from database, then fallback to mapping
        const imageUrl = product.image_url || productImages[product.name] || 'https://via.placeholder.com/150';
        return {
          ...product,
          image: imageUrl
        };
      });
      
      setProducts(productsWithImages);
      await fetchDiscounts(productsWithImages);
      setError(null);
    } catch (err) {
      setError('Error fetching products. Please try again later.');
      console.error('Error fetching products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch products by category
  const fetchProductsByCategory = async (categoryId) => {
    try {
      setLoading(true);
      const url = sortOption === 'popularity'
        ? `${API_BASE_URL}/products/category/${categoryId}?sort=popularity`
        : `${API_BASE_URL}/products/category/${categoryId}`;
      const response = await axios.get(url);
      
      // Add image URLs to products
      const productsWithImages = response.data.map(product => {
        // First try to use image_url from database, then fallback to mapping
        const imageUrl = product.image_url || productImages[product.name] || 'https://via.placeholder.com/150';
        return {
          ...product,
          image: imageUrl
        };
      });
      
      setProducts(productsWithImages);
      await fetchDiscounts(productsWithImages);
      setError(null);
    } catch (err) {
      setError('Error fetching products by category. Please try again later.');
      console.error('Error fetching products by category:', err);
    } finally {
      setLoading(false);
    }
  };

  // Function to search products
  const searchProducts = async (query) => {
    if (!query.trim()) {
      fetchProducts();
      return;
    }
    
    try {
      setLoading(true);
      const url = sortOption === 'popularity'
        ? `${API_BASE_URL}/products/search/${query}?sort=popularity`
        : `${API_BASE_URL}/products/search/${query}`;
      const response = await axios.get(url);
      
      // Add image URLs to products
      const productsWithImages = response.data.map(product => {
        // First try to use image_url from database, then fallback to mapping
        const imageUrl = product.image_url || productImages[product.name] || 'https://via.placeholder.com/150';
        return {
          ...product,
          image: imageUrl
        };
      });
      
      setProducts(productsWithImages);
      await fetchDiscounts(productsWithImages);
      setError(null);
    } catch (err) {
      setError('Error searching products. Please try again later.');
      console.error('Error searching products:', err);
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch categories
  const fetchCategories = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/products/categories/all`);
      setCategories(response.data);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  // Sort products based on the selected option
  const sortProducts = (products) => {
    if (sortOption === 'price-asc') {
      return [...products].sort((a, b) => parseFloat(a.price) - parseFloat(b.price));
    } else if (sortOption === 'price-desc') {
      return [...products].sort((a, b) => parseFloat(b.price) - parseFloat(a.price));
    } else if (sortOption === 'popularity') {
      // The products should already be sorted by popularity from the backend
      return products;
    }
    return products; // default: no sorting
  };

  // Fetch wishlist status for all products
  const fetchWishlistStatus = async () => {
    if (!isAuthenticated) return;
    
    try {
      const response = await axios.get(`${API_BASE_URL}/wishlist`);
      const wishlistItems = response.data;
      
      // Create a map of product IDs to wishlist status
      const newWishlistMap = {};
      wishlistItems.forEach(item => {
        newWishlistMap[item.id] = true;
      });
      
      setWishlistMap(newWishlistMap);
    } catch (err) {
      console.error('Error fetching wishlist status:', err);
    }
  };

  // Add item to wishlist
  const addToWishlist = async (productId, event) => {
    event.stopPropagation();
    event.preventDefault();
    
    if (!isAuthenticated) {
      navigate(`/login?returnTo=/products`);
      return;
    }
    
    try {
      await axios.post(`${API_BASE_URL}/wishlist/${productId}`);
      setWishlistMap({...wishlistMap, [productId]: true});
    } catch (err) {
      console.error('Error adding to wishlist:', err);
    }
  };

  // Remove item from wishlist
  const removeFromWishlist = async (productId, event) => {
    event.stopPropagation();
    event.preventDefault();
    
    try {
      await axios.delete(`${API_BASE_URL}/wishlist/${productId}`);
      const newWishlistMap = {...wishlistMap};
      delete newWishlistMap[productId];
      setWishlistMap(newWishlistMap);
    } catch (err) {
      console.error('Error removing from wishlist:', err);
    }
  };

  // Function to fetch discounts for products
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

  useEffect(() => {
    fetchCategories();
    
    // Parse URL parameters on mount and URL change
    const queryParams = new URLSearchParams(location.search);
    const categoryParam = queryParams.get('category');
    const searchParam = queryParams.get('search');
    
    console.log("URL params:", { categoryParam, searchParam });
    
    if (categoryParam) {
      const categoryId = parseInt(categoryParam);
      console.log(`Setting category filter to ID: ${categoryId}`);
      setSelectedCategory(categoryId);
      fetchProductsByCategory(categoryId);
    } else if (searchParam) {
      setSearchQuery(searchParam);
      searchProducts(searchParam);
    } else {
      setSelectedCategory(0);
      fetchProducts();
    }
  }, [location.search]);

  // Fetch wishlist status when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchWishlistStatus();
    }
  }, [isAuthenticated]);

  // Handle category change
  const handleCategoryChange = (e) => {
    const categoryId = parseInt(e.target.value);
    setSelectedCategory(categoryId);
    
    if (categoryId === 0) {
      navigate('/products');
    } else {
      navigate(`/products?category=${categoryId}`);
    }
  };

  // Handle search input
  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
  };

  // Handle search submit
  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) {
      navigate('/products');
      return;
    }
    navigate(`/products?search=${encodeURIComponent(searchQuery)}`);
  };

  // Handle sort change
  const handleSortChange = (option) => {
    // Set the state for UI updates
    setSortOption(option);
    
    // Use the new option value directly instead of relying on state update
    // which is asynchronous and won't be available immediately
    if (selectedCategory > 0) {
      // For category-specific products
      const fetchWithSort = async () => {
        try {
          setLoading(true);
          const url = option === 'popularity'
            ? `${API_BASE_URL}/products/category/${selectedCategory}?sort=popularity`
            : `${API_BASE_URL}/products/category/${selectedCategory}`;
          const response = await axios.get(url);
          
          // Add image URLs to products
          const productsWithImages = response.data.map(product => {
            const imageUrl = product.image_url || productImages[product.name] || 'https://via.placeholder.com/150';
            return {
              ...product,
              image: imageUrl
            };
          });
          
          setProducts(productsWithImages);
          await fetchDiscounts(productsWithImages);
          setError(null);
        } catch (err) {
          setError('Error fetching products by category. Please try again later.');
          console.error('Error fetching products by category:', err);
        } finally {
          setLoading(false);
        }
      };
      
      fetchWithSort();
    } else if (searchQuery) {
      // For search results
      const fetchWithSort = async () => {
        try {
          setLoading(true);
          const url = option === 'popularity'
            ? `${API_BASE_URL}/products/search/${searchQuery}?sort=popularity`
            : `${API_BASE_URL}/products/search/${searchQuery}`;
          const response = await axios.get(url);
          
          // Add image URLs to products
          const productsWithImages = response.data.map(product => {
            const imageUrl = product.image_url || productImages[product.name] || 'https://via.placeholder.com/150';
            return {
              ...product,
              image: imageUrl
            };
          });
          
          setProducts(productsWithImages);
          await fetchDiscounts(productsWithImages);
          setError(null);
        } catch (err) {
          setError('Error searching products. Please try again later.');
          console.error('Error searching products:', err);
        } finally {
          setLoading(false);
        }
      };
      
      fetchWithSort();
    } else {
      // For all products
      const fetchWithSort = async () => {
        try {
          setLoading(true);
          const url = option === 'popularity' 
            ? `${API_BASE_URL}/products?sort=popularity`
            : `${API_BASE_URL}/products`;
          const response = await axios.get(url);
          
          // Add image URLs to products
          const productsWithImages = response.data.map(product => {
            const imageUrl = product.image_url || productImages[product.name] || 'https://via.placeholder.com/150';
            return {
              ...product,
              image: imageUrl
            };
          });
          
          setProducts(productsWithImages);
          await fetchDiscounts(productsWithImages);
          setError(null);
        } catch (err) {
          setError('Error fetching products. Please try again later.');
          console.error('Error fetching products:', err);
        } finally {
          setLoading(false);
        }
      };
      
      fetchWithSort();
    }
  };

  // Navigate to product details
  const handleViewDetails = (productId) => {
    navigate(`/products/${productId}`);
  };

  // Apply sorting to products
  const sortedProducts = sortProducts(products);

  return (
    <Container className="my-4 products-container">
      <h2 className="mb-4 text-center">Our Products</h2>
      
      <Row className="mb-4">
        <Col md={6}>
          <Form onSubmit={handleSearchSubmit}>
            <Form.Group className="d-flex">
              <Form.Control
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={handleSearchChange}
              />
              <Button variant="primary" type="submit" className="ms-2">
                Search
              </Button>
            </Form.Group>
          </Form>
        </Col>
        <Col md={3}>
          <Form.Select 
            value={selectedCategory} 
            onChange={handleCategoryChange}
          >
            <option value={0}>All Categories</option>
            {categories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Form.Select>
        </Col>
        <Col md={3}>
          <Dropdown className="w-100">
            <Dropdown.Toggle variant="outline-secondary" className="w-100">
              {sortOption === 'default' && 'Sort By'}
              {sortOption === 'price-asc' && 'Price: Low to High'}
              {sortOption === 'price-desc' && 'Price: High to Low'}
              {sortOption === 'popularity' && 'Most Popular'}
            </Dropdown.Toggle>
            <Dropdown.Menu className="w-100">
              <Dropdown.Item onClick={() => handleSortChange('default')}>Default</Dropdown.Item>
              <Dropdown.Item onClick={() => handleSortChange('price-asc')}>Price: Low to High</Dropdown.Item>
              <Dropdown.Item onClick={() => handleSortChange('price-desc')}>Price: High to Low</Dropdown.Item>
              <Dropdown.Item onClick={() => handleSortChange('popularity')}>Most Popular</Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Col>
      </Row>

      {loading ? (
        <div className="text-center my-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
        </div>
      ) : error ? (
        <div className="alert alert-danger">{error}</div>
      ) : sortedProducts.length === 0 ? (
        <div className="alert alert-info">No products found.</div>
      ) : (
        <Row xs={1} md={2} lg={3} className="g-4">
          {sortedProducts.map((product) => {
            const discount = discountedProducts[product.id];
            const finalPrice = discount ? discount.discountedPrice : product.price;
            const isDiscounted = discount && discount.hasDiscount;

            return (
              <Col key={product.id}>
                <Card className="h-100 shadow-sm product-card">
                  <div className="product-image-container">
                    <img 
                      src={product.image}
                      alt={product.name}
                      className="product-image"
                    />
                    {isAuthenticated && (
                      <div className="wishlist-icon-container">
                        <OverlayTrigger
                          placement="top"
                          overlay={
                            <Tooltip id={`tooltip-${product.id}`}>
                              {wishlistMap[product.id] ? "Remove from Wishlist" : "Add to Wishlist"}
                            </Tooltip>
                          }
                        >
                          <Button 
                            variant={wishlistMap[product.id] ? "danger" : "outline-danger"} 
                            size="sm" 
                            className="wishlist-button"
                            onClick={(e) => wishlistMap[product.id] 
                              ? removeFromWishlist(product.id, e) 
                              : addToWishlist(product.id, e)}
                            aria-label={wishlistMap[product.id] ? "Remove from Wishlist" : "Add to Wishlist"}
                          >
                            <i className={`bi ${wishlistMap[product.id] ? "bi-heart-fill" : "bi-heart"}`}></i>
                          </Button>
                        </OverlayTrigger>
                      </div>
                    )}
                  </div>
                  <Card.Body>
                    <Card.Title 
                      className="product-title-link"
                      onClick={() => handleViewDetails(product.id)}
                    >
                      {product.name}
                    </Card.Title>
                    <Card.Text className="product-description">{product.description}</Card.Text>
                    <div className="product-details">
                      <div><strong>Model:</strong> {product.model}</div>
                      <div><strong>Warranty:</strong> {product.warranty_months} months</div>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-3">
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
                      {product.stock <= 0 ? (
                        <Badge bg="danger" className="stock-badge">Out of Stock</Badge>
                      ) : product.stock <= 5 ? (
                        <Badge bg="warning" text="dark" className="stock-badge low-stock-badge">
                          <FaExclamationTriangle className="me-1" /> Only {product.stock} left
                        </Badge>
                      ) : (
                        <Badge bg="secondary" className="stock-badge">Stock: {product.stock}</Badge>
                      )}
                    </div>
                    <div className="d-flex gap-2 mt-3">
                      <Button 
                        variant="outline-secondary" 
                        className="flex-grow-1"
                        onClick={() => handleViewDetails(product.id)}
                      >
                        View Details
                      </Button>
                      <Button 
                        variant="outline-primary" 
                        className="flex-grow-1"
                        onClick={() => addToCart({...product, price: finalPrice})}
                        disabled={product.stock <= 0}
                      >
                        {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
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

export default Products;
