const connectDB = require("./config/db");
const express = require("express");
require("dotenv").config();
const path = require("path");
const session = require("express-session");
const passport = require("passport");

// Initialize passport configuration
require("./config/passport.js");

const getChatContextHistory = require("./routes/getChatContextHistory.js");
const postChat = require("./routes/postChat.js");
const postUser = require('./routes/postUser.js')
const googleAuth = require('./routes/googleAuth.js')
const login = require('./routes/login.js')
const getChatHistory = require('./routes/getChatHistory.js')
const verify = require('./routes/verify.js')
const postProfile = require('./routes/postProfile.js')
const getProfile = require('./routes/getProfile.js')
const logout = require('./routes/logout.js')
const resetPassword = require('./routes/resetPassword.js')
const editContext = require('./routes/editContext.js')
const deleteChat = require('./routes/deleteChat.js')
const serverWakeup = require('./routes/serverWakeup.js')
const postImageModel = require('./routes/postImageModel.js')
const cors = require("cors");
const cookieParser = require("cookie-parser");

const app = express();
app.set("trust proxy", 1);
app.use(
  cors({
    origin: ["http://localhost:5173", "https://jotishnitr.github.io"],
    credentials: true,
  }),
);

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cookieParser());
connectDB();

// Session & Passport Middlewares
app.use(
  session({
    secret: process.env.SESSION_SECRET || "axielai-session-secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    }
  })
);
app.use(passport.initialize());
app.use(passport.session());

app.use("/api", postChat);
app.use("/api", getChatContextHistory);
app.use("/api", postUser);
app.use('/auth', googleAuth);
app.use('/auth', login);
app.use('/auth', logout);
app.use('/api', getChatHistory);
app.use('/verify', verify);
app.use('/api', postProfile);
app.use('/api', getProfile);
app.use('/auth', resetPassword);
app.use('/api', editContext);
app.use('/api', deleteChat);
app.use('/api', serverWakeup);
app.use('/api', postImageModel);
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server is running on port ${PORT}`));
