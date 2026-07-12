const mongoose = require('mongoose');

const ScriptSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: { type: String, required: true },
    code: { type: String, required: true }, // Kopyalanacak Lua kodu
    image: { type: String, required: true }, // Fotoğraf dosya yolu
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Script', ScriptSchema);
