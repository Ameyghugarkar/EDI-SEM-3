const express= require("express");
const app = express();
const port = 8080;
const path = require("path");
const {v4:uuidv4} = require('uuid');



app.use(express.urlencoded({extended: true}));


app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static(path.join(__dirname, "public")));

let user = [
    {
        id: uuidv4(),
        username: "adam",
        password: "1234",
        role: "Admin"
    },
];




app.get("/login", (req,res) => {
    res.render("login.ejs", {user});
});

app.get("/login/name/admin", (req,res) => {
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




app.listen(port, () =>{
    console.log("Listening on port : 8080");
});

