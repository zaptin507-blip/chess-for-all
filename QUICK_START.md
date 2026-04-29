# 📧 Daily User Report - Quick Reference

## What's Been Created

✅ **Firebase Cloud Function** - Runs daily at 9 AM UTC  
✅ **Email Template** - Beautiful HTML report with all user data  
✅ **Setup Script** - Automated installation helper  
✅ **Configuration Files** - Firebase project setup  

---

##  Quick Setup (5 Steps)

### **1️ Install Node.js**
```
Download from: https://nodejs.org/ (LTS version)
```

### **2️⃣ Generate Gmail App Password**
```
1. Go to: https://myaccount.google.com/apppasswords
2. Create password for: "Chess App Daily Report"
3. Copy the 16-character code (remove spaces)
```

### **3️⃣ Update Email Config**
```
Open: functions/index.js
Line 10: Replace 'YOUR_APP_PASSWORD_HERE' with your app password
Save the file
```

### **4️⃣ Run Setup Script**
```bash
cd /Users/maxting/Desktop/Qoder/Chess
./setup-daily-report.sh
```

### **5️⃣ Deploy to Firebase**
```bash
firebase login
firebase deploy --only functions
```

---

##  What You'll Receive

**Email sent to**: zaptin507@gmail.com  
**Schedule**: Every day at 9:00 AM UTC  
**Format**: Beautiful HTML report

**Contains**:
- Total registered users count
- Email verification statistics
- **Complete user list with Gmail addresses**
- Account creation dates
- Last login dates

---

## 🔧 Useful Commands

**View function logs**:
```bash
firebase functions:log
```

**Test function manually**:
```bash
firebase functions:shell
> dailyUserReport()
```

**Redeploy after changes**:
```bash
firebase deploy --only functions
```

---

##  Cost

**$0.00/month** - Well within free tier limits!
- 30 invocations/month (1 per day)
- Free tier: 125,000 invocations/month

---

## 📂 Files Created

```
Chess/
├── functions/
│   ├── index.js          ← Cloud Function code
│   └── package.json      ← Dependencies
├── .firebaserc           ← Firebase project config
├── firebase.json         ← Firebase settings
├── setup-daily-report.sh ← Setup automation script
├── DAILY_REPORT_SETUP.md ← Detailed instructions
└── QUICK_START.md        ← This file
```

---

## ⚠️ Important Notes

1. **Blaze Plan Required**: Enable in Firebase Console (pay-as-you-go)
2. **App Password**: Never share your Gmail app password
3. **Security**: All code runs server-side, credentials are secure

---

## 🆘 Need Help?

See detailed instructions: `DAILY_REPORT_SETUP.md`

Or check Firebase logs:
```bash
firebase functions:log
```

---

**Created for**: Chess App  
**Admin Email**: zaptin507@gmail.com