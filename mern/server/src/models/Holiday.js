const mongoose = require('mongoose');

/** Mirrors the "Holiday list" sheet — used to skip reminder mails on holidays. */
const holidaySchema = new mongoose.Schema(
  {
    date: { type: Date, required: true, unique: true },
    name: { type: String, default: '' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Holiday', holidaySchema);
