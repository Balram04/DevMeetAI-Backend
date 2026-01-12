const express = require('express');
const Alumni = require('../models/alumni');
const { authMiddleware } = require('../middlewares/auth');
const checkAdminAuth = require('../middlewares/checkAdminAuth');

const alumniRouter = express.Router();

// ✅ GET ALL ALUMNI - Public for logged-in users
alumniRouter.get('/alumni', authMiddleware, async (req, res) => {
  try {
    const { company, year, college, search, limit = 50, page = 1 } = req.query;
    
    const query = { isActive: true };
    
    // Filter by company
    if (company) {
      query.currentCompany = { $regex: company, $options: 'i' };
    }
    
    // Filter by college name
    if (college) {
      query.collegeName = { $regex: college, $options: 'i' };
    }
    
    // Filter by graduation year
    if (year) {
      query.graduationYear = year;
    }
    
    // Search by name or role
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { currentRole: { $regex: search, $options: 'i' } },
        { expertise: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const alumni = await Alumni.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip);
    
    const total = await Alumni.countDocuments(query);

    res.status(200).json({
      success: true,
      count: alumni.length,
      total: total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      alumni: alumni
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alumni',
      error: error.message
    });
  }
});

// ✅ GET SINGLE ALUMNI BY ID
alumniRouter.get('/alumni/:id', authMiddleware, async (req, res) => {
  try {
    const alumni = await Alumni.findById(req.params.id);
    
    if (!alumni || !alumni.isActive) {
      return res.status(404).json({
        success: false,
        message: 'Alumni not found'
      });
    }

    res.status(200).json({
      success: true,
      alumni: alumni
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch alumni',
      error: error.message
    });
  }
});

// ✅ CREATE ALUMNI - Admin only
alumniRouter.post('/alumni', authMiddleware, checkAdminAuth, async (req, res) => {
  try {
    const {
      name,
      email,
      collegeName,
      graduationYear,
      degree,
      currentCompany,
      currentRole,
      location,
      bio,
      expertise,
      socialLinks,
      photoUrl,
      interviewProcess
    } = req.body;

    // Validate required fields
    if (!name || !email || !graduationYear || !currentCompany || !currentRole) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, graduation year, current company, and current role are required'
      });
    }

    const alumni = new Alumni({
      name,
      email,
      collegeName,
      graduationYear,
      degree,
      currentCompany,
      currentRole,
      location,
      bio,
      expertise,
      socialLinks,
      photoUrl,
      interviewProcess
    });

    await alumni.save();

    res.status(201).json({
      success: true,
      message: 'Alumni added successfully',
      alumni: alumni
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create alumni',
      error: error.message
    });
  }
});

// ✅ UPDATE ALUMNI - Admin only
alumniRouter.put('/alumni/:id', authMiddleware, checkAdminAuth, async (req, res) => {
  try {
    const {
      name,
      email,
      collegeName,
      graduationYear,
      degree,
      currentCompany,
      currentRole,
      location,
      bio,
      expertise,
      socialLinks,
      photoUrl,
      interviewProcess,
      isActive
    } = req.body;

    const alumni = await Alumni.findByIdAndUpdate(
      req.params.id,
      {
        name,
        email,
        collegeName,
        graduationYear,
        degree,
        currentCompany,
        currentRole,
        location,
        bio,
        expertise,
        socialLinks,
        photoUrl,
        interviewProcess,
        isActive
      },
      { new: true, runValidators: true }
    );

    if (!alumni) {
      return res.status(404).json({
        success: false,
        message: 'Alumni not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Alumni updated successfully',
      alumni: alumni
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update alumni',
      error: error.message
    });
  }
});

// ✅ DELETE ALUMNI - Admin only (soft delete)
alumniRouter.delete('/alumni/:id', authMiddleware, checkAdminAuth, async (req, res) => {
  try {
    const alumni = await Alumni.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );

    if (!alumni) {
      return res.status(404).json({
        success: false,
        message: 'Alumni not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Alumni removed successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete alumni',
      error: error.message
    });
  }
});

// ✅ GET ALUMNI STATISTICS - Admin only
alumniRouter.get('/alumni/stats/overview', authMiddleware, checkAdminAuth, async (req, res) => {
  try {
    const totalAlumni = await Alumni.countDocuments({ isActive: true });
    
    const companyCounts = await Alumni.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$currentCompany', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 }
    ]);

    const yearCounts = await Alumni.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$graduationYear', count: { $sum: 1 } } },
      { $sort: { _id: -1 } }
    ]);

    res.status(200).json({
      success: true,
      stats: {
        total: totalAlumni,
        topCompanies: companyCounts,
        byYear: yearCounts
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to fetch statistics',
      error: error.message
    });
  }
});

module.exports = alumniRouter;
