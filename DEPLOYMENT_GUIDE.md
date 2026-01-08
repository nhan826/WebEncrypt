# 🚀 Secure Deployment Guide for Investor Demo

## ⚠️ CRITICAL: Protecting Your Encryption Algorithm

Your Lockstitch C++ algorithm is proprietary intellectual property. Follow these steps to deploy securely.

---

## 📦 DEPLOYMENT STRATEGY

### Option 1: Binary-Only Deployment (RECOMMENDED)

**Compile locally, deploy only the binary:**

```bash
# 1. Compile C++ module on your development machine
cd /Users/nathanaelhan/Desktop/WebEncrypt/backend
node-gyp rebuild

# 2. Create production package (binary only)
cd ..
mkdir production-deploy
cp -r backend production-deploy/
cp -r components production-deploy/
cp -r pages production-deploy/
cp -r public production-deploy/
cp -r styles production-deploy/
cp package*.json production-deploy/
cp next.config.js tsconfig.json tailwind.config.ts postcss.config.js production-deploy/

# 3. Remove source code from production package
cd production-deploy
rm -rf backend/cpp/*.cpp
rm -rf backend/cpp/*.h
rm -rf backend/cpp/Lockstitch.*
rm -rf backend/binding.gyp

# 4. Verify only binary exists
ls -la backend/build/Release/lockstitch.node  # Should exist
ls backend/cpp/  # Should be empty or not exist

# 5. Deploy this production-deploy folder to your server
```

---

### Option 2: Docker Deployment (MOST SECURE)

**Use Docker multi-stage build:**

```bash
# Build locally (includes C++ compilation)
docker build -f Dockerfile.production -t threefold-crypto:demo .

# The Docker image will NOT contain source code
# Verify by inspecting:
docker run --rm -it threefold-crypto:demo sh
ls backend/cpp/  # Should not exist

# Deploy to cloud
docker save threefold-crypto:demo | gzip > threefold-demo.tar.gz
# Upload to AWS/Azure/DigitalOcean
```

---

### Option 3: Separate Backend Server (HIGHEST SECURITY)

**Host backend on private server, frontend on public CDN:**

```
Investor Demo:
  Frontend (Next.js) → Vercel/Netlify (public)
        ↓ API calls via HTTPS
  Backend (Node.js + C++) → Private VPS (IP restricted)
```

**Advantages:**
- Backend source code never accessible publicly
- Can use IP whitelisting (only demo users)
- Can shut down after demo
- Frontend shows functionality, backend remains black box

---

## 🔐 SECURITY CHECKLIST

### Before Deployment:

- [ ] **Remove all C++ source files** (.cpp, .h)
- [ ] **Keep only compiled binary** (lockstitch.node)
- [ ] **Use strong JWT secret** (not the dev one)
- [ ] **Use strong app password** (not tfcryptography32377!?)
- [ ] **Remove debug logging** (all console.log with passwords/keys)
- [ ] **Enable HTTPS** (use Let's Encrypt)
- [ ] **Set rate limits** (already configured)
- [ ] **Add IP whitelisting** (optional, for demos)
- [ ] **Set demo expiration** (add time-bomb in code)

### Environment Variables for Production:

```bash
# .env.production
PORT=3001
API_URL=https://your-demo-domain.com
JWT_SECRET=<generate-strong-random-64-char-string>
APP_PASSWORD=<create-strong-unique-password>
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX=50  # Lower for demo
NODE_ENV=production
```

**Generate strong secrets:**
```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Generate app password
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

---

## 🛡️ ADDITIONAL PROTECTION LAYERS

### 1. Strip Debug Symbols from Binary

```bash
# On macOS
strip -x backend/build/Release/lockstitch.node

# On Linux
strip --strip-all backend/build/Release/lockstitch.node
```

### 2. Add Demo Expiration

Add to `backend/server.js` (after line 1):

```javascript
// Demo expiration: January 31, 2026
const DEMO_EXPIRATION = new Date('2026-01-31T23:59:59Z');
if (new Date() > DEMO_EXPIRATION) {
  console.error('Demo period expired');
  process.exit(1);
}
```

### 3. IP Whitelist for Demo

Add to `backend/server.js`:

```javascript
// Whitelist specific IP addresses (investor offices)
const ALLOWED_IPS = [
  '203.0.113.0',  // Investor office 1
  '198.51.100.0', // Investor office 2
  '127.0.0.1',    // Localhost (for testing)
];

app.use((req, res, next) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  if (!ALLOWED_IPS.includes(clientIP)) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
});
```

### 4. Remove Debug Logging

Search and remove all sensitive logs:

```bash
# Find all debug logs
grep -r "console.log.*password" backend/
grep -r "console.log.*DEBUG" backend/

# Remove them before deployment
```

---

## 🌐 DEPLOYMENT PLATFORMS

### Recommended for Demo:

1. **Railway.app** - Easy deployment, supports Node.js + binary
2. **DigitalOcean App Platform** - Docker support
3. **AWS Elastic Beanstalk** - Enterprise-grade
4. **Heroku** - Simple but requires buildpack for binary
5. **Private VPS** (DigitalOcean Droplet) - Full control

### Deployment Steps (Railway example):

```bash
# 1. Prepare production build
npm run build

# 2. Create railway.toml
cat > railway.toml <<EOF
[build]
builder = "NIXPACKS"

[deploy]
startCommand = "node backend/server.js & npm start"
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
EOF

# 3. Deploy
railway login
railway init
railway up
```

---

## 🔍 WHAT INVESTORS CAN'T SEE

With this deployment:

✅ **Binary only** - No C++ source code  
✅ **Compiled algorithm** - Reverse engineering extremely difficult  
✅ **No documentation** - Setup instructions excluded  
✅ **Encrypted passwords** - Strong production secrets  
✅ **Rate limited** - Prevents abuse  
✅ **Time-limited demo** - Auto-expires  
✅ **IP restricted** (optional) - Only authorized access

Investors see:
- Working encryption/decryption functionality
- Clean UI/UX
- Professional security (HTTPS, JWT, rate limits)
- Real file processing

Investors CANNOT see:
- Encryption algorithm implementation
- Source code
- Database schemas (if any)
- Internal APIs beyond what UI exposes

---

## 📊 MONITORING & ANALYTICS

Consider adding:

```javascript
// Anonymous usage tracking for demo
const usage = {
  encryptions: 0,
  decryptions: 0,
  fileTypes: {},
  lastAccess: null
};

// Log to show investors engagement metrics
```

---

## 🚨 EMERGENCY PROCEDURES

**If you suspect unauthorized access:**

1. Change JWT_SECRET immediately
2. Revoke all existing tokens
3. Change APP_PASSWORD
4. Check server logs for suspicious activity
5. Shut down demo server if necessary

**Quick shutdown:**
```bash
# Stop all services
pm2 stop all
# Or
docker stop <container-id>
```

---

## ✅ FINAL VERIFICATION

Before demo:

```bash
# 1. Verify no source code in deployment
find . -name "*.cpp" -o -name "Lockstitch.h"  # Should return nothing

# 2. Verify binary exists
ls -lh backend/build/Release/lockstitch.node  # Should show ~1-2MB file

# 3. Test encryption works
curl -X POST https://your-demo.com/api/login \
  -H "Content-Type: application/json" \
  -d '{"password":"YOUR_PRODUCTION_PASSWORD"}'

# 4. Check security headers
curl -I https://your-demo.com
```

---

## 📝 INVESTOR DEMO SCRIPT

Prepare talking points:

1. **Security**: "Our encryption runs server-side using proprietary algorithms"
2. **Performance**: "C++ backend ensures enterprise-grade speed"
3. **Compatibility**: "Supports all major file types"
4. **Architecture**: "Modern full-stack with Next.js and Node.js"
5. **IP Protection**: "Core algorithm remains proprietary and protected"

---

## 🎯 SUMMARY

**Three-Layer Protection:**

1. **Physical**: No source code on server
2. **Binary**: Compiled + stripped debug symbols
3. **Network**: HTTPS + JWT + Rate limiting + IP whitelist

This approach lets investors see the **functionality** without exposing your **intellectual property**.
