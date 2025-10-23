const express= require("express");
const app = express();
const port = 8080;
const path = require("path");
const {v4:uuidv4} = require('uuid');
const mongoose = require("mongoose");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const {ViolationSchema} = require("./schema.js");
// const ExpressError = require("../utils/ExpressError.js");
const Violation = require("./models/violations.js");
const multer = require("multer");
const upload = multer({
  dest: path.join(__dirname, 'uploads/'),
  limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

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

app.post("/manager",upload.single('evidence'), async (req,res,next) => {
    const newViolation = new Violation({
      employee: req.body.employee,
      category: req.body.category,
      location: req.body.location,
      description: req.body.description,
      correctiveAction: req.body.correctiveAction,
      evidencePath: req.file ? req.file.path : undefined,
      // add any other schema fields here...
    });
    await newViolation.save();
    // req.flash("success", "New Violation Created!");
    res.redirect("/manager");
    }
);

app.listen(port, () =>{
    console.log("Listening on port : 8080");
});

