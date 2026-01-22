import React from 'react';
import { Card, ListGroup, Button, Form, Badge, Image } from 'react-bootstrap';

const ShoppingCart = ({ cartItems, onUpdateQuantity, onRemoveItem, onCheckout, total }) => {
  // Function to handle quantity changes
  const handleQuantityChange = (itemId, newQuantity) => {
    // Allow any value, including zero, which will trigger removal
    onUpdateQuantity(itemId, newQuantity);
  };

  return (
    <div className="shopping-cart">
      <Card>
        <Card.Header>
          <h4 className="mb-0">Shopping Cart</h4>
        </Card.Header>
        <Card.Body>
          {cartItems.length === 0 ? (
            <p className="text-center text-muted">Your cart is empty</p>
          ) : (
            <>
              <ListGroup variant="flush">
                {cartItems.map((item) => (
                  <ListGroup.Item key={item.id} className="d-flex flex-column">
                    <div className="d-flex justify-content-between">
                      <div className="d-flex">
                        <div className="me-3">
                          <Image 
                            src={item.image || 'https://via.placeholder.com/150'} 
                            alt={item.name} 
                            style={{ width: '60px', height: '60px', objectFit: 'contain' }} 
                            thumbnail
                          />
                        </div>
                        <div>
                          <h6 className="my-0">{item.name}</h6>
                          <small className="text-muted">${parseFloat(item.price).toFixed(2)} each</small>
                        </div>
                      </div>
                      <Badge bg="info" pill className="d-flex align-items-center">
                        Qty: {item.quantity}
                      </Badge>
                    </div>
                    <div className="mt-1">
                      <span className="text-muted fw-bold">Subtotal: ${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                    </div>
                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <div className="d-flex align-items-center">
                        <Button 
                          variant="outline-secondary" 
                          size="sm"
                          onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                          // Remove the disabled condition to allow decreasing to zero
                        >
                          -
                        </Button>
                        <Form.Control
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                          className="mx-2 text-center quantity-input"
                          style={{ width: '50px' }}
                        />
                        <Button 
                          variant="outline-secondary" 
                          size="sm"
                          onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                        >
                          +
                        </Button>
                      </div>
                      <Button 
                        variant="outline-danger" 
                        size="sm"
                        onClick={() => onRemoveItem(item.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </ListGroup.Item>
                ))}
              </ListGroup>
              
              <div className="mt-3 d-flex justify-content-between">
                <h5>Total:</h5>
                <h5>${parseFloat(total).toFixed(2)}</h5>
              </div>
              
              <Button 
                variant="primary" 
                className="w-100 mt-3"
                onClick={onCheckout}
                disabled={cartItems.length === 0}
              >
                Proceed to Checkout
              </Button>
            </>
          )}
        </Card.Body>
      </Card>
    </div>
  );
};

export default ShoppingCart; 