const { Resend } = require('resend');

// Resend configuration
const resend = new Resend(process.env.RESEND_API_KEY);

/**
 * Generate a 6-digit OTP
 */
const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Send OTP email for email verification
 */
const sendOTPEmail = async (email, otp, name) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Resend API key not configured. Please set RESEND_API_KEY environment variable.');
  }

  const emailData = {
    from: process.env.RESEND_FROM_EMAIL || 'DevMeet <onboarding@resend.dev>',
    to: [email],
    subject: 'DevMeet - Verify Your Email',
    html: `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .otp-box { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; }
          .otp-code { font-size: 36px; font-weight: bold; letter-spacing: 8px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">DevMeet</div>
            <h2>Email Verification</h2>
          </div>
          <p>Hi ${name},</p>
          <p>Welcome to DevMeet! Please use the following OTP to verify your email address:</p>
          <div class="otp-box">
            <div class="otp-code">${otp}</div>
          </div>
          <p>This OTP will expire in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DevMeet. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
    `
  };

  try {
    const { data, error } = await resend.emails.send(emailData);
    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    throw error;
  }
};

/**
 * Send welcome email after successful registration
 */
const sendWelcomeEmail = async (email, name) => {
  if (!process.env.RESEND_API_KEY) {
    return false;
  }

  const emailData = {
    from: process.env.RESEND_FROM_EMAIL || 'DevMeet <onboarding@resend.dev>',
    to: [email],
    subject: 'Welcome to DevMeet! 🎉',
    html: `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .button { display: inline-block; padding: 12px 30px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .features { background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">DevMeet</div>
            <h2>Welcome Aboard! 🎉</h2>
          </div>
          <p>Hi ${name},</p>
          <p>Your email has been successfully verified! You're now part of the DevMeet community.</p>
          <div class="features">
            <h3>What's Next?</h3>
            <ul>
              <li>🎯 Complete your profile with skills you want to learn and teach</li>
              <li>🤝 Get matched with developers who complement your skill set</li>
              <li>💡 Start collaborating on exciting projects</li>
              <li>📚 Learn from others and share your knowledge</li>
            </ul>
          </div>
          <p style="text-align: center;">
            <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button">Get Started</a>
          </p>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DevMeet. All rights reserved.</p>
          </div>
        </div>
      </body>
    </html>
    `
  };

  try {
    const { data, error } = await resend.emails.send(emailData);
    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    // Don't throw error for welcome email
    return false;
  }
};

/**
 * Generate a secure password reset token
 */
const generateResetToken = () => {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
};

/**
 * Send password reset email with reset link
 */
const sendPasswordResetEmail = async (email, resetToken, name) => {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('Resend API key not configured. Please set RESEND_API_KEY environment variable.');
  }

  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`;

  const emailData = {
    from: process.env.RESEND_FROM_EMAIL || 'DevMeet <onboarding@resend.dev>',
    to: [email],
    subject: 'DevMeet - Password Reset Request',
    html: `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 20px; }
          .container { max-width: 600px; margin: 0 auto; background: white; padding: 30px; border-radius: 10px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .header { text-align: center; margin-bottom: 30px; }
          .logo { font-size: 32px; font-weight: bold; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
          .button { display: inline-block; padding: 15px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white !important; text-decoration: none; border-radius: 8px; margin: 20px 0; font-weight: bold; }
          .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 4px; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
          .link-box { background: #f8f9fa; padding: 15px; border-radius: 5px; word-break: break-all; font-size: 12px; color: #666; margin: 10px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="logo">DevMeet</div>
            <h2>Password Reset Request</h2>
          </div>
          <p>Hi ${name},</p>
          <p>We received a request to reset your password for your DevMeet account. Click the button below to reset it:</p>
          <p style="text-align: center;">
            <a href="${resetUrl}" class="button">Reset Password</a>
          </p>
          <p style="text-align: center; color: #666; font-size: 14px;">Or copy and paste this link in your browser:</p>
          <div class="link-box">${resetUrl}</div>
          <div class="warning">
            <strong>⚠️ Security Notice:</strong>
            <ul style="margin: 10px 0; padding-left: 20px;">
              <li>This link will expire in 1 hour</li>
              <li>If you didn't request this reset, please ignore this email</li>
              <li>Your password won't change unless you click the link above</li>
            </ul>
          </div>
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} DevMeet. All rights reserved.</p>
            <p>If you have any questions, please contact our support team.</p>
          </div>
        </div>
      </body>
    </html>
    `
  };

  try {
    const { data, error } = await resend.emails.send(emailData);
    if (error) {
      throw error;
    }
    return true;
  } catch (error) {
    throw error;
  }
};

module.exports = {
  generateOTP,
  sendOTPEmail,
  sendWelcomeEmail,
  generateResetToken,
  sendPasswordResetEmail,
};
