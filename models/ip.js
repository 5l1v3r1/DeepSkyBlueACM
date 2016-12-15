var mongoose = require("mongoose");

var IPSchema = new mongoose.Schema({
        ip:String,
        cheat:Number,
        banned:Boolean
    },
    {timestamps:true}
);

module.exports = mongoose.model("IP", IPSchema);

