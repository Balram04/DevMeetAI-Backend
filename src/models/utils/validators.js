const validator = require('validator');

const signupvalidation = (req) => {
  const { firstname, lastname, password, email,skills } = req.body;

  if (!validator.isEmail(email)) {
    throw new Error("Please provide a valid email address.");
  } else if (!firstname || !lastname) {
    throw new Error("First name and last name are required.");
  } else if (!validator.isStrongPassword(password)) {
    throw new Error("Password must be strong (include uppercase, lowercase, numbers, and symbols).");
  }
};

const validprofiledata = (req) => {
   // signupvalidation(req); // Validate email, firstname, lastname, and password
  const allowedEditFields = {
      firstname: true,
      lastname: true,
      email: true,
      skills: true,
      age: true,
      gender: true,
      about: true,
      photoUrl: true,
      wantsToLearn: true,
      canTeach: true,
  };

  const isEditAllowed = Object.keys(req.body).every((key) => {
    return allowedEditFields[key];
  });

  if (!isEditAllowed) {
    const invalidFields = Object.keys(req.body).filter(key => !allowedEditFields[key]);
    throw new Error(`Invalid fields provided for profile update: ${invalidFields.join(', ')}`);
  }

  return true; // Return true if validation passes
};

module.exports = { signupvalidation, validprofiledata };