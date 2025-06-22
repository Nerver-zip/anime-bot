const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  user_id: { type: String, required: true, unique: true },

  lists: {
    type: Map,
    of: [Number],
    default: {}
  }
});

module.exports = mongoose.model('User', userSchema);