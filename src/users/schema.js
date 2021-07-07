import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import { ReviewSchema } from '../reviews/schema.js';

const { Schema, model } = mongoose;

const UserSchema = new Schema(
  {
    username: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String },
    dateOfBirth: { type: Date },
    profilePic: { type: String },
    trips: [{ type: Schema.Types.ObjectId, ref: 'Trip' }],
    googleId: { type: String },
    refreshToken: { type: String },
    reviews: [ReviewSchema],
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  const user = this;

  const plainPW = user.password;

  if (user.isModified('password')) {
    user.password = await bcrypt.hash(plainPW, 10);
  }
});

UserSchema.methods.toJSON = function () {
  const user = this;
  const userObject = user.toObject();

  delete userObject.password;
  delete userObject.__v;
  delete userObject.refreshToken;

  return userObject;
};

UserSchema.statics.checkCredentials = async function (email, password) {
  const user = await this.findOne({ email });

  if (user) {
    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) return user;
    else return null;
  } else return null;
};

export default model('User', UserSchema);
