const express= require("express");
const app = express();
const port = 8080;
const path = require("path");
const {v4:uuidv4} = require('uuid');
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");

const MONGO_URL = "mongodb://127.0.0.1:27017/edi";

main().then(() =>{
    console.log("connected to DB");
})
.catch((err) => {
    console.log(err);
});

async function main() {
    await mongoose.connect(MONGO_URL)
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname,"views"));
app.use(express.urlencoded({extended:true}));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));



app.use(express.static(path.join(__dirname, "public")));

let user = [
    {
        id: uuidv4(),
        username: "adam",
        password: "1234",
        role: "Admin"
    },
];

app.get("/home", (req,res) => {
    res.render("home.ejs",);
});


app.get("/login", (req,res) => {
    res.render("login.ejs", {user});
});

app.get("/admin", (req,res) => {
    let {name} = req.params;
    res.render("admin.ejs", {name});
});

app.get("/manager", (req,res) => {
    let {name} = req.params;
    res.render("manager.ejs", {name});
});

app.get("/employee", (req,res) => {
    let {role} = req.params;
    res.render("employee.ejs", {role});
});


//Add new violations:
app.get("/new", (req,res) => {
    res.render("violations/new.ejs");
});

// app.post("/new", async (req,res,next) => {
    
//     const newListing =  new Listing(req.body.listing);
//     await newListing.save();
//     req.flash("success", "New Listing Created!");
//     res.redirect("/manager");
//     }
// );

app.listen(port, () =>{
    console.log("Listening on port : 8080");
});

