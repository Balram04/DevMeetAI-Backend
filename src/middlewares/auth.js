const jwt = require('jsonwebtoken');
const User = require('../models/user');// Corrected file path

const authMiddleware = async (req, res, next) => {
  try {
    // Check Authorization header first (for production), then cookies (for local dev)
    let token = req.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      token = req.cookies.token;
    }
    
    if (!token) {
      return res.status(401).send({ message: "Unauthorized: No token provided" });
    }

    const isvalid = jwt.verify(token, process.env.JWT_SECRET);
    if (!isvalid) {
      return res.status(401).send({ message: "Unauthorized: Invalid token" });
    }

    const { _id } = isvalid;
    const user = await User.findById(_id);
    if (!user) {
      return res.status(404).send({ message: "User not found" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(400).send({ message: "Authentication failed. Please try again." });
  }
};

module.exports = {authMiddleware};