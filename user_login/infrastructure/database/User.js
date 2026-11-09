import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    nombre: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },

    password: {
      type: String,
      required: true
    },

    fechaRegistro: {
      type: Date,
      default: Date.now
    },

    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },

    resetPasswordToken: {
      type: String,
      default: null
    },

    resetPasswordExpires: {
      type: Date,
      default: null
    }
  },
  {
    versionKey: false
  }
);

const User = mongoose.model("User", userSchema);

export default User;