import mongoose from 'mongoose';

const { Schema, model } = mongoose;

const TripSchema = new Schema(
  {
    originCity: { type: String, required: true },
    destinationCity: { type: String, required: true },
    owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    // participants: [{ type: Schema.Types.ObjectId, ref: 'User' }],
    participants: [
      {
        _id: { type: Schema.Types.ObjectId, ref: 'User' },
        tickets: { type: Number },
      },
    ],
    maxParticipants: { type: String, required: true },
    seatsLeft: {
      type: Number,
      default: function () {
        return this.maxParticipants;
      },
    },
    departureDate: { type: String, required: true },
    arrivalDate: { type: String, required: true },
    departureTime: { type: String, required: true },
    arrivalTime: { type: String, required: true },
    pricePerPerson: { type: Number, required: true },
    description: { type: String },
    vehicleType: {
      type: String,
      enum: ['Car', 'Mini-Bus'],
    },
    cancelled: { type: Boolean, default: false },
    completed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default model('Trip', TripSchema);
