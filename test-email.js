require('dotenv').config();
const nodemailer = require('nodemailer');

console.log('\n========== NODEMAILER EMAIL TEST ==========\n');

// Check environment variables
console.log('1. Environment Variables Check:');
console.log('   SMTP_HOST:', process.env.SMTP_HOST || '❌ NOT SET');
console.log('   SMTP_PORT:', process.env.SMTP_PORT || '❌ NOT SET');
console.log('   SMTP_USER:', process.env.SMTP_USER || '❌ NOT SET');
console.log('   SMTP_PASS:', process.env.SMTP_PASS ? '✅ SET' : '❌ NOT SET');
console.log('   SMTP_FROM_EMAIL:', process.env.SMTP_FROM_EMAIL || '❌ NOT SET');
console.log('   SMTP_FROM_NAME:', process.env.SMTP_FROM_NAME || '❌ NOT SET');

// Validate credentials
console.log('\n2. Credentials Check:');
if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.log('   ❌ SMTP credentials are missing!');
  process.exit(1);
}
console.log('   ✅ SMTP credentials configured');

// Initialize Nodemailer
console.log('\n3. Initializing Nodemailer Transporter:');
try {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: process.env.SMTP_PORT || 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
  console.log('   ✅ Nodemailer transporter initialized');

  // Verify connection
  console.log('\n4. Verifying SMTP Connection:');
  transporter.verify(function (error, success) {
    if (error) {
      console.log('   ❌ Connection failed:', error.message);
      process.exit(1);
    } else {
      console.log('   ✅ SMTP server is ready to send emails');
      
      // Test sending email
      console.log('\n5. Sending Test Email:');
      const mailOptions = {
        from: {
          name: process.env.SMTP_FROM_NAME || 'DevMeet',
          address: process.env.SMTP_FROM_EMAIL || process.env.SMTP_USER
        },
        to: process.env.SMTP_USER,
  
        to: process.env.SMTP_USER,
        subject: 'Test Email from DevMeet Backend',
        html: `
          <html>
            <body style="font-family: Arial, sans-serif; padding: 20px;">
              <h2 style="color: #667eea;">✅ Email Test Successful!</h2>
              <p>This is a test email from your DevMeet backend.</p>
              <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
              <p>If you received this, your Nodemailer/Gmail SMTP configuration is working correctly! 🎉</p>
            </body>
          </html>
        `
      };

      console.log('   Sending to:', mailOptions.to);
      console.log('   From:', mailOptions.from.address);
      
      transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
          console.log('\n========== ❌ FAILED ==========');
          console.error('Error:', error.message);
          console.log('\n📋 Troubleshooting Steps:');
          console.log('1. Verify SMTP password is correct (App Password from Google)');
          console.log('2. Enable 2FA and create App Password: https://myaccount.google.com/apppasswords');
          console.log('3. Check Gmail account is active');
          console.log('4. Verify SMTP settings (host: smtp.gmail.com, port: 587)');
          console.log('==============================\n');
          process.exit(1);
        } else {
          console.log('\n========== ✅ SUCCESS ==========');
          console.log('Message ID:', info.messageId);
          console.log('Email sent successfully!');
          console.log('Check your inbox:', process.env.SMTP_USER);
          console.log('===============================\n');
        }
      });
    }
  });

} catch (error) {
  console.log('   ❌ Initialization failed:', error.message);
  process.exit(1);
}
  
