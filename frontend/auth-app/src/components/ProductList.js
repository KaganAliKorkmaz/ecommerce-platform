import React, { useState, useEffect } from 'react';
import { Card, Button, Badge } from 'react-bootstrap';
import axios from '../utils/axios';

const ProductList = ({ products, onAddToCart }) => {
  const [discountedProducts, setDiscountedProducts] = useState({});

  useEffect(() => {
    const fetchDiscounts = async () => {
      const discounts = {};
      for (const product of products) {
        try {
          const response = await axios.get(`/discounts/product/${product.id}`);
          console.log(`Discount data for product ${product.id}:`, response.data);
          if (response.data.hasDiscount) {
            discounts[product.id] = response.data;
          }
        } catch (error) {
          console.error(`Error fetching discount for product ${product.id}:`, error);
        }
      }
      console.log('All discounted products:', discounts);
      setDiscountedProducts(discounts);
    };

    fetchDiscounts();
  }, [products]);

  return (
    <div className="row">
      {products.map(product => {
        const discount = discountedProducts[product.id];
        const finalPrice = discount ? discount.discountedPrice : product.price;
        const isDiscounted = discount && discount.hasDiscount;

        console.log(`Product ${product.id} details:`, {
          originalPrice: product.price,
          hasDiscount: isDiscounted,
          discountInfo: discount,
          finalPrice: finalPrice
        });

        return (
          <div key={product.id} className="col-md-4 mb-4">
            <Card>
              <Card.Img variant="top" src={product.image_url} />
              <Card.Body>
                <Card.Title>{product.name}</Card.Title>
                <Card.Text>
                  {isDiscounted ? (
                    <>
                      <span className="text-decoration-line-through text-muted me-2">
                        ${product.price}
                      </span>
                      <span className="text-danger fw-bold">
                        ${finalPrice.toFixed(2)}
                      </span>
                      <Badge bg="danger" className="ms-2">
                        {discount.discount_type === 'percentage'
                          ? `${discount.discount_value}% OFF`
                          : `$${discount.discount_value} OFF`}
                      </Badge>
                    </>
                  ) : (
                    <span>${product.price}</span>
                  )}
                </Card.Text>
                <Button
                  variant="primary"
                  onClick={() => onAddToCart({ ...product, price: finalPrice })}
                >
                  Add to Cart
                </Button>
              </Card.Body>
            </Card>
          </div>
        );
      })}
    </div>
  );
};

export default ProductList; 