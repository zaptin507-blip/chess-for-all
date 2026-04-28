# 📧 Daily User Report - Setup Instructions

## What This Does
Sends you a daily email at 9:00 AM UTC with:
- Total number of registered users
- Complete list of users with their Gmail addresses
- Account creation dates
- Last login dates
- Email verification status
- Beautiful HTML formatted report

---

## 🚀 Step-by-Step Setup

### **Step 1: Install Node.js**

Since Homebrew is not installed, download Node.js directly:

1. **Go to**: https://nodejs.org/
2. **Download**: LTS version (v20.x.x)
3. **Install**: Run the `.pkg` installer
4. **Verify**: Open Terminal and run:
   ```bash
   node --version
   npm --version
   ```
   Both should show version numbers.

---

### **Step 2: Generate Gmail App Password**

Firebase needs permission to send emails from your Gmail. You'll create an App Password:

1. **Go to**: https://myaccount.google.com/security
2. **Enable 2-Step Verification** (if not already enabled)
3. **Go to**: https://myaccount.google.com/apppasswords
4. **Select**: "Mail" and "Other (Custom name)"
5. **Enter**: "Chess App Daily Report"
6. **Click**: Generate
7. **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)
8. **Remove spaces**: `abcdefghijklmnop`

**IMPORTANT**: Save this password! You'll only see it once.

---

### **Step 3: Update Email Configuration**

1. Open `/Users/maxting/Desktop/Qoder/Chess/functions/index.js`
2. Find line 9-10:
   ```javascript
   const EMAIL_CONFIG = {
     user: 'zaptin507@gmail.com',
     pass: 'YOUR_APP_PASSWORD_HERE', // ← REPLACE THIS
     to: 'zaptin507@gmail.com'
   };
   ```
3. **Replace** `YOUR_APP_PASSWORD_HERE` with your 16-character app password
4. **Save** the file

---

### **Step 4: Install Firebase CLI**

Open Terminal and run:

```bash
npm install -g firebase-tools
```

Verify installation:
```bash
firebase --version
```

---

### **Step 5: Login to Firebase**

```bash
firebase login
```

A browser window will open. Sign in with your Google account (the one that owns the Firebase project).

---

### **Step 6: Navigate to Project Directory**

```bash
cd /Users/maxting/Desktop/Qoder/Chess
```

---

### **Step 7: Install Dependencies**

```bash
cd functions
npm install
cd ..
```

This installs:
- firebase-admin
- firebase-functions
- nodemailer (for sending emails)

---

### **Step 8: Enable Billing (Required for Cloud Functions)**

Firebase Cloud Functions require the **Blaze Plan** (pay-as-you-go):

1. Go to: https://console.firebase.google.com/
2. Select your project: **chess-for-all**
3. Go to: **Settings** → **Usage and billing**
4. Click: **Upgrade to Blaze Plan**
5. Add your payment method

**Note**: The free tier gives you 125,000 function invocations per month. Your daily function uses only 30/month, so it's essentially **FREE**!

---

### **Step 9: Enable Required APIs**

In Firebase Console:

1. Go to your project
2. Navigate to: **Build** → **Functions**
3. If prompted, enable:
   - Cloud Functions API
   - Cloud Pub/Sub API
   - Cloud Scheduler API

---

### **Step 10: Deploy the Function**

From the Chess project directory:

```bash
firebase deploy --only functions
```

You should see:
```
✔  functions[dailyUserReport]: Successful create operation.
✔  Deploy complete!
```

---

### **Step 11: Test It (Optional)**

To manually trigger the function and test it:

```bash
firebase functions:shell
```

Then in the shell:
```javascript
dailyUserReport()
```

Check your email at `zaptin507@gmail.com` - you should receive the report!

---

## 📊 What You'll Receive

**Email Subject**:  Daily Chess App User Report - [Date]

**Email Contains**:
- ♟️ Beautiful green chess-themed header
- 📈 Stats: Total Users, Verified Emails, Verification Rate
- 📋 Table with:
  - User number
  - Display Name
  - **Email (Gmail)**
  - Email Verified (Yes/No)
  - Account Created date/time
  - Last Login date/time

---

## 🔧 Troubleshooting

### **Function fails to deploy**
```bash
firebase functions:log
```
Check logs for errors.

### **Email not received**
1. Check spam folder
2. Verify app password is correct
3. Check Firebase logs:
   ```bash
   firebase functions:log
   ```

### **Need to update app password**
1. Edit `/Users/maxting/Desktop/Qoder/Chess/functions/index.js`
2. Update the `pass` field
3. Redeploy:
   ```bash
   firebase deploy --only functions
   ```

---

##  Cost Estimate

**Daily User Report Function**:
- Runs 1x per day = 30 invocations/month
- Free tier: 125,000 invocations/month
- **Your cost: $0.00/month** ✅

---

## 🎯 Quick Start Commands

After completing setup, you can:

**View function logs**:
```bash
firebase functions:log
```

**Redeploy after changes**:
```bash
firebase deploy --only functions
```

**Test manually**:
```bash
firebase functions:shell
> dailyUserReport()
```

---

## ✅ Setup Checklist

- [ ] Node.js installed
- [ ] Gmail App Password generated
- [ ] Email config updated in `functions/index.js`
- [ ] Firebase CLI installed (`npm install -g firebase-tools`)
- [ ] Logged into Firebase (`firebase login`)
- [ ] Dependencies installed (`cd functions && npm install`)
- [ ] Blaze Plan enabled in Firebase Console
- [ ] APIs enabled (Cloud Functions, Pub/Sub, Scheduler)
- [ ] Function deployed (`firebase deploy --only functions`)
- [ ] Test email received at `zaptin507@gmail.com`

---

##  Need Help?

If you encounter any issues:
1. Check Firebase logs: `firebase functions:log`
2. Verify all checklist items are completed
3. Ensure app password is correct and has no spaces

---

**Created for**: Chess App Daily User Reports  
**Recipient**: zaptin507@gmail.com  
**Schedule**: Every day at 9:00 AM UTC