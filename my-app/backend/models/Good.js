const mongoose = require("mongoose");

const goodSchema = new mongoose.Schema({
    itemid: {type: String, required: true, unique: true},
    name: {type: String, required: true},
    price: {type: Number, required: true},
    brand: {type: String, required: true},
    category: {type: String, required: true},
    countInStock: {type: Number, required: true},
    type: {type: String, required: true},
    description: {type: String, required: true},
    rating: {type: Number, required: true},
    numReviews: {type: Number, required: true},
    imageUrl: [],
}, { timestamps: true, collection: "Good_Info" }); 

module.exports = mongoose.model("Good", goodSchema);

