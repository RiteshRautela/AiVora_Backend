const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;

  if (!secret || secret.length < 32) {
    const error = new Error("JWT_SECRET must be set to a random value of at least 32 characters");
    error.code = "JWT_SECRET_NOT_CONFIGURED";
    throw error;
  }

  return secret;
};

module.exports = getJwtSecret;
