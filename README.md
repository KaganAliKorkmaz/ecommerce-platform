# E-Commerce Platform

A full-stack e-commerce platform built with modern web technologies, providing secure authentication, product and order management, payment processing, and role-based administration.

## Overview

This project is a production-oriented e-commerce system designed to demonstrate real-world full-stack development practices.  
It supports complete shopping workflows, administrative operations, and security mechanisms commonly used in commercial applications.

## Features

Customer functionality:
- User registration and authentication using JWT
- Product browsing with search and category filtering
- Shopping cart and wishlist management
- Order placement, tracking, and order history
- Product reviews and ratings
- Automatic invoice generation
- Refund request handling

Admin functionality:
- Product and inventory management
- Order status management
- Review moderation
- Discount and pricing management
- Refund approval workflow
- Sales and revenue monitoring
- User account management

Security:
- Password hashing with bcrypt
- Token-based authentication with JWT
- Encryption of sensitive user data
- API rate limiting and input validation
- Secure CORS configuration

## Technology Stack

Backend:
- Node.js with Express.js
- MySQL
- JWT authentication
- Bcrypt for password hashing
- PDF generation for invoices
- Email services for notifications

Frontend:
- React with React Router
- Axios for API communication
- Bootstrap-based responsive UI
- Chart-based data visualization

Infrastructure:
- Docker and Docker Compose
- Kubernetes deployment configuration
- Nginx for frontend serving

## Architecture Highlights

- RESTful API design
- Role-based access control
- Modular and scalable project structure
- Separation of concerns between frontend and backend
- Containerized deployment support

## Deployment

The application can be run locally using Node.js or deployed using Docker Compose.  
Kubernetes configuration files are included for scalable deployment scenarios.

## Project Type

Personal full-stack project focused on building a secure, scalable, and production-ready e-commerce system.

## License

ISC
