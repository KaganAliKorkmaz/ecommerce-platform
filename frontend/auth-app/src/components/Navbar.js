import { useState, useEffect } from 'react';
import { Navbar, Nav, Container, Form, Button, InputGroup, NavDropdown, Badge } from "react-bootstrap";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';
import { API_BASE_URL } from '../config';
import './Navbar.scss';

const NavigationBar = () => {
  const [expanded, setExpanded] = useState(false);
  const [categories, setCategories] = useState([]);
  const { getItemsCount } = useCart();
  const { user, logout, unreadNotificationCount, fetchUnreadNotificationCount } = useAuth();
  const cartCount = getItemsCount();
  const navigate = useNavigate();

  // Fetch categories when component mounts
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const response = await axios.get(`${API_BASE_URL}/products/categories/all`);
        setCategories(response.data);
      } catch (err) {
        console.error('Error fetching categories:', err);
      }
    };

    fetchCategories();
  }, []);

  // Fetch unread notifications when user changes or component mounts
  useEffect(() => {
    // fetchUnreadNotifications logic is now in AuthContext
    // The effect in AuthContext will call fetchUnreadNotificationCount when user changes
  }, [user, fetchUnreadNotificationCount]); // Add fetchUnreadNotificationCount as dependency

  // Handle search submission
  const handleSearch = (e) => {
    e.preventDefault();
    const searchTerm = e.target.elements.search.value;
    if (searchTerm.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchTerm)}`);
      setExpanded(false);
    }
  };

  // Handle logout
  const handleLogout = () => {
    logout();
    navigate('/');
    setExpanded(false);
  };

  // Navigate to category products
  const navigateToCategory = (categoryId, categoryName) => {
    if (!categoryId) {
      navigate('/products');
    } else {
      navigate(`/products?category=${categoryId}`, { state: { categoryName } });
    }
    setExpanded(false);
  };

  const renderUserMenu = () => {
    if (!user) {
      return (
        <Nav.Link as={Link} to="/login" className="nav-link">
          <i className="bi bi-person"></i> Login
        </Nav.Link>
      );
    }

    if (user.role === 'product_manager') {
      return (
        <NavDropdown title={
          <span>
            <i className="bi bi-person-circle"></i> Product Manager
          </span>
        } id="admin-nav-dropdown">
          <NavDropdown.Item as={Link} to="/admin/review-approval">Review Approval</NavDropdown.Item>
          <NavDropdown.Item as={Link} to="/admin/order-processing">Order Processing</NavDropdown.Item>
          <NavDropdown.Item as={Link} to="/admin/product-management">Product Management</NavDropdown.Item>
          <NavDropdown.Divider />
          <NavDropdown.Item as={Link} to="/orders">My Orders</NavDropdown.Item>
          <NavDropdown.Item as={Link} to="/wishlist">My Wishlist</NavDropdown.Item>
          <NavDropdown.Item as={Link} to="/notifications">
            Notifications
            {unreadNotificationCount > 0 && (
              <Badge pill bg="danger" className="ms-1 notification-badge">
                {unreadNotificationCount}
              </Badge>
            )}
          </NavDropdown.Item>
          <NavDropdown.Item as={Link} to="/profile">Profile</NavDropdown.Item>
          <NavDropdown.Divider />
          <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
        </NavDropdown>
      );
    }

    if (user.role === 'sales_manager') {
      return (
        <NavDropdown title={
          <span>
            <i className="bi bi-person-circle"></i> Sales Manager
            {unreadNotificationCount > 0 && (
              <Badge pill bg="danger" className="ms-1 notification-badge">
                {unreadNotificationCount}
              </Badge>
            )}
          </span>
        } id="sales-nav-dropdown">
          <NavDropdown.Item as={Link} to="/product-approval">Price Approval</NavDropdown.Item>
          <NavDropdown.Item as={Link} to="/discount-management">Discount Management</NavDropdown.Item>
          <NavDropdown.Item as={Link} to="/invoice-management">Invoice Management</NavDropdown.Item>
          <NavDropdown.Item as={Link} to="/refund-management">Refund Management</NavDropdown.Item>
          <NavDropdown.Item as={Link} to="/revenue-dashboard">Revenue Dashboard</NavDropdown.Item>
          <NavDropdown.Divider />
          <NavDropdown.Item as={Link} to="/orders">My Orders</NavDropdown.Item>
          <NavDropdown.Item as={Link} to="/wishlist">My Wishlist</NavDropdown.Item>
          <NavDropdown.Item as={Link} to="/notifications">
            Notifications
            {unreadNotificationCount > 0 && (
              <Badge pill bg="danger" className="ms-1 notification-badge">
                {unreadNotificationCount}
              </Badge>
            )}
          </NavDropdown.Item>
          <NavDropdown.Item as={Link} to="/profile">Profile</NavDropdown.Item>
          <NavDropdown.Divider />
          <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
        </NavDropdown>
      );
    }

    // Regular customer menu
    return (
      <NavDropdown title={
        <span>
          <i className="bi bi-person-circle"></i> My Account
          {unreadNotificationCount > 0 && (
            <Badge pill bg="danger" className="ms-1 notification-badge">
              {unreadNotificationCount}
            </Badge>
          )}
        </span>
      } id="user-nav-dropdown">
        <NavDropdown.Item as={Link} to="/orders">My Orders</NavDropdown.Item>
        <NavDropdown.Item as={Link} to="/wishlist">My Wishlist</NavDropdown.Item>
        <NavDropdown.Item as={Link} to="/notifications">
          Notifications
          {unreadNotificationCount > 0 && (
            <Badge pill bg="danger" className="ms-1 notification-badge">
              {unreadNotificationCount}
            </Badge>
          )}
        </NavDropdown.Item>
        <NavDropdown.Item as={Link} to="/profile">Profile</NavDropdown.Item>
        <NavDropdown.Divider />
        <NavDropdown.Item onClick={handleLogout}>Logout</NavDropdown.Item>
      </NavDropdown>
    );
  };

  return (
    <>
      <Navbar bg="primary" variant="dark" expand="lg" className="py-2 navbar-main" expanded={expanded} onToggle={setExpanded}>
        <Container>
          <Navbar.Brand as={Link} to="/" className="brand-logo">
            <strong>TECH</strong>STORE
          </Navbar.Brand>
          
          <Navbar.Toggle aria-controls="basic-navbar-nav" />
          <Navbar.Collapse id="basic-navbar-nav">
            <Form className="d-flex search-form mx-auto" onSubmit={handleSearch}>
              <InputGroup>
                <Form.Control
                  placeholder="What are you looking for?"
                  aria-label="Search"
                  name="search"
                />
                <Button variant="light" type="submit">
                  <i className="bi bi-search"></i>
                </Button>
              </InputGroup>
            </Form>
            
            <Nav className="ms-auto">
              <Nav.Link as={Link} to="/products" className="nav-link">
                <i className="bi bi-grid"></i> Products
              </Nav.Link>
              
              {renderUserMenu()}
              
              <Nav.Link as={Link} to="/cart" className="nav-link cart-link position-relative">
                <div>
                  <i className="bi bi-cart"></i>
                  <span className="ms-1">Cart</span>
                  {cartCount > 0 && (
                    <span className="cart-badge">{cartCount}</span>
                  )}
                </div>
              </Nav.Link>
            </Nav>
          </Navbar.Collapse>
        </Container>
      </Navbar>
      
      {/* Categories Menu */}
      <div className="categories-menu">
        <Container>
          <Nav className="categories-nav">
            {categories.map(category => (
              <Nav.Link
                key={category.id}
                onClick={() => navigateToCategory(category.id, category.name)}
                as="button"
                className="text-button"
              >
                {category.name}
              </Nav.Link>
            ))}
          </Nav>
        </Container>
      </div>
    </>
  );
};

export default NavigationBar;
