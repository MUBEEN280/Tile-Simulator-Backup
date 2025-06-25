const mongoose = require("mongoose");

const tileSubmissionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true },
  phoneNumber: { type: String, required: true },
  referenceNumber: { type: String, required: true },
  tileQuantity: { type: Number, required: true },
  tileSize: { type: String, required: true },
  image: { type: String, required: true }, // Base64 encoded tile pattern image
  tilePatternImage: { type: String, required: true }, // base64 of tile grid preview
  tileConfig: { type: Object, required: true }, // JSON of all tile settings
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model("TileSubmission", tileSubmissionSchema);
