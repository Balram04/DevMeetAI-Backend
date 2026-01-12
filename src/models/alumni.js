const mongoose = require('mongoose');

const alumniSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      lowercase: true
    },
    collegeName: {
      type: String,
      required: true,
      trim: true
    },
    graduationYear: {
      type: String,
      required: true
    },
    degree: {
      type: String
    },
    currentCompany: {
      type: String,
      required: true
    },
    currentRole: {
      type: String,
      required: true
    },
    location: {
      type: String
    },
    bio: {
      type: String,
      maxlength: 500
    },
    expertise: {
      type: [String],
      default: []
    },
    socialLinks: {
      linkedin: { type: String },
      github: { type: String },
      twitter: { type: String },
      instagram: { type: String },
      portfolio: { type: String }
    },
    interviewProcess: {
      rounds: { type: Number },
      description: { type: String },
      tips: { type: [String], default: [] },
      difficulty: { type: String, enum: ['Easy', 'Medium', 'Hard', ''] }
    },
    photoUrl: {
      type: String,
      default: ""
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Alumni', alumniSchema);
