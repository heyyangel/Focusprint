const mongoose = require('mongoose');

/** Atomic sequence source for Task-N ids (replaces the sheet's max-id scan). */
const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

counterSchema.statics.next = async function next(key, count = 1) {
  const doc = await this.findByIdAndUpdate(
    key,
    { $inc: { seq: count } },
    { new: true, upsert: true }
  );
  // Returns the first number of the reserved block.
  return doc.seq - count + 1;
};

module.exports = mongoose.model('Counter', counterSchema);
