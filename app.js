//jshint esversion:6
require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const mongoose = require('mongoose')
// const encrypt = require('mongoose-encryption')
// const md5 = require('md5');
// const bcrypt = require('bcrypt')
// const saltRounds = 10;
const session = require('express-session')
const passport = require('passport')
const passportLocalMongoose = require('passport-local-mongoose')
const GoogleStrategy = require('passport-google-oauth20').Strategy
const findOrCreate = require("mongoose-findorcreate")
const FacebookStrategy = require('passport-facebook')

const app = express()

app.use(bodyParser.urlencoded({extended:true}))
app.use(express.static('public'))
app.set('view engine', 'ejs')

app.use(session({
    secret: "Our little secret.",
    resave: false,
    saveUninitialized: false
}))

app.use(passport.initialize())
app.use(passport.session())

mongoose.connect(process.env.CONNECT_MONGODB_STRING)

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: false
    },
    password: String,
    googleId: String, 
    facebookId: String,
    secret: String
})

userSchema.plugin(passportLocalMongoose)
userSchema.plugin(findOrCreate)

// userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password']});

const User = mongoose.model("User", userSchema)

// use static authenticate method of model in LocalStrategy
passport.use(User.createStrategy());

// use static serialize and deserialize of model for passport session support
// passport.serializeUser(User.serializeUser());
// passport.deserializeUser(User.deserializeUser());

passport.serializeUser(function(user, done) {
    done(null, user.id);
})

passport.deserializeUser(function(id, done) {
    User.findById(id).then((user) => {
        done(null, user);
    }).catch((err) => {
        done(err, null);
    });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
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
    User.findOrCreate({ facebookId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/",(req, res)=>{
    res.render('home')
})

// cái dòng mã này nó giúp bật lên một cái cửa sổ cho phép mình đăng nhập bằng google
// tới rồi đó
app.get("/auth/google", passport.authenticate("google", {scope: ["profile"]}))

app.get("/auth/google/secrets", 
  passport.authenticate("google", { failureRedirect: "/login" }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect("/secrets");
});

app.get('/auth/facebook',
  passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
  passport.authenticate('facebook', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });

app.get("/login",(req, res)=>{
    res.render('login')
})

app.get("/register",(req, res)=>{
    res.render('register')
})

app.get("/secrets", (req, res)=>{
    if(req.isAuthenticated()){
        User.find({secret: {$ne: null}}).then(lstUsers=>{
            let length = lstUsers.length;
            let randomId = Math.floor(length*Math.random())
            res.render("secrets", {
                user: lstUsers[randomId],
            })
        })
    } else {
        res.redirect("/login")
    }
})

app.get("/submit",(req, res)=>{
    res.render("submit")
})

app.post("/submit",(req, res)=>{
    const newSecret = req.body.secret;
    console.log(req.user)
    console.log(newSecret)
    User.findByIdAndUpdate(req.user._id, { $set: { secret: newSecret }}).then(user => {
        console.log(user);
        res.redirect("/secrets")
    }).catch(err=>console.log(err))
})

app.post("/register", (req, res)=>{
    User.register({username: req.body.username}, req.body.password, function(err, user) {
        if (err) { 
            console.log(err)
            res.redirect("/register");
         } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect('/secrets')
            })
         }
      });
})

app.post("/login",(req, res)=>{
    const user = new User({
        username: req.body.username,
        password:req.body.password
    })

    req.login(user, (err)=>{
        if(err){
            console.log(err)
        } else {
            passport.authenticate("local")(req, res, function(){
                res.redirect('/secrets')
            })
        }
    })
})

app.get("/logout", (req, res)=>{
    req.logout(() => {
        res.redirect('/');
    });
})

app.listen(3000, ()=>{
    console.log("Server is running on port 3000.")
})