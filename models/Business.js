const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
    reviewText: { type: String, required: true },
    starRating: { type: Number, required: true },
    sentiment: { 
        type: Object, 
        default: null 
    },
    upvotes: { type: Number, default: 0 },
    downvotes: { type: Number, default: 0 },
    timestamp: { type: Date, default: Date.now },
});


const businessSchema = new mongoose.Schema({
    b_name: { type: String, required: true },
  description: { type: String, required: true },
  category: { type: String, required: true },
  location: {
    type: {
      type: String,
      enum: ['Point'], // GeoJSON requires the type to be 'Point'
      required: true,
    },
    coordinates: {
      type: [Number], // Array of numbers: [lng, lat]
      required: true,
    },
  },
    reviews: [reviewSchema], // Embed reviews as an array
});


module.exports = mongoose.model('Business', businessSchema);
