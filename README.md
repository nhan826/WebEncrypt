# WebEncrypt Backend

**Private Repository** - Contains proprietary Lockstitch C++ encryption

## Deployment

This backend should be deployed to Railway, Render, or similar service.

### Environment Variables Required:

```
JWT_SECRET=<generate with: openssl rand -base64 32>
APP_PASSWORD=<your-secure-password>
NODE_ENV=production
FRONTEND_URL=https://your-frontend.vercel.app
PORT=3001
```

### Build Commands:

```bash
npm install
npm run build
npm start
```

## Security

- C++ source code remains on server only
- Never deploy this to client-accessible platforms
- Use strong JWT_SECRET in production
