const express = require('express');
const connectDB = require('./config/db');
const ejs = require('ejs');
const bodyParser = require('body-parser');
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require('passport');
const passportLocalMongoose = require('passport-local-mongoose');
const LocalStrategy = require('passport-local');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const findOrCreate=require('mongoose-findorcreate');

require('dotenv').config({path: './config/config.env'});
const app = express();

const PORT = process.env.PORT | 3000;

app.use(session({
  secret: 'keyboard cat',
  resave: false,
  saveUninitialized: true,
}));

app.use(passport.initialize());
app.use(passport.session());
app.use(express.static('public'));
app.set('view engine', 'ejs');
app.use(bodyParser.urlencoded(
    {extended: true}),
);

connectDB();

const schema=new mongoose.Schema({
  username: String,
  password: String,
  googleId: String,
});

schema.plugin(passportLocalMongoose);
schema.plugin(findOrCreate);
const Use= new mongoose.Model('User', schema);
passport.use(Use.createStrategy());

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  Use.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
  // clientID: process.env.id,
  // clientSecret: process.env.sec,
  callbackURL: 'www.google.com',
  userProfileURL: 'https://www.googleapis.com/oauth2/v3/userinfo',
},
function(accessToken, refreshToken, profile, cb) {
  console.log(profile);
  Use.findOrCreate({googleId: profile.id}, function(err, user) {
    return cb(err, user);
  });
},
));

app.get('/auth/google', passport.authenticate('google', {scope: ['profile']}));

app.get('/auth/google/secret', passport.authenticate(
    'google', {failureRedirect: '/login'}), function(req, res) {
  res.redirect('/secrets');
});

app.get('/login', function(req, res) {
  res.render('login');
});

app.get('/register', function(req, res) {
  res.render('register');
});

app.get('/', function(req, res) {
  res.render('home');
});

app.get('/secrets', function(req, res) {
  if (req.isAuthenticated()) {
    res.render('secrets');
  } else {
    console.log('bad');
    res.redirect('/login');
  }
});
app.post('/register', function(req, res) {
  Use.register(
      {username: req.body.username}, req.body.password, function(err, user) {
        if (err) {
          console.log(err);
          res.redirect('/register');
        } else {
          passport.authenticate('local')(req, res, function() {
            res.redirect('/secrets');
          });
        }
      });
});

app.post('/login', function(req, res) {
  const q=new Use({
    username: req.body.username,
    password: req.body.password,
  });
  req.login(q, function(err) {
    if (err) {
      console.log(err);
    } else {
      passport.authenticate('local')(req, res, function() {
        res.redirect('/secrets');
      });
    }
  });
});

app.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

app.get('/submit', function(req, res) {
  if (req.isAuthenticated()) {
    res.render('submit');
  } else {
    res.redirect('/login');
  }
});

app.post('/submit', function(req, res) {
  console.log(req.user);
});

app.listen(
    PORT,
    console.log(`Server running: ${process.env.NODE_ENV} mode on port ${PORT}`),
);
