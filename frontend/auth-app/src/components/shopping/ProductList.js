import React, { useState, useEffect } from 'react';
import { Card, Button, Row, Col, Badge, Alert } from 'react-bootstrap';
import axios from 'axios';
import { API_BASE_URL } from '../../config';

const ProductList = ({ onAddToCart }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        const response = await axios.get(`${API_BASE_URL}/products`);
        setProducts(response.data);
        setError(null);
      } catch (err) {
        setError('Error fetching products. Please try again later.');
        console.error('Error fetching products:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  if (loading) {
    return <div className="text-center my-5 p-5 border rounded bg-light"><h3>Loading products...</h3></div>;
  }

  if (error) {
    return <Alert variant="danger">{error}</Alert>;
  }

  if (products.length === 0) {
    return <Alert variant="info">No products available.</Alert>;
  }

  return (
    <div className="product-list">
      <h2 className="mb-4">Available Products</h2>
      <Row xs={1} md={2} lg={2} className="g-4">
        {products.map((product) => (
          <Col key={product.id}>
            <Card className="h-100 shadow-sm">
              <Card.Body>
                <Card.Title className="fs-4 text-primary">{product.name}</Card.Title>
                <Card.Text className="text-muted">{product.description}</Card.Text>
                <hr />
                <div className="product-details mb-3">
                  <div><strong>Model:</strong> {product.model}</div>
                  <div><strong>Warranty:</strong> {product.warranty_months} months</div>
                </div>
                <div className="d-flex justify-content-between align-items-center">
                  <Badge bg="primary" className="fs-6 px-3 py-2">${parseFloat(product.price).toFixed(2)}</Badge>
                  <Badge bg={product.stock > 0 ? "success" : "danger"} className="px-3 py-2">
                    {product.stock > 0 ? `Stock: ${product.stock}` : "Out of Stock"}
                  </Badge>
                </div>
                <Button
                  variant={product.stock > 0 ? "primary" : "secondary"}
                  className="w-100 mt-3"
                  onClick={() => onAddToCart(product)}
                  disabled={product.stock <= 0}
                >
                  {product.stock > 0 ? "Add to Cart" : "Out of Stock"}
                </Button>
              </Card.Body>
            </Card>
          </Col>
        ))}
      </Row>
    </div>
  );
};

export default ProductList; 