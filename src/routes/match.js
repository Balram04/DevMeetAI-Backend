const express = require('express');
const mongoose = require('mongoose');
const User = require('../models/user');
const ConnectionRequest = require('../models/connectionRequest');
const { authMiddleware } = require('../middlewares/auth');
const { normalizeSkillKeyList } = require('../utils/skillNormalization');

const matchRouter = express.Router();

// ✅ GET MATCHED PEERS - Based on intersection of interests
matchRouter.get('/matches', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    
    if (!currentUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get all existing connections (accepted, interested, or pending)
    const existingConnections = await ConnectionRequest.find({
      $or: [
        { fromUserId: currentUser._id },
        { toUserId: currentUser._id }
      ]
    });

    // Extract user IDs that should be excluded
    const excludedUserIds = new Set();
    excludedUserIds.add(currentUser._id.toString());
    
    existingConnections.forEach(connection => {
      excludedUserIds.add(connection.fromUserId.toString());
      excludedUserIds.add(connection.toUserId.toString());
    });

    // Convert to MongoDB ObjectIds
    const excludedUserIdsArray = Array.from(excludedUserIds).map(id => new mongoose.Types.ObjectId(id));

    const currentWantsToLearnKeys = normalizeSkillKeyList(currentUser.wantsToLearn || []);
    const currentCanTeachKeys = normalizeSkillKeyList(currentUser.canTeach || []);

    // Get matches using MongoDB aggregation
    const matches = await User.aggregate([
      {
        // Exclude current user, unverified users, and users with existing connections
        $match: {
          _id: { $nin: excludedUserIdsArray },
          isEmailVerified: true
        }
      },
      {
        // Add computed fields for intersections
        $addFields: {
          // Peer skills that match (case-insensitive) what current user wants to learn
          commonLearn: {
            $filter: {
              input: { $ifNull: ['$canTeach', []] },
              as: 'skill',
              cond: {
                $in: [
                  { $toLower: { $trim: { input: '$$skill' } } },
                  currentWantsToLearnKeys
                ]
              }
            }
          },
          // Peer wantsToLearn that match (case-insensitive) what current user can teach
          commonTeach: {
            $filter: {
              input: { $ifNull: ['$wantsToLearn', []] },
              as: 'skill',
              cond: {
                $in: [
                  { $toLower: { $trim: { input: '$$skill' } } },
                  currentCanTeachKeys
                ]
              }
            }
          }
        }
      },
      {
        $addFields: {
          canLearnFromPeer: { $size: '$commonLearn' },
          canTeachToPeer: { $size: '$commonTeach' }
        }
      },
      {
        // Calculate total match score
        $addFields: {
          matchScore: {
            $add: ['$canLearnFromPeer', '$canTeachToPeer']
          }
        }
      },
      {
        // Filter only users with at least one match
        $match: {
          matchScore: { $gt: 0 }
        }
      },
      {
        // Sort by match score (descending)
        $sort: { matchScore: -1 }
      },
      {
        // Project only needed fields
        $project: {
          firstname: 1,
          lastname: 1,
          email: 1,
          photoUrl: 1,
          college: 1,
          year: 1,
          bio: 1,
          about: 1,
          wantsToLearn: 1,
          canTeach: 1,
          skills: 1,
          socialLinks: 1,
          matchScore: 1,
          canLearnFromPeer: 1,
          canTeachToPeer: 1,
          commonLearn: 1,
          commonTeach: 1
        }
      },
      {
        // Limit to top 50 matches
        $limit: 50
      }
    ]);

    res.status(200).json({
      success: true,
      count: matches.length,
      matches: matches
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch matches',
      error: error.message
    });
  }
});

// ✅ GET SPECIFIC MATCH DETAILS
matchRouter.get('/matches/:userId', authMiddleware, async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id);
    const targetUser = await User.findById(req.params.userId);
    
    if (!targetUser || !targetUser.isEmailVerified) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const currentWantsToLearnKeys = new Set(normalizeSkillKeyList(currentUser.wantsToLearn || []));
    const currentCanTeachKeys = new Set(normalizeSkillKeyList(currentUser.canTeach || []));

    const commonLearn = (targetUser.canTeach || []).filter((skill) =>
      currentWantsToLearnKeys.has(String(skill || '').trim().toLowerCase())
    );

    const commonTeach = (targetUser.wantsToLearn || []).filter((skill) =>
      currentCanTeachKeys.has(String(skill || '').trim().toLowerCase())
    );

    res.status(200).json({
      success: true,
      user: {
        _id: targetUser._id,
        firstname: targetUser.firstname,
        lastname: targetUser.lastname,
        email: targetUser.email,
        photoUrl: targetUser.photoUrl,
        college: targetUser.college,
        year: targetUser.year,
        bio: targetUser.bio,
        about: targetUser.about,
        wantsToLearn: targetUser.wantsToLearn,
        canTeach: targetUser.canTeach,
        skills: targetUser.skills,
        socialLinks: targetUser.socialLinks
      },
      matchDetails: {
        canLearnFromPeer: commonLearn,
        canTeachToPeer: commonTeach,
        matchScore: commonLearn.length + commonTeach.length
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch match details',
      error: error.message
    });
  }
});

module.exports = matchRouter;
