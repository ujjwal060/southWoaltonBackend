const jwt = require("jsonwebtoken");
const createError = require("../middleware/error");
const createSuccess = require("../middleware/success");

const checkAuthentication = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return next(createError(401, "You are not authenticated"));
  }
  const token = authHeader.split(" ")[1];
  if (!token) {
    return next(createError(401, "Authentication token missing"));
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return next(createError(403, "Token is not valid"));
    }
    req.user = user; 
    next();
  });
};

const verifyToken = async (req, res, next) => {
  const token = req.cookies.access_token;
  console.log({ token });
  if (!token) {
    return next(createError(401, "You are not Authenticated"));
  }
  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return next(createError(403, "Token is not valid"));
    } else {
      req.user = user;
    }
    next();
  });
};

const verifyUser = (req, res, next) => {
  verifyToken(req, res, () => {
    // if (req.user.id === req.params.id || req.user.isAdmin) {
    //     next();
    // }
    // else {
    //     return next(createError(403, "You are not authorized!"));
    // }
    next();
  });
};

const verifyAdmin = (req, res, next) => {
  verifyToken(req, res, () => {
    // if (req.user.isAdmin) {
    //     next();
    // }
    // else {
    //     return next(createError(403, "You are not authorized!"));
    // }
    next();
  });
};

module.exports = { checkAuthentication, verifyToken, verifyUser, verifyAdmin };
