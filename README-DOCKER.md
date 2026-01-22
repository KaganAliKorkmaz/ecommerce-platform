# TechStore - Dockerized E-Commerce Application

This project has been containerized using Docker to simplify deployment and development. You can run the entire application stack (MySQL, backend API, and React frontend) with a single command.

## Prerequisites

- [Docker](https://www.docker.com/get-started)
- [Docker Compose](https://docs.docker.com/compose/install/)

## Quick Start

1. Clone the repository:
   ```bash
   git clone <repository-url>
   cd CS-308-PROJE
   ```

2. Start the application stack:
   ```bash
   docker-compose up -d
   ```

3. Access the application:
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5001

## Components

The application consists of three main services:

- **MySQL Database** (db): Runs on port 3306
- **Backend API** (backend): Runs on port 5001
- **Frontend** (frontend): Runs on port 3000

## Default Users

The system comes pre-configured with two users:

1. **Product Manager**
   - Email: product@example.com
   - Password: admin123

2. **Sales Manager**
   - Email: sale@example.com
   - Password: sales123

## Stopping the Application

To stop all services:

```bash
docker-compose down
```

To stop and remove all data volumes (this will reset the database):

```bash
docker-compose down -v
```

## Development

### Viewing Logs

```bash
# View logs from all services
docker-compose logs -f

# View logs from a specific service
docker-compose logs -f backend
```

### Making Changes

- **Backend**: Changes to the backend code will require restarting the backend service:
  ```bash
  docker-compose restart backend
  ```

- **Frontend**: Changes to the frontend code will require rebuilding the frontend image:
  ```bash
  docker-compose build frontend
  docker-compose up -d frontend
  ```

## Troubleshooting

- **Database connection issues**: Ensure the backend can connect to the database by checking the logs:
  ```bash
  docker-compose logs db
  docker-compose logs backend
  ```

- **Frontend can't connect to backend**: Verify the API_BASE_URL in the frontend configuration and ensure CORS is properly configured in the backend. 