import React from 'react';
import { Container, Row, Col, ListGroup, Button, Card } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { FaTrash, FaPlus, FaMinus } from 'react-icons/fa';

const Cart = () => {
  const { cartItems, removeFromCart, updateQuantity, getCartTotal } = useCart();

  if (cartItems.length === 0) {
    return (
      <Container className="py-5 text-center">
        <h2>Your cart is empty</h2>
        <p>You have no items in your shopping cart.</p>
        <Link to="/products" className="btn btn-primary">
          Continue Shopping
        </Link>
      </Container>
    );
  }

  return (
    <Container className="py-5">
      <h2 className="mb-4">Shopping Cart</h2>
      <Row>
        <Col md={9}>
          <ListGroup variant="flush">
            {cartItems.map((item) => (
              <ListGroup.Item key={item.id} className="py-3">
                <Row className="align-items-center">
                  <Col md={2}>
                    <img 
                      src={item.image || 'https://via.placeholder.com/150'} 
                      alt={item.name} 
                      className="img-fluid rounded"
                    />
                  </Col>
                  <Col md={3}>
                    <h5>{item.name}</h5>
                    <p className="text-muted mb-0">${parseFloat(item.price).toFixed(2)}</p>
                  </Col>
                  <Col md={3} className="d-flex align-items-center">
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    >
                      <FaMinus />
                    </Button>
                    <span className="mx-2">{item.quantity}</span>
                    <Button 
                      variant="outline-secondary" 
                      size="sm"
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    >
                      <FaPlus />
                    </Button>
                  </Col>
                  <Col md={2} className="text-end">
                    <h6>${(parseFloat(item.price) * item.quantity).toFixed(2)}</h6>
                  </Col>
                  <Col md={2} className="text-end">
                    <Button 
                      variant="outline-danger" 
                      size="sm"
                      onClick={() => removeFromCart(item.id)}
                    >
                      <FaTrash />
                    </Button>
                  </Col>
                </Row>
              </ListGroup.Item>
            ))}
          </ListGroup>
        </Col>
        <Col md={3}>
          <Card>
            <Card.Body>
              <h4 className="mb-3">Order Summary</h4>
              <div className="d-flex justify-content-between mb-3">
                <span>Subtotal</span>
                <span>${parseFloat(getCartTotal()).toFixed(2)}</span>
              </div>
              <div className="d-flex justify-content-between mb-3">
                <span>Shipping</span>
                <span>Free</span>
              </div>
              <hr />
              <div className="d-flex justify-content-between mb-3">
                <strong>Total</strong>
                <strong>${parseFloat(getCartTotal()).toFixed(2)}</strong>
              </div>
              <Link to="/checkout" className="btn btn-primary w-100">
                Proceed to Checkout
              </Link>
              <Link to="/products" className="btn btn-outline-secondary w-100 mt-2">
                Continue Shopping
              </Link>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default Cart; 