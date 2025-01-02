const mongoose = require("mongoose");
const { isEmail, contains } = require("validator");
const filter = require("../util/filter");
const deviceSchema = new mongoose.Schema({
  token: { type: String, required: true },
  type: { type: String, enum: ['web', 'mobile'], required: true },
  platform: { type: String, required: true },
});
const UserSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      minlength: [6, "Must be at least 6 characters long"],
      maxlength: [30, "Must be no more than 30 characters long"],
      validate: {
        validator: (val) => !contains(val, " "),
        message: "Must contain no spaces",
      },
      subscriptions: [Object], // For web push subscriptions
      devices: [deviceSchema],
    },
    email: {
      type: String,
      required: true,
      unique: true,
      validate: [isEmail, "Must be valid email address"],
    },
    password: {
      type: String,
      required: true,
      minLength: [8, "Must be at least 8 characters long"],
    },
    biography: {
      type: String,
      default: "",
      maxLength: [250, "Must be at most 250 characters long"],
    },
    isAdmin: {
      type: Boolean,
      default: false,
    },
    socialPoints: { type: Number, default: 0 }, // Add socialPoints field
    resetToken: { type: String }, // Token for password reset
    resetTokenExpiration: { type: Date }, // Expiration for the reset token
  },

  { timestamps: true }
);

UserSchema.pre("save", function (next) {
  if (filter.isProfane(this.username)) {
    throw new Error("Username cannot contain profanity");
  }

  if (this.biography.length > 0) {
    this.biography = filter.clean(this.biography);
  }

  next();
});



const User = mongoose.model('User', UserSchema);

module.exports = mongoose.model("user", UserSchema);
