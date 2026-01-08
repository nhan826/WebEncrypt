# Deployment Guide for WebEncrypt

## Production Deployment Options

### Option 1: Vercel (Frontend) + Custom Server (Backend)

#### Frontend on Vercel

1. **Install Vercel CLI:**
   ```bash
   npm install -g vercel
   ```

2. **Deploy:**
   ```bash
   vercel
   ```

3. **Set Environment Variables in Vercel Dashboard:**
   - `API_URL` = Your backend server URL

#### Backend on VPS/Cloud Server

1. **Prepare Server** (Ubuntu/Debian):
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 18+
   curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
   sudo apt install -y nodejs
   
   # Install build tools
   sudo apt install -y build-essential python3
   ```

2. **Deploy Backend:**
   ```bash
   # Clone/upload your code
   cd /var/www/webencrypt-backend
   
   # Install dependencies
   npm install
   
   # Build C++ module
   cd backend
   npm install node-addon-api
   node-gyp configure
   node-gyp build
   cd ..
   
   # Set environment variables
   nano .env  # Edit with production values
   ```

3. **Set Up PM2 (Process Manager):**
   ```bash
   npm install -g pm2
   
   # Start backend
   pm2 start backend/server.js --name webencrypt-api
   
   # Auto-restart on reboot
   pm2 startup
   pm2 save
   ```

4. **Configure Nginx Reverse Proxy:**
   ```nginx
   server {
       listen 80;
       server_name api.yourdomain.com;
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

5. **Enable HTTPS with Let's Encrypt:**
   ```bash
   sudo apt install certbot python3-certbot-nginx
   sudo certbot --nginx -d api.yourdomain.com
   ```

---

### Option 2: All-in-One on VPS

Deploy both frontend and backend on the same server:

```bash
# Build Next.js for production
npm run build

# Use PM2 to manage both processes
pm2 start npm --name "webencrypt-frontend" -- start
pm2 start backend/server.js --name "webencrypt-backend"
```

**Nginx configuration:**
```nginx
# Frontend
server {
    listen 80;
    server_name yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Backend API
server {
    listen 80;
    server_name api.yourdomain.com;
    
    location / {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

---

### Option 3: Docker Deployment

**Dockerfile (Backend):**
```dockerfile
FROM node:18-alpine

# Install build tools
RUN apk add --no-cache python3 make g++

WORKDIR /app

# Copy backend files
COPY backend ./backend
COPY package*.json ./

# Install dependencies
RUN npm install

# Build C++ addon
WORKDIR /app/backend
RUN npm install node-addon-api
RUN npx node-gyp configure
RUN npx node-gyp build

WORKDIR /app

EXPOSE 3001

CMD ["node", "backend/server.js"]
```

**docker-compose.yml:**
```yaml
version: '3.8'

services:
  backend:
    build: .
    ports:
      - "3001:3001"
    environment:
      - NODE_ENV=production
      - JWT_SECRET=${JWT_SECRET}
      - APP_PASSWORD=${APP_PASSWORD}
    volumes:
      - ./backend/uploads:/app/backend/uploads
    restart: unless-stopped

  frontend:
    image: node:18-alpine
    working_dir: /app
    volumes:
      - .:/app
    ports:
      - "3000:3000"
    command: sh -c "npm install && npm run build && npm start"
    environment:
      - NODE_ENV=production
      - API_URL=http://backend:3001
    depends_on:
      - backend
    restart: unless-stopped
```

**Deploy with Docker:**
```bash
docker-compose up -d
```

---

## Production Environment Variables

Create `.env` file with:

```env
# Server
NODE_ENV=production
PORT=3001
API_URL=https://api.yourdomain.com

# Security (CHANGE THESE!)
JWT_SECRET=your-strong-random-secret-key-here
APP_PASSWORD=your-secure-app-password

# Frontend (if separate)
FRONTEND_URL=https://yourdomain.com

# Rate Limiting
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=100
```

**Generate secure secrets:**
```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Security Checklist

- [ ] Change default passwords and JWT secrets
- [ ] Enable HTTPS/SSL certificates
- [ ] Configure firewall (UFW/iptables)
- [ ] Set up regular backups
- [ ] Enable rate limiting
- [ ] Configure CORS properly
- [ ] Keep dependencies updated
- [ ] Monitor logs and errors
- [ ] Set up monitoring (PM2, Datadog, etc.)
- [ ] Implement log rotation

---

## Performance Optimization

1. **Enable gzip compression:**
   ```javascript
   const compression = require('compression');
   app.use(compression());
   ```

2. **Use CDN for static assets**

3. **Enable Next.js optimizations:**
   - Image optimization
   - Code splitting
   - Static generation where possible

4. **Database caching** (if adding database later)

---

## Monitoring

### PM2 Monitoring
```bash
pm2 monit
pm2 logs
pm2 status
```

### Health Check Endpoint
```bash
curl http://localhost:3001/api/health
```

---

## Backup Strategy

```bash
# Backup uploads directory
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz backend/uploads/

# Backup environment config
cp .env .env.backup
```

---

## Troubleshooting Production Issues

### Backend won't start
```bash
pm2 logs webencrypt-api --err
```

### C++ module errors
```bash
cd backend
rm -rf build
node-gyp clean
node-gyp configure
node-gyp build
```

### High memory usage
```bash
pm2 restart webencrypt-api
pm2 delete webencrypt-api
pm2 start backend/server.js --name webencrypt-api --max-memory-restart 500M
```

---

## Scaling

For high traffic:

1. **Horizontal scaling** - Multiple backend instances
2. **Load balancer** - Nginx/HAProxy
3. **Queue system** - Redis/BullMQ for file processing
4. **CDN** - CloudFlare/AWS CloudFront
5. **Database** - For user management and analytics

---

## Support

For deployment assistance, contact the development team.
