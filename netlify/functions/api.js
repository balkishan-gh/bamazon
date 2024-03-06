require("dotenv").config();

const path = require("path");

const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const csrf = require("csurf");
const flash = require("connect-flash");
const multer = require("multer");
const { v4: uuidv4 } = require("uuid");
const serverless = require("serverless-http");

const errorController = require("../../controllers/error");
const User = require("../../models/user");

// const MONGODB_URI =
//   process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/bamazonDB";

const MONGODB_URI = process.env.MONGODB_URI;

const api = express();
const store = new MongoDBStore({
  uri: MONGODB_URI,
  collection: "sessions",
});
const csrfProtection = csrf();

const fileStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "images");
  },
  filename: (req, file, cb) => {
    cb(null, uuidv4() + "-" + file.originalname);
  },
});

const fileFilter = (req, file, cb) => {
  if (
    file.mimetype === "image/png" ||
    file.mimetype === "image/jpg" ||
    file.mimetype === "image/jpeg"
  ) {
    cb(null, true);
  } else {
    cb(null, false);
  }
};

api.set("view engine", "ejs");
api.set("views", "views");

const adminRoutes = require("../../routes/admin");
const shopRoutes = require("../../routes/shop");
const authRoutes = require("../../routes/auth");

api.use(bodyParser.urlencoded({ extended: false }));
api.use(
  multer({ storage: fileStorage, fileFilter: fileFilter }).single("image")
);
api.use(express.static(path.join(__dirname, "public")));
api.use("/images", express.static(path.join(__dirname, "images")));
api.use(
  session({
    secret: "my secret",
    resave: false,
    saveUninitialized: false,
    store: store,
  })
);
api.use(csrfProtection);
api.use(flash());

api.use((req, res, next) => {
  console.log("Hi Bal Kishan");
  next();
});

api.use((req, res, next) => {
  res.locals.isAuthenticated = req.session.isLoggedIn;
  res.locals.csrfToken = req.csrfToken();
  next();
});

api.use((req, res, next) => {
  // throw new Error('Sync Dummy');
  if (!req.session.user) {
    return next();
  }
  User.findById(req.session.user._id)
    .then((user) => {
      if (!user) {
        return next();
      }
      req.user = user;
      next();
    })
    .catch((err) => {
      next(new Error(err));
    });
});

api.use("/admin", adminRoutes);
api.use(shopRoutes);
api.use(authRoutes);

api.get("/500", errorController.get500);

api.use(errorController.get404);

api.use((error, req, res, next) => {
  // res.status(error.httpStatusCode).render(...);
  // res.redirect('/500');
  res.status(500).render("500", {
    pageTitle: "Error!",
    path: "/500",
    isAuthenticated: req.session.isLoggedIn,
  });
});

// const PORT = process.env.PORT || 3000;

mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then((result) => {
    // api.listen(3000);
    console.log("Connected");
  })
  .catch((err) => {
    console.log(err);
  });

const handler = serverless(api);

module.exports = handler;
