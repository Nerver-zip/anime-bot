const mongoose = require('mongoose');

const animeItemSchema = new mongoose.Schema({
  id: { type: Number, required: true },      
  name: { type: String, required: true }     
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