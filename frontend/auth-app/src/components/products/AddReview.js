import React, { useState } from 'react';
import { Form, Button, Card, Alert } from 'react-bootstrap';
import { FaStar, FaRegStar } from 'react-icons/fa';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './AddReview.scss';
import { API_BASE_URL } from '../../config';

const AddReview = ({ productId, onReviewAdded }) => {
  const { user } = useAuth();
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [hasPurchased, setHasPurchased] = useState(null);

  // Check if user has purchased this product
  React.useEffect(() => {
    const checkPurchaseStatus = async () => {
      if (!user || !user.id) return;

      try {
        // This is a simplified check - in a real app you'd fetch from your API
        // We'll assume any order can be rated for now, as specified in requirements
        setHasPurchased(true);
      } catch (err) {
        console.error('Error checking purchase status:', err);
        setHasPurchased(false);
      }
    };

    checkPurchaseStatus();
  }, [user, productId]);

  const handleStarClick = (selectedRating) => {
    setRating(selectedRating);
  };

  const handleStarHover = (hoveredRating) => {
    setHoverRating(hoveredRating);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validation
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (!user || !user.id) {
      setError('You must be logged in to submit a review');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await axios.post(`${API_BASE_URL}/ratings/submit`, {
        userId: user.id,
        productId,
        rating,
        comment: comment.trim() || null
      });

      setSuccess(response.data.message);
      
      // Reset form
      setRating(0);
      setComment('');
      
      // Notify parent component that a review was added
      if (onReviewAdded) {
        onReviewAdded();
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      if (err.response && err.response.data) {
        setError(err.response.data.error || 'Failed to submit review');
      } else {
        setError('Failed to submit review. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // If we haven't checked purchase status yet
  if (hasPurchased === null) {
    return null; // or a loading indicator
  }

  // If user hasn't purchased this product
  if (hasPurchased === false) {
    return (
      <Card className="mt-4 mb-4">
        <Card.Body>
          <Alert variant="info">
            You can only rate products you have purchased.
          </Alert>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="mt-4 mb-4 add-review-card">
      <Card.Body>
        <h4 className="mb-3">Write a Review</h4>
        
        {error && <Alert variant="danger">{error}</Alert>}
        {success && <Alert variant="success">{success}</Alert>}
        
        <Form onSubmit={handleSubmit}>
          <div className="rating-selector mb-3">
            <Form.Label>Your Rating</Form.Label>
            <div className="stars-container">
              {[1, 2, 3, 4, 5].map((star) => (
                <span 
                  key={star}
                  onClick={() => handleStarClick(star)}
                  onMouseEnter={() => handleStarHover(star)}
                  onMouseLeave={() => handleStarHover(0)}
                  className="star-wrapper"
                >
                  {star <= (hoverRating || rating) ? (
                    <FaStar className="star filled" />
                  ) : (
                    <FaRegStar className="star" />
                  )}
                </span>
              ))}
            </div>
          </div>
          
          <Form.Group className="mb-3">
            <Form.Label>Your Review (Optional)</Form.Label>
            <Form.Control 
              as="textarea" 
              rows={4}
              placeholder="Share your experience with this product..."
              value={comment}
              onChange={(e) => setComment(e.target.value)}
            />
          </Form.Group>
          
          <Button 
            variant="primary" 
            type="submit"
            disabled={loading}
          >
            {loading ? 'Submitting...' : 'Submit Review'}
          </Button>
        </Form>
      </Card.Body>
    </Card>
  );
};

export default AddReview; 