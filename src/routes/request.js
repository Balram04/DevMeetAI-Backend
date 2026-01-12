const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/user');
const { authMiddleware } = require('../middlewares/auth');
const ConnectionRequest = require('../models/connectionRequest');
const requestRouter = express.Router();

requestRouter.post("/request/send/:status/:toUserId", authMiddleware, async (req, res) => {
    try {
        const { status, toUserId } = req.params;
        const fromUserId = req.user._id;

        // Only ignored and interested status are allowed
        const allowedStatus = ["ignored", "interested"];
        if (!allowedStatus.includes(status)) {
            return res.status(400).json({
                message: "Invalid status: " + status,
            });
        }

        // Validate toUserId format
        if (!mongoose.isValidObjectId(toUserId)) {
            return res.status(400).json({
                message: "Invalid user ID format",
            });
        }

        // Check if user is trying to send request to themselves
        if (fromUserId.toString() === toUserId.toString()) {
            return res.status(400).json({
                message: "You cannot send a connection request to yourself",
            });
        }

        // Check if the target user exists
        const toUser = await User.findById(toUserId);
        if (!toUser) {
            return res.status(404).json({
                message: "User not found",
            });
        }

        // Check if connection request already exists (bidirectional check)
        const existingConnectionRequest = await ConnectionRequest.findOne({
            $or: [
                { fromUserId: fromUserId, toUserId: toUserId },
                { fromUserId: toUserId, toUserId: fromUserId }
            ]
        });

        if (existingConnectionRequest) {
            const statusMsg = existingConnectionRequest.status === 'interested' 
                ? "Connection request is already pending"
                : `Connection request already exists with status: ${existingConnectionRequest.status}`;
            return res.status(400).json({ 
                message: statusMsg
            });
        }

        const connectionRequest = new ConnectionRequest({
            fromUserId,
            toUserId,
            status,
        });

        const data = await connectionRequest.save();
        const statusMessage = status === "interested"
            ? "Interest shown successfully"
            : "Profile ignored successfully";

        res.json({
            message: statusMessage,
            data,
        });

    } catch (err) {
        res.status(500).json({
            message: "Something went wrong: " + err.message
        });
    }
})

requestRouter.post("/request/review/:status/:requestId", authMiddleware, async (req, res) => {
    try {
        const { status, requestId } = req.params;
        const loggedInUser = req.user;
        const allowedStatus = ["accepted", "rejected"];

        // Validate status
        if (!allowedStatus.includes(status)) {
            return res.status(400).json({
                message: "Invalid status: " + status,
            });
        }

        // Validate requestId format
        if (!mongoose.isValidObjectId(requestId)) {
            return res.status(400).json({
                message: "Invalid request ID format",
            });
        }

        // Get the ConnectionRequest model
        const connectionRequest = await ConnectionRequest.findOne({
            _id: requestId,
            toUserId: loggedInUser._id,
            status: "interested",
        });

        if (!connectionRequest) {
            return res.status(404).json({
                message: "Connection request not found or already processed",
            });
        }

        // Update the status
        connectionRequest.status = status;
        const data = await connectionRequest.save();

        const statusMessage = status === "accepted"
            ? "Connection request accepted successfully"
            : "Connection request rejected successfully";

        res.json({
            message: statusMessage,
            data,
        });
        
    } catch (err) {
        res.status(500).json({
            message: "Something went wrong: " + err.message
        });
    }
})

requestRouter.delete("/request/cancel/:toUserId", authMiddleware, async (req, res) => {
    try {
        const { toUserId } = req.params;
        const fromUserId = req.user._id;

        // Validate toUserId format
        if (!mongoose.isValidObjectId(toUserId)) {
            return res.status(400).json({
                message: "Invalid user ID format",
            });
        }

        // Check if user is trying to cancel request to themselves
        if (fromUserId.toString() === toUserId.toString()) {
            return res.status(400).json({
                message: "Invalid operation",
            });
        }

        // Find the connection request to cancel
        const existingConnectionRequest = await ConnectionRequest.findOne({
            $or: [
                { fromUserId: fromUserId, toUserId: toUserId },
                { fromUserId: toUserId, toUserId: fromUserId }
            ]
        });

        if (!existingConnectionRequest) {
            return res.status(404).json({
                message: "Connection request not found",
            });
        }

        // Only allow canceling if the logged-in user is the sender, or if it's pending
        if (existingConnectionRequest.fromUserId.toString() !== fromUserId.toString() && 
            existingConnectionRequest.toUserId.toString() !== fromUserId.toString()) {
            return res.status(403).json({
                message: "You are not authorized to cancel this request",
            });
        }

        await existingConnectionRequest.deleteOne();
        res.json({
            message: "Connection request cancelled successfully",
        });
        
    } catch (err) {
        res.status(500).json({
            message: "Internal Server Error: " + err.message,
        });
    }
});

module.exports = requestRouter;