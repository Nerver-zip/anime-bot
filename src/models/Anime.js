const mongoose = require('mongoose');

const animeSchema = new mongoose.Schema({
  mal_id: { type: Number, required: true, unique: true },
  imageUrl: { type: String },
  title: { type: String, required: true },
  notify: [String],
  schedule: {
    day: { type: String, required: true },        
    time: { type: String, required: true },       
    timezone: { type: String, default: 'Asia/Tokyo' }
  },
  lastNotified: { type: Date, default: null }
});

module.exports = mongoose.model('Anime', animeSchema);