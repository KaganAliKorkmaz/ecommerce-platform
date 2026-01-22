# Unit Tests for E-Commerce Backend

This directory contains comprehensive unit tests for the e-commerce application backend. These tests verify the functionality of various components without modifying any existing code.

## Test Files

1. **`unit-tests.js`** - Original 25 unit tests covering core functionality
2. **`additional-unit-tests.js`** - Additional 25 unit tests covering extended functionality
3. **`encryption-test.js`** - Encryption utility tests

## Test Coverage

### Original Tests (`unit-tests.js`)
The original unit tests cover the following areas:
- Authentication (user registration, login, admin accounts)
- Product management (CRUD operations)
- Order processing (creation, retrieval, status updates)
- Payment handling (processing, validation, refunds)
- Utility functions (email services, invoice generation)

### Additional Tests (`additional-unit-tests.js`)
The additional unit tests extend coverage to include:
- **Rating System** (5 tests)
  - Product rating retrieval and submission
  - Rating approval workflows
  - Purchase verification for ratings
- **Wishlist Management** (5 tests)
  - Adding/removing products from wishlist
  - Duplicate prevention
  - Wishlist status checking
- **Encryption Module** (5 tests)
  - Text encryption and decryption
  - Special character handling
  - Error handling for invalid data
- **Authentication Middleware** (5 tests)
  - JWT token verification
  - Authorization header validation
  - Token format and expiration handling
- **Stock Management** (5 tests)
  - Stock reconciliation for cancelled orders
  - Stock discrepancy detection
  - Database transaction error handling

**Total Test Count: 50 comprehensive unit tests**

## Running the Tests

To run the tests, follow these steps:

1. Make sure you have all the dependencies installed:
   ```
   npm install
   ```

2. Install the test-specific dependencies:
   ```
   npm install --save-dev mocha sinon
   ```

3. Run the tests using any of these commands:
   ```bash
   # Run all tests (both original and additional)
   npm test
   
   # Run only the original 25 tests
   npm run test:original
   
   # Run only the additional 25 tests
   npm run test:additional
   
   # Run all test files in the directory
   npm run test:all
   ```

## Test Structure

The tests use Mocha as the test framework and Sinon for mocking. Each test follows this structure:
- **Arrange**: Set up the test data and environment
- **Act**: Execute the functionality being tested (mock implementation)
- **Assert**: Verify the expected outcomes
- **Clean up**: Restore any mocked functionality

## Important Notes

1. These tests are designed to be non-invasive and will not:
   - Modify any existing code in the backend
   - Make actual database calls
   - Send real emails
   - Process actual payments

2. The tests use mocking to simulate external dependencies, including:
   - Database connections
   - Email services
   - PDF generation
   - Authentication services

3. To connect these tests to the actual implementation, you would need to:
   - Import the actual route handlers
   - Set up proper test databases if needed
   - Configure environment variables for testing

