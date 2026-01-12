const express = require("express");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/user");
const { signupvalidation } = require("../models/utils/validators");
const { generateOTP, sendOTPEmail, sendWelcomeEmail, generateResetToken, sendPasswordResetEmail } = require("../services/emailService");
const checkAuth = require("../middlewares/auth");
const checkAdminAuth = require("../middlewares/checkAdminAuth");

const authRouter = express.Router();

// Helper function to validate password format
const validatePasswordFormat = (password) => {
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumbers = /\d/.test(password);
  const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);
  const hasMinLength = password.length >= 8;

  const missingRequirements = [];
  if (!hasUpperCase) missingRequirements.push("uppercase letter (A-Z)");
  if (!hasLowerCase) missingRequirements.push("lowercase letter (a-z)");
  if (!hasNumbers) missingRequirements.push("number (0-9)");
  if (!hasSpecialChar) missingRequirements.push("special character (!@#$%^&*)");
  if (!hasMinLength) missingRequirements.push("minimum 8 characters");

  return {
    isValid: missingRequirements.length === 0,
    missingRequirements
  };
};

// ✅ SIGNUP ROUTE - Sends OTP for email verification
authRouter.post("/signup", async (req, res) => {
  try {
    signupvalidation(req);

    const {
      firstname,
      lastname,
      email,
      password,
      phone,
      age,
      gender,
      about,
      skills,
      photoUrl,
      college,
      year,
      bio,
      wantsToLearn,
      canTeach,
      socialLinks
    } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      if (existingUser.isEmailVerified) {
        return res.status(409).json({ 
          success: false,
          message: "Email already registered and verified" 
        });
      } else {
        // User exists but not verified - send new OTP
        const otp = generateOTP();
        const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
        
        existingUser.emailVerificationOTP = otp;
        existingUser.otpExpiry = otpExpiry;
        await existingUser.save();
        
        // Try to send email, but don't fail if it errors
        const isDevelopment = process.env.NODE_ENV !== 'production';
        try {
          await sendOTPEmail(email, otp, firstname);
          return res.status(200).json({
            success: true,
            message: "OTP resent to your email",
            requiresVerification: true
          });
        } catch (emailError) {
          // In development, return OTP in response so user can still verify
          if (isDevelopment) {
            return res.status(200).json({
              success: true,
              message: "OTP generated (email service unavailable)",
              requiresVerification: true,
              devMode: true,
              otp: otp // Only in development!
            });
          } else {
            throw emailError; // In production, fail
          }
        }
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    
    // Generate OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const user = new User({
      firstname,
      lastname,
      email,
      password: hashedPassword,
      phone,
      age,
      gender,
      about,
      bio,
      skills,
      photoUrl,
      college,
      year,
      wantsToLearn,
      canTeach,
      socialLinks,
      emailVerificationOTP: otp,
      otpExpiry: otpExpiry,
      isEmailVerified: false
    });

    await user.save();
    
    // Send OTP email - handle failures gracefully in development
    const isDevelopment = process.env.NODE_ENV !== 'production';
    try {
      await sendOTPEmail(email, otp, firstname);
      res.status(201).json({ 
        success: true,
        message: "User registered successfully. Please check your email for OTP.",
        requiresVerification: true
      });
    } catch (emailError) {
      // In development, return OTP in response so user can still verify
      if (isDevelopment) {
        res.status(201).json({ 
          success: true,
          message: "User registered successfully. OTP generated (email service unavailable)",
          requiresVerification: true,
          devMode: true,
          otp: otp // Only in development!
        });
      } else {
        // In production, delete the user and fail
        await User.findByIdAndDelete(user._id);
        throw emailError;
      }
    }
  } catch (error) {
    res.status(400).json({ 
      success: false,
      message: "Signup failed. Please check details and try again.",
      error: error.message 
    });
  }
});

// ✅ VERIFY OTP ROUTE
authRouter.post("/verify-otp", async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({
        success: false,
        message: "Email and OTP are required"
      });
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified"
      });
    }

    // Check if OTP is expired
    if (new Date() > user.otpExpiry) {
      return res.status(400).json({
        success: false,
        message: "OTP has expired. Please request a new one."
      });
    }

    // Verify OTP
    if (user.emailVerificationOTP !== otp) {
      return res.status(400).json({
        success: false,
        message: "Invalid OTP"
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    user.emailVerificationOTP = undefined;
    user.otpExpiry = undefined;
    await user.save();

    // Send welcome email (don't fail if it errors)
    try {
      await sendWelcomeEmail(email, user.firstname);
    } catch (emailError) {
      // Silently fail
    }

    res.status(200).json({
      success: true,
      message: "Email verified successfully! You can now log in."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Verification failed",
      error: error.message
    });
  }
});

// ✅ RESEND OTP ROUTE
authRouter.post("/resend-otp", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({
        success: false,
        message: "Email already verified"
      });
    }

    // Generate new OTP
    const otp = generateOTP();
    const otpExpiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    
    user.emailVerificationOTP = otp;
    user.otpExpiry = otpExpiry;
    await user.save();

    // Send OTP email - handle failures gracefully in development
    const isDevelopment = process.env.NODE_ENV !== 'production';
    try {
      await sendOTPEmail(email, otp, user.firstname);
      res.status(200).json({
        success: true,
        message: "OTP resent successfully"
      });
    } catch (emailError) {
      if (isDevelopment) {
        res.status(200).json({
          success: true,
          message: "OTP generated (email service unavailable)",
          devMode: true,
          otp: otp // Only in development!
        });
      } else {
        throw emailError;
      }
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to resend OTP",
      error: error.message
    });
  }
});

// ✅ LOGIN ROUTE - Only allows verified users
authRouter.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    // Check if user exists - explicitly select password field
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({ 
        success: false,
        message: "Account not found! 📧",
        toast: "No account found with this email. Please check your email or sign up!",
        details: "The email address is not registered in our system"
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "Email not verified",
        toast: "Please verify your email before logging in",
        requiresVerification: true
      });
    }

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ 
        success: false,
        message: "Password is incorrect! ❌",
        toast: "Wrong password. Please try again.",
        details: "The password you entered doesn't match our records"
      });
    }

    const token = jwt.sign({ _id: user._id }, process.env.JWT_SECRET, { 
      expiresIn: process.env.JWT_EXPIRES_IN || "7d" 
    });
    
    // Set HTTP-only cookie
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    };
    
    res.cookie("token", token, cookieOptions);
    
    res.status(200).json({ 
      success: true,
      message: "Login successful", 
      user: {
        _id: user._id,
        firstname: user.firstname,
        lastname: user.lastname,
        email: user.email,
        photoUrl: user.photoUrl,
        isAdmin: user.isAdmin,
        college: user.college,
        year: user.year,
        wantsToLearn: user.wantsToLearn,
        canTeach: user.canTeach
      },
      token // Also send in response for flexibility
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
});

// ✅ LOGOUT ROUTE
authRouter.post("/logout", (req, res) => {
  try {
    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax'
    });
    
    res.status(200).json({ 
      success: true,
      message: "Logout successful" 
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: "Internal server error" 
    });
  }
});

// ✅ FORGOT PASSWORD ROUTE - Sends password reset email
authRouter.post("/forgot-password", async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required"
      });
    }

    // Find user by email
    const user = await User.findOne({ email });
    
    if (!user) {
      // Don't reveal if email exists or not for security
      return res.status(200).json({
        success: true,
        message: "If an account exists with this email, you will receive a password reset link shortly."
      });
    }

    // Check if email is verified
    if (!user.isEmailVerified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email before resetting password"
      });
    }

    // Generate reset token
    const resetToken = generateResetToken();
    const resetExpiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    
    // Save reset token and expiry
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpiry = resetExpiry;
    await user.save();

    // Send password reset email
    const isDevelopment = process.env.NODE_ENV !== 'production';
    try {
      await sendPasswordResetEmail(email, resetToken, user.firstname);
      res.status(200).json({
        success: true,
        message: "Password reset link has been sent to your email"
      });
    } catch (emailError) {
      
      // Clear the reset token if email fails
      user.resetPasswordToken = undefined;
      user.resetPasswordExpiry = undefined;
      await user.save();
      
      if (isDevelopment) {
        // In development, return the token in response
        res.status(200).json({
          success: true,
          message: "Password reset token generated (email service unavailable)",
          devMode: true,
          resetToken: resetToken,
          resetUrl: `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${resetToken}`
        });
      } else {
        throw new Error('Failed to send password reset email');
      }
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to process password reset request",
      error: error.message
    });
  }
});

// ✅ RESET PASSWORD ROUTE - Resets password using token
authRouter.post("/reset-password", async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Token and new password are required"
      });
    }

    // Validate new password
    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters long"
      });
    }

    // Find user with valid reset token
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpiry: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired reset token"
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    
    // Update password and clear reset token
    user.password = hashedPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiry = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password has been reset successfully. You can now login with your new password."
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to reset password",
      error: error.message
    });
  }
});

// ✅ CREATE ADMIN ROUTE - Protected by environment secret
authRouter.post("/create-admin", async (req, res) => {
  try {
    const { email, adminSecret } = req.body;

    // Verify admin secret
    if (adminSecret !== process.env.ADMIN_SECRET) {
      return res.status(403).json({
        success: false,
        message: "Invalid admin secret"
      });
    }

    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found"
      });
    }

    if (user.isAdmin) {
      return res.status(400).json({
        success: false,
        message: "User is already an admin"
      });
    }

    user.isAdmin = true;
    await user.save();

    res.status(200).json({
      success: true,
      message: `${user.firstname} ${user.lastname} is now an admin`
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to create admin"
    });
  }
});

module.exports = authRouter;
