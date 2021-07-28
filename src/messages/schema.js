import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const MessageSchema = new Schema(
  {
    conversationId: { type: String, required: true },
    sender: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String },
    edited: { type: Boolean, default: false },
    deleted: { type: Boolean, default: false },
    picture: { type: String },
    location: { type: Boolean, default: false },
    latitude: { type: Number },
    longitude: { type: Number },
  },
  { timestamps: true }
);

export default model('Message', MessageSchema);
