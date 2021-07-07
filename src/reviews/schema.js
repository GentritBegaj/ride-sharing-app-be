import mongoose from "mongoose";

const { Schema, model } = mongoose;

export const ReviewSchema = new Schema({
  text: { type: String, required: true },
  rating: { type: Number, required: true, min: 1, max: 5 },
  user: { type: Schema.Types.ObjectId, ref: "User" },
  createdAt: { type: Date, default: new Date() },
  updatedAt: { type: Date },
});

export default model("Review", ReviewSchema);
