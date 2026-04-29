const functions = require('firebase-functions');
const admin = require('firebase-admin');
const sgMail = require('@sendgrid/mail');

admin.initializeApp();

// SendGrid configuration - UPDATE WITH YOUR SENDGRID API KEY
const SENDGRID_API_KEY = 'YOUR_SENDGRID_API_KEY_HERE'; // Get from https://app.sendgrid.com/settings/api_keys
const FROM_EMAIL = 'zaptin507@gmail.com'; // Your verified sender email
const TO_EMAIL = 'zaptin507@gmail.com'; // Where to send the report

// Initialize SendGrid
sgMail.setApiKey(SENDGRID_API_KEY);

/**
 * Daily User Report - Runs every day at 9:00 AM UTC
 * Sends an email with all registered users and their details
 */
exports.dailyUserReport = functions.pubsub
  .schedule('0 9 * * *') // Every day at 9 AM UTC
  .timeZone('UTC')
  .onRun(async (context) => {
    try {
      console.log('Starting daily user report generation...');
      
      // Get all users from Firebase Auth
      const listUsersResult = await admin.auth().listUsers();
      const users = listUsersResult.users;
      
      console.log(`Found ${users.length} registered users`);
      
      if (users.length === 0) {
        console.log('No users found, skipping email');
        return null;
      }
      
      // Format user data
      const userData = users.map(user => {
        const creationDate = user.metadata.creationTime 
          ? new Date(user.metadata.creationTime).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'Unknown';
        
        const lastSignIn = user.metadata.lastSignInTime
          ? new Date(user.metadata.lastSignInTime).toLocaleDateString('en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          : 'Never';
        
        return {
          email: user.email || 'No email',
          displayName: user.displayName || 'No display name',
          uid: user.uid,
          creationDate: creationDate,
          lastSignIn: lastSignIn,
          emailVerified: user.emailVerified ? 'Yes' : 'No'
        };
      });
      
      // Create HTML email content
      const htmlContent = generateEmailHTML(userData);
      
      // Send email via SendGrid
      const msg = {
        to: TO_EMAIL,
        from: FROM_EMAIL,
        subject: ` Daily Chess App User Report - ${new Date().toLocaleDateString()}`,
        html: htmlContent
      };
      
      await sgMail.send(msg);
      console.log('✅ Daily user report email sent successfully via SendGrid!');
      
      return null;
    } catch (error) {
      console.error('❌ Error sending daily user report:', error);
      throw error;
    }
  });

/**
 * Generate HTML email content
 */
function generateEmailHTML(userData) {
  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  
  const totalUsers = userData.length;
  const verifiedUsers = userData.filter(u => u.emailVerified === 'Yes').length;
  
  let userRows = userData.map((user, index) => `
    <tr style="background-color: ${index % 2 === 0 ? '#f9f9f9' : '#ffffff'};">
      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${index + 1}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${user.displayName}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${user.email}</td>
      <td style="padding: 10px; border: 1px solid #ddd; text-align: center;">${user.emailVerified}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${user.creationDate}</td>
      <td style="padding: 10px; border: 1px solid #ddd;">${user.lastSignIn}</td>
    </tr>
  `).join('');
  
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5; }
        .container { max-width: 900px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #769656 0%, #5a7a3a 100%); color: white; padding: 20px; border-radius: 8px; margin-bottom: 20px; text-align: center; }
        .header h1 { margin: 0; font-size: 28px; }
        .header p { margin: 5px 0 0 0; opacity: 0.9; }
        .stats { display: flex; justify-content: space-around; margin: 20px 0; padding: 15px; background: #f9f9f9; border-radius: 8px; }
        .stat { text-align: center; }
        .stat-number { font-size: 32px; font-weight: bold; color: #769656; }
        .stat-label { font-size: 14px; color: #666; margin-top: 5px; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th { background-color: #769656; color: white; padding: 12px; text-align: left; }
        td { padding: 10px; border: 1px solid #ddd; }
        .footer { margin-top: 30px; padding-top: 20px; border-top: 2px solid #eee; text-align: center; color: #999; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>♟️ Chess App - Daily User Report</h1>
          <p>${today}</p>
        </div>
        
        <div class="stats">
          <div class="stat">
            <div class="stat-number">${totalUsers}</div>
            <div class="stat-label">Total Users</div>
          </div>
          <div class="stat">
            <div class="stat-number">${verifiedUsers}</div>
            <div class="stat-label">Verified Emails</div>
          </div>
          <div class="stat">
            <div class="stat-number">${((verifiedUsers / totalUsers) * 100).toFixed(1)}%</div>
            <div class="stat-label">Verification Rate</div>
          </div>
        </div>
        
        <h2 style="color: #333; margin-top: 30px;"> Registered Users</h2>
        
        <table>
          <thead>
            <tr>
              <th style="text-align: center;">#</th>
              <th>Display Name</th>
              <th>Email (Gmail)</th>
              <th style="text-align: center;">Verified</th>
              <th>Account Created</th>
              <th>Last Login</th>
            </tr>
          </thead>
          <tbody>
            ${userRows}
          </tbody>
        </table>
        
        <div class="footer">
          <p>This is an automated daily report from your Chess App Firebase Cloud Function.</p>
          <p>Generated on ${new Date().toLocaleString()}</p>
        </div>
      </div>
    </body>
    </html>
  `;
}