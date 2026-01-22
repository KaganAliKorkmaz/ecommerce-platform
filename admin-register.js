const axios = require('axios');

const API_BASE_URL = 'http://localhost:5000/api';

// Admin registration data
const adminData = {
  name: "Admin User",
  email: "admin@example.com",
  password: "adminpassword",
  address: "Admin Address",
  adminKey: "admin-secret-123"
};

// Register admin user
async function registerAdmin() {
  try {
    const response = await axios.post(`${API_BASE_URL}/auth/admin/register`, adminData);
    console.log('Admin registration successful:', response.data);
  } catch (error) {
    console.error('Admin registration failed:', error.response ? error.response.data : error.message);
  }
}

// Execute the function
registerAdmin(); 