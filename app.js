//jshint esversion:6
require('dotenv').config()
const express = require('express')
const bodyParser = require('body-parser')
const ejs = require('ejs')
const mongoose = require('mongoose')
const encrypt = require('mongoose-encryption')

const app = express()

app.use(bodyParser.urlencoded({extended:true}))
app.use(express.static('public'))
app.set('view engine', 'ejs')

mongoose.connect('mongodb+srv://pthnhung:nh14072002@clusterie213.yj32h3e.mongodb.net/userDB')

const userSchema = new mongoose.Schema({
    username: {
        type: String,
        unique: true
    },
    password: String
})

userSchema.plugin(encrypt, { secret: process.env.SECRET, encryptedFields: ['password']});

const User = mongoose.model("User", userSchema)

app.get("/",(req, res)=>{
    res.render('home')
})

app.get("/login",(req, res)=>{
    res.render('login')
})

app.get("/register",(req, res)=>{
    res.render('register')
})

app.post("/register", (req, res)=>{
    try {
        console.log(req.body)
        const newUser = new User({
            username: req.body.username,
            password: req.body.password
        })
        newUser.save()
        res.redirect("/")
    } catch (error) {
        res.send(error)
    }
})

app.post("/login",(req, res)=>{
    User.findOne({username: req.body.username}).then((user)=>{
        if(req.body.password === user.password) {
            res.render('secrets')
        } else {
            console.log("Password is wrong!")
            res.render('login')
        }
    }).catch(err=>{
        console.log("Username is not exist")
        res.render('login')
    })
})

app.listen(3000, ()=>{
    console.log("Server is running on port 3000.")
})