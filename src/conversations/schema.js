import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const ConversationSchema = new Schema(
  {
    members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    membersLeft: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    messages: [{ type: Schema.Types.ObjectId, ref: 'Message' }],
  },
  { timestamps: true }
);

export default model('Conversation', ConversationSchema);
