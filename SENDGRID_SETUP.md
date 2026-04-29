# 📧 Daily User Report - SendGrid Setup Guide

## ✅ NO Google App Password Needed!

This setup uses **SendGrid** - a free email service that doesn't require 2-Step Verification.

---

##  What You'll Get

**Every day at 9:00 AM UTC**, you'll receive an email at **zaptin507@gmail.com** with:
-  Total registered users count
-  Complete list with Gmail addresses
-  Account creation dates
-  Last login dates
-  Email verification status
-  Beautiful chess-themed HTML report

---

##  Quick Setup (4 Steps)

### **Step 1️⃣ Install Node.js**

1. Go to: **https://nodejs.org/**
2. Download **LTS version** (v20.x.x)
3. Run the `.pkg` installer
4. Verify in Terminal:
   ```bash
   node --version
   npm --version
   ```

---

### **Step 2️⃣ Create SendGrid Account** (5 minutes)

#### **A. Sign Up**
1. Go to: **https://signup.sendgrid.com/**
2. Create a **free account**
3. Verify your email

#### **B. Create API Key**
1. Go to: **https://app.sendgrid.com/settings/api_keys**
2. Click: **Create API Key**
3. Name: `Chess App Daily Report`
4. Permissions: Select **Full Access** or **Restricted Access** → Mail Send
5. Click: **Create & View**
6. **COPY THE API KEY** (starts with `SG.`)
   - ⚠️ You'll only see it once!
   - Example: `SG.abc123def456...`

#### **C. Verify Sender Email**
1. Go to: **https://app.sendgrid.com/settings/sender_auth/senders**
2. Click: **Create Sender**
3. Fill in your details with email: `zaptin507@gmail.com`
4. Check your Gmail inbox for verification email
5. Click the verification link

---

### **Step 3️⃣ Update Configuration**

1. Open: `/Users/maxting/Desktop/Qoder/Chess/functions/index.js`
2. Find line 7:
   ```javascript
   const SENDGRID_API_KEY = 'YOUR_SENDGRID_API_KEY_HERE';
   ```
3. Replace with your SendGrid API key:
   ```javascript
   const SENDGRID_API_KEY = 'SG.your_actual_api_key_here';
   ```
4. Save the file

---

### **Step 4️⃣ Deploy to Firebase**

```bash
# Navigate to project
cd /Users/maxting/Desktop/Qoder/Chess

# Install dependencies
cd functions
npm install
cd ..

# Login to Firebase
firebase login

# Deploy the function
firebase deploy --only functions
```

---

## 🎉 That's It!

Your daily reports will start tomorrow at 9:00 AM UTC!

### **Test It Now** (Optional)

```bash
firebase functions:shell
> dailyUserReport()
```

Check your email - you should receive the report immediately!

---

## 📊 SendGrid Free Tier

- ✅ **100 emails per day** (you only need 1!)
- ✅ **Forever free**
- ✅ **No credit card required**
- ✅ **Better deliverability than Gmail**
- ✅ **Detailed analytics**

---

## 🔧 Useful Commands

**View function logs**:
```bash
firebase functions:log
```

**Test manually**:
```bash
firebase functions:shell
> dailyUserReport()
```

**Redeploy after changes**:
```bash
firebase deploy --only functions
```

---

## ⚠️ Troubleshooting

### **Email not received**
1. Check spam folder
2. Verify SendGrid API key is correct
3. Check Firebase logs: `firebase functions:log`
4. Verify sender email is verified in SendGrid

### **API key error**
- Make sure you copied the entire key (starts with `SG.`)
- Ensure no extra spaces
- Redeploy after updating

### **Sender verification error**
- Go to SendGrid dashboard
- Verify your sender email address
- Wait for verification email (check spam)

---

##  Cost

**$0.00/month** - Completely free!
- SendGrid free tier: 100 emails/day
- You use: 1 email/day
- Firebase free tier: 125,000 function calls/month
- You use: 30 calls/month

---

## ✅ Setup Checklist

- [ ] Node.js installed
- [ ] SendGrid account created
- [ ] API key generated and copied
- [ ] Sender email verified in SendGrid
- [ ] API key added to `functions/index.js`
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Logged into Firebase (`firebase login`)
- [ ] Dependencies installed (`cd functions && npm install`)
- [ ] Blaze Plan enabled in Firebase Console
- [ ] Function deployed (`firebase deploy --only functions`)
- [ ] Test email received

---

##  Need Help?

Check Firebase logs:
```bash
firebase functions:log
```

Or verify all checklist items are completed.

---

**Created for**: Chess App Daily User Reports  
**Email Service**: SendGrid (No 2FA required!)  
**Recipient**: zaptin507@gmail.com  
**Schedule**: Every day at 9:00 AM UTC