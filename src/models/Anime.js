const mongoose = require('mongoose');

const animeSchema = new mongoose.Schema({
  mal_id: {type: String, required: true, unique: true },
  imageUrl: { type: String, required: false },
  titulo: { type: String, required: true, unique: true },
  notificar: [String],
  ultimo_episodio: { type: Number, default: 0 }
});

module.exports = mongoose.model('Anime', animeSchema);
