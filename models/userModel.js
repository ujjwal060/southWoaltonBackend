const mongoose = require("mongoose");
const Schema = mongoose.Schema;
const UserSchema = mongoose.Schema(
  {
    image: {
      type: String,
      required: false,
    },
    fullName: {
      type: String,
      required: true,
    },

    email: {
      type: String,
      required: true,
      unique: true,
      validate: {
        validator: function (v) {
          return /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/.test(v);
        },
        message: (props) => `${props.value} is not a valid email!`,
      },
    },
    phoneNumber: {
      type: Number,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    password: {
      type: String,
      required: true,
    },

    confirmPassword: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("User", UserSchema);
