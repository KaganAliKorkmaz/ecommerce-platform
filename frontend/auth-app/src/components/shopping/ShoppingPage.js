import React, { useState } from 'react';
import ProductList from './ProductList';
import ShoppingCart from './ShoppingCart';
import { useCart } from '../../context/CartContext';
import { Container, Row, Col, Alert } from 'react-bootstrap';

const ShoppingPage = () => {
  const { cartItems, addToCart, updateCartItemQuantity, removeFromCart, getCartTotal } = useCart();
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [successProduct, setSuccessProduct] = useState(null);

  // Handler for adding products to cart
  const handleAddToCart = (product) => {
    addToCart(product);
    
    // Set the product name for the success message
    setSuccessProduct(product.name);
    
    // Show success message briefly
    setShowSuccessMessage(true);
    setTimeout(() => {
      setShowSuccessMessage(false);
    }, 3000);
  };

  // Handler for updating cart item quantity
  const handleUpdateQuantity = (itemId, newQuantity) => {
    updateCartItemQuantity(itemId, newQuantity);
  };

  // Handler for removing items from cart
  const handleRemoveItem = (itemId) => {
    removeFromCart(itemId);
  };

  // Handler for checkout process
  const handleCheckout = () => {
    // Navigate to checkout page
    window.location.href = '/checkout';
  };

  return (
    <>
      <div className="bg-light py-3 mb-4">
        <Container>
          <h1 className="text-center mb-0">TECHSTORE Shopping</h1>
        </Container>
      </div>
      
      <Container className="my-4">
        {showSuccessMessage && (
          <Alert 
            variant="success" 
            dismissible 
            onClose={() => setShowSuccessMessage(false)}
            className="animate__animated animate__fadeIn"
          >
            <Alert.Heading>Success!</Alert.Heading>
            <p>
              <strong>{successProduct}</strong> has been added to your cart successfully!
            </p>
          </Alert>
        )}

        <Row>
          <Col lg={8} className="mb-4 mb-lg-0">
            <ProductList onAddToCart={handleAddToCart} />
          </Col>
          
          <Col lg={4}>
            <div className="sticky-top" style={{ top: '20px' }}>
              <ShoppingCart
                cartItems={cartItems}
                onUpdateQuantity={handleUpdateQuantity}
                onRemoveItem={handleRemoveItem}
                onCheckout={handleCheckout}
                total={getCartTotal()}
              />
            </div>
          </Col>
        </Row>
      </Container>
    </>
  );
};

export default ShoppingPage; 