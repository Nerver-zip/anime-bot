const mongoose = require('mongoose');

const animeItemSchema = new mongoose.Schema({
  id: { type: Number, required: true }, // mal_id
  name: { type: String, required: true }, // title
  url: { type: String, required: true }, // MyAnimeList URL

  image_url: { type: String }, // capa do anime (JPG ou WebP)
  genres: { type: [String], default: [] }, // Ex: ['Action']
  themes: { type: [String], default: [] }, // Ex: ['Super Power']
  synopsis: { type: String }, // Descrição
  episodes: { type: Number }, // Ex: 24
  duration: { type: String }, // Ex: '24 min per ep'
  aired_from: { type: String }, // Ex: 'Apr 6, 2025'
  type: { type: String }, // Ex: 'ONA'
  rating: { type: String }, // Ex: 'PG-13 - Teens 13 or older'
  title_english: { type: String },
  title_japanese: { type: String }  
}, { _id: false });

const userSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },
  lists: {
    type: Map,
    of: [animeItemSchema],
    default: {}
  }
});

module.exports = mongoose.model('User', userSchema);
