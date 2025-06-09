const mongoose = require('mongoose');

const animeSchema = new mongoose.Schema({
  titulo: { type: String, required: true, unique: true },
  favoritado_por: [String], // IDs dos usuários
  ultimo_episodio: { type: Number, default: 0 }
});

module.exports = mongoose.model('Anime', animeSchema);
