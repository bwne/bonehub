const mongoose = require('mongoose');

const CategorySchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true } // Örn: Blox Fruits, Brookhaven
});

module.exports = mongoose.model('Category', CategorySchema);
