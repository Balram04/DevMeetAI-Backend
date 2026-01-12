const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    firstname: {
      type: String,
      required: true,
      trim: true
    },
    lastname: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      type: String
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true
    },
    password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false // Don't include password in queries by default
  },
    
    // Email Verification
    isEmailVerified: {
      type: Boolean,
      default: false
    },
    emailVerificationOTP: {
      type: String
    },
    otpExpiry: {
      type: Date
    },
    
    // Password Reset
    resetPasswordToken: {
      type: String
    },
    resetPasswordExpiry: {
      type: Date
    },
    
    age: {
      type: Number
    },
    gender: {
      type: String
    },
    about: {
      type: String
    },
    bio: {
      type: String,
      maxlength: 500
    },
    
    // Learning & Teaching
    wantsToLearn: {
      type: [String],
      default: []
    },
    canTeach: {
      type: [String],
      default: []
    },
    
    skills: {
      type: [String]
    },
    
    // Education
    college: {
      type: String
    },
    year: {
      type: String,
      enum: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Alumni', 'Other']
    },
    
    // Social Links
    socialLinks: {
      linkedin: { type: String },
      github: { type: String },
      twitter: { type: String },
      instagram: { type: String },
      portfolio: { type: String }
    },
    
    photoUrl: {
      type: String,
      default: ""
    },
    
    // Admin
    isAdmin: {
      type: Boolean,
      default: false
    },
    
    date: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('User', userSchema);
