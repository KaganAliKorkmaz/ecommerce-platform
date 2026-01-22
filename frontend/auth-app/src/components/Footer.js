import { Container, Row, Col } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import './Footer.scss';

const Footer = () => {
  return (
    <footer className="site-footer">
      <Container>
        <Row className="py-4">
          <Col lg={3} md={6} className="mb-4 mb-lg-0">
            <h5>Shop</h5>
            <ul className="footer-links">
              <li><Link to="/products/computers">Computers</Link></li>
              <li><Link to="/products/phones">Phones</Link></li>
              <li><Link to="/products/tv">Televisions</Link></li>
              <li><Link to="/products/audio">Audio Systems</Link></li>
              <li><Link to="/products/gaming">Gaming</Link></li>
            </ul>
          </Col>
          
          <Col lg={3} md={6} className="mb-4 mb-lg-0">
            <h5>Support</h5>
            <ul className="footer-links">
              <li><Link to="/contact">Contact</Link></li>
              <li><Link to="/shipping">Shipping & Delivery</Link></li>
              <li><Link to="/returns">Return Policy</Link></li>
              <li><Link to="/faq">Frequently Asked Questions</Link></li>
            </ul>
          </Col>
          
          <Col lg={3} md={6} className="mb-4 mb-lg-0">
            <h5>About Us</h5>
            <ul className="footer-links">
              <li><Link to="/about">Our Company</Link></li>
              <li><Link to="/stores">Our Stores</Link></li>
              <li><Link to="/careers">Careers</Link></li>
            </ul>
          </Col>
          
          <Col lg={3} md={6}>
            <h5>Contact</h5>
            <div className="contact-info mb-3">
              <i className="bi bi-telephone-fill me-2"></i> 0850 123 45 67
            </div>
            <div className="social-links">
              <a href="https://facebook.com" target="_blank" rel="noopener noreferrer">
                <i className="bi bi-facebook"></i>
              </a>
              <a href="https://twitter.com" target="_blank" rel="noopener noreferrer">
                <i className="bi bi-twitter-x"></i>
              </a>
              <a href="https://instagram.com" target="_blank" rel="noopener noreferrer">
                <i className="bi bi-instagram"></i>
              </a>
              <a href="https://youtube.com" target="_blank" rel="noopener noreferrer">
                <i className="bi bi-youtube"></i>
              </a>
            </div>
          </Col>
        </Row>
        
        <hr />
        
        <div className="footer-bottom py-3 d-flex justify-content-between align-items-center">
          <div>
            <p className="mb-0">&copy; 2023 TechStore. All rights reserved.</p>
          </div>
          <div>
            <Link to="/privacy" className="me-3">Privacy</Link>
            <Link to="/terms">Terms</Link>
          </div>
        </div>
      </Container>
    </footer>
  );
};

export default Footer; 