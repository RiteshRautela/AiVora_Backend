const toPublicUser = (user) => ({
  _id: user._id,
  firstName: user.firstName,
  lastName: user.lastName,
  emailId: user.emailId,
  gender: user.gender,
  credits: user.credits,
  plan: user.plan,
});

module.exports = toPublicUser;
