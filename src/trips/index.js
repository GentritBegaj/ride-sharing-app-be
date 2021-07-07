import { Router } from 'express';
import TripModel from './schema.js';
import UserModel from '../users/schema.js';
import { jwtAuthMiddleware } from '../auth/index.js';
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
    // console.log(query, 'AAAAAAAA');
    let date = query.criteria.departureDate;
    const dateString = date.getDate().toString();
    const monthString = (date.getMonth() + 1).toString();
    const yearString = date.getFullYear();
    const fullDate = `${yearString}-${
      monthString.length === 1 ? `0${monthString}` : `${monthString}`
    }-${dateString.length === 1 ? `0${dateString}` : `${dateString}`}`;
    query.criteria.departureDate = fullDate.toString();
    let maxParticipantsHighest = query.criteria.maxParticipants;
    query.criteria.maxParticipants = { $gte: maxParticipantsHighest }; // Do this to find trips with minimum required seats or more

    const trips = await TripModel.find(query.criteria).populate('owner');
    res.status(200).send(trips);
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
    const tripToUpdate = await TripModel.findOneAndUpdate(
      { _id: req.params.tripId },
      {
        $push: {
          participants: req.body.participant,
        },
      },
      { runValidators: true, new: true }
    );
    await UserModel.findOneAndUpdate(
      {
        _id: req.body.participant,
      },
      {
        $push: {
          trips: req.params.tripId,
        },
      },
      { runValidators: true, new: true }
    );
    if (!tripToUpdate) {
      throw new Error('Trip not found');
    }
    res.status(201).send(tripToUpdate);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

export default router;
