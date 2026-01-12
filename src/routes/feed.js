const express = require("express");
const mongoose = require("mongoose");
const { authMiddleware } = require('../middlewares/auth');
const User = require('../models/user');
const ConnectionRequest = require('../models/connectionRequest');

const feedRouter = express.Router();

// Get all users for feed (excluding current user and users with existing connection requests)
feedRouter.get("/feed", authMiddleware, async (req, res) => {
  try {
    const loggedInUser = req.user;
    
    // Get all connection requests where current user is either sender or receiver
    const existingConnections = await ConnectionRequest.find({
      $or: [
        { fromUserId: loggedInUser._id },
        { toUserId: loggedInUser._id }
      ]
    });
    
    // Extract user IDs that should be excluded
    const excludedUserIds = new Set();
    excludedUserIds.add(loggedInUser._id.toString()); // Add current user
    
    existingConnections.forEach(connection => {
      excludedUserIds.add(connection.fromUserId.toString());
      excludedUserIds.add(connection.toUserId.toString());
    });
    
    // Convert Set to Array for MongoDB query
    const excludedUserIdsArray = Array.from(excludedUserIds).map(id => new mongoose.Types.ObjectId(id));
    
    // Get all users except the current logged-in user and users with existing connections
    const users = await User.find({ 
      _id: { $nin: excludedUserIdsArray } 
    }).select("-password -confirmpassword"); // Exclude password fields for security
    
    res.status(200).send({
      message: "Feed data retrieved successfully",
      users: users,
      totalUsers: users.length
    });
  } catch (error) {
    res.status(500).send({ message: "Internal server error while fetching feed" });
  }
});

// Get specific user by ID for chat
feedRouter.get("/feed/user/:userId", authMiddleware, async (req, res) => {
  try {
    const { userId } = req.params;
    
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).send({ message: "Invalid user ID format" });
    }
    
    // Find user by ID (excluding password fields)
    const user = await User.findById(userId).select("-password -confirmpassword");
    
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }
    
    res.status(200).send({
      message: "User data retrieved successfully",
      user: user
    });
  } catch (error) {
    res.status(500).send({ message: "Internal server error while fetching user" });
  }
});


module.exports = feedRouter;
