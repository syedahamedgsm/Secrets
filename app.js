require('dotenv').config()
const express = require('express');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

const app = express();

app.use(express.static("public"));
app.use(bodyParser.urlencoded({
  extended: true
}));

mongoose.connect("mongodb://localhost:27017/secretsDB");

app.set('view engine', 'ejs');

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

userSchema.plugin(encrypt, {secret:process.env.secret,  encryptedFields: ['password'] });

const User = new mongoose.model("User", userSchema);

app.get("/", function(req,res){
  res.render("home");
});

app.get("/login", function(req,res){
  res.render("login");
});

app.post("/login", function(req,res){
  const username = req.body.username;
  const password = req.body.password;
  User.findOne({email: username}, function(err, foundResult){
    if(!err){
      if(foundResult){
        if(foundResult.password === password){
          res.redirect("/secrets");
        }
      }
    }
  });
});

app.get("/register", function(req,res){
  res.render("register");
});

app.get("/secrets", function(req,res){
  res.render("secrets");
});

app.post("/register", function(req,res){
  const newUser = new User({
    email: req.body.username,
    password: req.body.password
  })
  newUser.save(function(err){
    if(!err){
      res.redirect("/secrets");
    }
  });

});

app.listen(3000, function(req,res){
  console.log("Server has been started in port 3000 successfully.");
});
