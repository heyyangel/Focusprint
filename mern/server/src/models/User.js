const mongoose = require('mongoose');

/**
 * Mirrors the "Doer List" sheet of the Apps Script workbook.
 *   A Person · B Passwords · C Role · D Email · E Mobile No. · F Department
 *   G Team (comma separated delegators) · H Reset OTP · I OTP Expiry
 */
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true, index: true },
    // Plaintext, as in the source spreadsheet. `select: false` only keeps it out
    // of ordinary queries — it is NOT encryption.
    password: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ['Admin', 'PC', 'Delegator', 'Delegatee', 'User'],
      default: 'Delegatee',
      trim: true,
    },
    email: { type: String, trim: true, lowercase: true, default: '' },
    mobile: { type: String, trim: true, default: '' },
    department: { type: String, trim: true, default: '' },
    // "Team" column — the delegator(s) this person reports to
    delegators: { type: [String], default: [] },
    isActive: { type: Boolean, default: true },
    resetOtp: { type: String, default: '', select: false },
    otpExpiry: { type: Date, default: null, select: false },
  },
  { timestamps: true }
);

/**
 * Passwords are stored exactly as typed, mirroring column B of the "Doer List"
 * sheet — no hashing. Anyone with read access to this collection can therefore
 * read every user's real password; keep database credentials and backups
 * restricted accordingly.
 */
userSchema.methods.verifyPassword = async function verifyPassword(plain) {
  if (!this.password) return false;
  return this.password === String(plain);
};

userSchema.methods.toPublic = function toPublic() {
  return {
    id: this._id,
    name: this.name,
    role: this.role,
    email: this.email,
    department: this.department,
    delegators: this.delegators,
  };
};

module.exports = mongoose.model('User', userSchema);
