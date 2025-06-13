const mongoose = require('mongoose');

const animeSchema = new mongoose.Schema({
  mal_id: {type: Number, required: true, unique: true },
  imageUrl: { type: String, required: false },
  title: { type: String, required: true},
  notify: [String],
  last_episode: { type: Number, default: 0 }
});

module.exports = mongoose.model('Anime', animeSchema);
