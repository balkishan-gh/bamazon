module.exports = (req, res, next) => {
  if (!req.session.isLoggedIn) {
    console("India" + req.session.isLoggedIn);
    return res.redirect("/login");
  }
  next();
};
