const mongoose = require("mongoose");
const Listing = require("../models/violations.js");

const MONGO_URL = "mongodb://127.0.0.1:27017/edi";

main().then(() =>{
    console.log("connected to DB");
})
.catch((err) => {
    console.log(err);
})

async function main() {
    await mongoose.connect(MONGO_URL)
}

const initDB = async () => {
    await Listing.deleteMany({});
    await Listing.insertMany(initData.data);
    console.log("data was inititalised");

}

initDB();