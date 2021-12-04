require('dotenv').config()
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');

// Passport packages
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
//
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;
const findOrCreate = require('mongoose-findorcreate');

const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true
}));

// I. Initializing the session:

// 1. Adding session to program

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
}));

// 2. initialize the session to take place.

app.use(passport.initialize());
app.use(passport.session());

// Session initialized

mongoose.connect("mongodb://localhost:27017/secretsDB");

app.set('view engine', 'ejs');

// II. Creating new passport for local mongoose schema after session initialization:

// 1. Create new schema

const userSchema = new mongoose.Schema({
  email: String,
  password: String,
  googleId: String,
  facebookId: String,
  secret: String
});

// 2. Adding a passport plugin to mongoose.

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);

// 3. Create new user model for passport

const User = new mongoose.model("User", userSchema);

// 4. Create new strategy

passport.use(User.createStrategy());

// 5. serializeUser for creating a protected key and deserializeUser to open the protected key.

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(user, done) {
  done(null, user);
});

// Creation ends in deserialization.

passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: "http://localhost:3000/auth/google/secrets",
    userProfileURL: "https://www.googleapis.com/oauth2/v3/userinfo"

  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

passport.use(new FacebookStrategy({
    clientID: process.env.FACEBOOK_APP_ID,
    clientSecret: process.env.FACEBOOK_APP_SECRET,
    callbackURL: "http://localhost:3000/auth/facebook/secrets"
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req, res){
  res.render("home");
});

app.get("/auth/google",
  passport.authenticate("google", { scope: ["profile"] })
);

app.get("/auth/google/secrets",
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/secrets");
  });

app.get("/auth/facebook",
  passport.authenticate("facebook"));

app.get("/auth/facebook/secrets",
  passport.authenticate("facebook", { failureRedirect: "/login" }),
  function(req, res) {
    res.redirect("/secrets");
  });

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
});

app.get("/login", function(req, res){
  res.render("login");
});

// Made with bcrypt
// app.post("/login", function(req, res){
//   const username = req.body.username;
//   const password = req.body.password;
//   User.findOne({email: username}, function(err, foundResult){
//     if(!err){
//       if(foundResult){
//         bcrypt.compare(password, foundResult.password, function(err, result) {
//           if(result === true){
//             res.redirect("/secrets");
//           }
//         });
//       }
//     }
//   });
// });

app.post("/login", function(req, res){
  const user = new User ({
    username: req.body.username,
    password: req.body.password
  })
  req.login(user, function(err) {
    if(!err) {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets")
      });
    } else {
      console.log(err);
    }
  });
});

app.get("/register", function(req, res){
  res.render("register");
});

app.get("/secrets", function(req, res){
  User.find({"secret": {$ne: null}}, function(err, foundUser){
    if(err){
      console.log(err);
    } else {
      if(foundUser) {
        res.render("secrets", {usersWithSecrets: foundUser});
      }
    }
  })
});

app.get("/submit", function(req, res){
  if(req.isAuthenticated()) {
    res.render("submit");
  } else {
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;
  console.log(req.user);
  User.findById(req.user._id, function(err, foundUser){
    if(err) {
      console.log(err);
    } else {
      if(foundUser){
        foundUser.secret = submittedSecret;
        foundUser.save(function(){
          res.redirect("/secrets");
        });
      }
    }
  });
});

// Made on bcrypt
// app.post("/register", function(req,res){
//   bcrypt.hash(req.body.password, saltRounds, function(err, hash) {
//     const newUser = new User({
//       email: req.body.username,
//       password: hash
//     });
//     newUser.save(function(err){
//       if(!err){
//         res.redirect("/secrets");
//       }
//     });
//   });
// });

// Made on passportLocalMongoose

app.post("/register", function(req, res) {
  User.register({username:req.body.username} , req.body.password , function(err, user) {
    if(err) {
      console.log(err);
      res.redirect("/register");
    } else {
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets")
      });
    }
  });
});

app.listen(3000, function(req, res){
  console.log("Server has been started in port 3000 successfully.");
});
