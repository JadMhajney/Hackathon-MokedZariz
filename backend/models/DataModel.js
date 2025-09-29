const mongoose = require('mongoose');

const dataSchema = new mongoose.Schema({
  voice: {
    type: String,
    required: false
  },
  video: {
    type: String,
    required: false
  },
  text: {
    type: String,
    required: false,
    default: 'Emergency call'
  },
  gpsCoords: {
    latitude: {
      type: Number,
      required: true
    },
    longitude: {
      type: Number,
      required: true
    }
  },
  score: {
    type: Number,
    required: false,
    default: 5,
    min: 1,
    max: 10
  }
}, {
  timestamps: true // This automatically adds createdAt and updatedAt fields
});

// Add indexes for better query performance
dataSchema.index({ createdAt: -1 });
dataSchema.index({ score: 1 });
dataSchema.index({ 'gpsCoords.latitude': 1, 'gpsCoords.longitude': 1 });

const DataModel = mongoose.model('Data', dataSchema);

module.exports = DataModel;