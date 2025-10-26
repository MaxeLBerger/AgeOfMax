# Docker Deployment Guide - Age of Max

## Quick Start

### Build and Run with Docker Compose (Recommended)
```bash
# Build and start the container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop the container
docker-compose down
```

The game will be available at: **http://localhost:8080**

### Build with Docker CLI
```bash
# Build the image
docker build -t age-of-max:latest .

# Run the container
docker run -d -p 8080:80 --name age-of-max-game age-of-max:latest

# View logs
docker logs -f age-of-max-game

# Stop the container
docker stop age-of-max-game
docker rm age-of-max-game
```

## Container Details

### Image Specs
- **Base Image**: nginx:alpine (~50MB)
- **Build Strategy**: Multi-stage build
- **Port**: 80 (mapped to 8080 on host)
- **Health Check**: /health endpoint

### Production Deployment

#### Docker Hub
```bash
docker tag age-of-max:latest your-username/age-of-max:latest
docker push your-username/age-of-max:latest
```

#### Cloud Platforms
- AWS ECS/Fargate
- Google Cloud Run
- Azure Container Instances
- Kubernetes

## Troubleshooting

### Check logs
```bash
docker logs age-of-max-game
```

### Port conflict
Change port in docker-compose.yml from 8080 to another port.

---

**Built with Phaser 3, TypeScript, and Vite**
