var mongoose = require("mongoose");

var PlayerSchema = new mongoose.Schema({
    name:String,
    score:Number,
    sharetoken:String
},
    {timestamps:true}
);

module.exports = mongoose.model("Player", PlayerSchema);

