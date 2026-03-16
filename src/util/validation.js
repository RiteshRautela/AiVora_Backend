const validator = require("validator");

const validateSignupInput = (req) => {
  const { firstName, lastName, emailId, password } = req.body;

  if (!firstName || !lastName) {
    throw new Error("Name is not entered");
  }

  if (!validator.isEmail(emailId)) {
    throw new Error("Invalid email");
  }

  if (!validator.isStrongPassword(password)) {
    throw new Error("Password is not strong enough");
  }
};

const validateLogIn = (req) => {
  const { password, emailId } = req.body;

  if (!validator.isEmail(emailId)) {
    throw new Error("Invalid email");
  }

  if (!password) {
    throw new Error("Password is required");
  }
};

module.exports = {
  validateSignupInput,
  validateLogIn,
};