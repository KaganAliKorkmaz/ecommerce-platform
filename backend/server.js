require('dotenv').config();

const app = require('./app');

if (!process.env.JWT_SECRET) {
  console.error('ERROR: JWT_SECRET is not set in environment variables');
  process.exit(1);
}

if (!process.env.ENCRYPTION_KEY || !process.env.ENCRYPTION_IV) {
  console.warn('WARNING: ENCRYPTION_KEY and ENCRYPTION_IV should be set in environment variables');
}

const PORT = process.env.PORT || 5001;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
