import { Router } from 'express';
import TripModel from './schema.js';
import UserModel from '../users/schema.js';
import { jwtAuthMiddleware } from '../auth/index.js';
import mongoose from 'mongoose';
import q2m from 'query-to-mongo';

const router = Router();

router.post('/', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const newTrip = new TripModel({ ...req.body, owner: req.user._id });
    const newTripAdded = await newTrip.save();
    await UserModel.findOneAndUpdate(
      { _id: newTripAdded.owner },
      {
        $push: {
          trips: newTrip._id,
        },
      },
      { runValidators: true, new: true }
    );
    res.status(201).send(newTripAdded._id);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get('/', async (req, res, next) => {
  try {
    const query = q2m(req.query);
    let date = query.criteria.departureDate;
    const dateString = date.getDate().toString();
    const monthString = (date.getMonth() + 1).toString();
    const yearString = date.getFullYear();
    const fullDate = `${yearString}-${
      monthString.length === 1 ? `0${monthString}` : `${monthString}`
    }-${dateString.length === 1 ? `0${dateString}` : `${dateString}`}`;
    query.criteria.departureDate = fullDate.toString();
    let maxSeatsLeft = query.criteria.seatsLeft;
    query.criteria.seatsLeft = { $gte: maxSeatsLeft }; // Do this to find trips with minimum required seats or more

    const trips = await TripModel.find(query.criteria)
      .populate('owner')
      .populate('participants._id');
    res.status(200).send(trips);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const trip = await TripModel.findById(req.params.id)
      .populate('owner')
      .populate('participants._id');
    if (!trip) {
      const error = new Error();
      error.httpStatusCode = 404;
      next(error);
    }
    res.status(200).send(trip);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.put('/:tripId/cancel', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const trip = await TripModel.findOneAndUpdate(
      { _id: req.params.tripId },
      [{ $set: { cancelled: { $eq: [false, '$cancelled'] } } }],
      { runValidators: true, new: true }
    );
    res.status(201).send(trip);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.delete('/:tripId', jwtAuthMiddleware, async (req, res, next) => {
  try {
    //  Send a notification to each participant that the trip was cancelled, thats why we need participants
    const trip = await TripModel.findById(req.params.tripId);
    const isMatch = trip.owner.equals(req.user._id);
    if (isMatch) {
      const allParticipants = [...trip.participants, req.user._id];

      allParticipants.forEach(async (participant) => {
        await UserModel.findOneAndUpdate(
          { _id: participant },
          {
            $pull: {
              trips: req.params.tripId,
            },
          },
          {
            runValidators: true,
            new: true,
          }
        );
      });
      const tripToDelete = await TripModel.findByIdAndDelete(req.params.tripId);
      res.status(204).send('Trip deleted');
    } else {
      res.status(403).send('Action not authorized');
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

// ************************ Adding or deleting participants to a trip *********************

router.post('/:tripId', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const trip = await TripModel.findById(req.params.tripId);
    if (
      !trip.participants.some(
        (participant) => participant._id.toString() === req.user._id.toString()
      )
    ) {
      await TripModel.findOneAndUpdate(
        { _id: req.params.tripId },
        {
          $push: {
            participants: {
              _id: req.user._id,
              tickets: req.body.tickets,
            },
          },
          $inc: {
            seatsLeft: -req.body.tickets,
          },
        },
        { runValidators: true, new: true }
      );
      await UserModel.findOneAndUpdate(
        { _id: req.user._id },
        {
          $push: {
            trips: req.params.tripId,
          },
        },
        { runValidators: true, new: true }
      );
      res.status(201).send();
    } else {
      const existingTickets = trip.participants.find(
        (participant) => participant._id.toString() === req.user._id.toString()
      ).tickets;
      const ticketsTotal =
        parseInt(existingTickets) + parseInt(req.body.tickets);
      await TripModel.findOneAndUpdate(
        {
          _id: req.params.tripId,
          'participants._id': mongoose.Types.ObjectId(req.user._id),
        },
        {
          $set: {
            'participants.$.tickets': ticketsTotal,
          },
          $inc: {
            seatsLeft: -req.body.tickets,
          },
        },
        { runValidators: true, new: true }
      );
      res.status(201).send();
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.put('/:tripId/refund', jwtAuthMiddleware, async (req, res, next) => {
  const trip = await TripModel.findById(req.params.tripId);
  const existingTickets = trip.participants.find(
    (participant) => participant._id.toString() === req.user._id.toString()
  ).tickets;
  const ticketsTotal = parseInt(existingTickets) - 1;
  if (ticketsTotal === 0) {
    try {
      await TripModel.findOneAndUpdate(
        { _id: req.params.tripId },
        {
          $pull: {
            participants: {
              _id: req.user._id,
            },
          },
          $inc: {
            seatsLeft: 1,
          },
        },
        { runValidators: true, new: true }
      );

      await UserModel.findOneAndUpdate(
        { _id: req.user._id },
        {
          $pull: {
            trips: req.params.tripId,
          },
        },
        { runValidators: true, new: true }
      );

      res.status(201).send();
    } catch (error) {
      console.log(error);
      next(error);
    }
  } else {
    await TripModel.findOneAndUpdate(
      {
        _id: req.params.tripId,
        'participants._id': mongoose.Types.ObjectId(req.user._id),
      },
      {
        $set: {
          'participants.$.tickets': ticketsTotal,
        },
        $inc: {
          seatsLeft: 1,
        },
      },
      { runValidators: true, new: true }
    );
    res.status(201).send();
  }
});

export default router;
