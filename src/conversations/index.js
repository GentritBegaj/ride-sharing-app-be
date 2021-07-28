import express from 'express';
import { jwtAuthMiddleware } from '../auth/index.js';
import ConversationModel from './schema.js';
import UserModel from '../users/schema.js';

const router = express();

router.post('/', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const newConversation = new ConversationModel({
      members: [req.user._id, req.body.receiverId],
      membersLeft: [req.user._id, req.body.receiverId],
    });
    const newConversationSaved = await newConversation.save();
    newConversationSaved.members.forEach(async (member) => {
      await UserModel.findOneAndUpdate(
        { _id: member },
        { $push: { conversations: member } },
        { runValidators: true, new: true }
      );
    });
    res.status(201).send({ newConversationSaved });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

// *********************GET ALL CONVERSATIONS*****************************

// router.get('/', jwtAuthMiddleware, async (req, res, next) => {
//   try {
//     const conversations = await ConversationModel.find()
//       .populate('members', ['username', 'profilePic', 'bio', 'email'])
//       .populate('messages');
//     res.status(200).send(conversations);
//   } catch (error) {
//     console.log(error);
//     next(error);
//   }
// });

router.get('/', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const conversations = await ConversationModel.find({
      members: { $in: [req.user._id] },
    })
      .populate('members', ['username', 'profilePic', 'bio', 'email'])
      .populate('messages');
    res.status(200).send(conversations);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get('/filtered', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const conversations = await ConversationModel.find({
      $and: [
        {
          members: { $in: [req.user._id] },
        },
        {
          membersLeft: { $in: [req.user._id] },
        },
      ],
    })
      .populate('members', ['username', 'profilePic', 'bio', 'email'])
      .populate('messages');
    res.status(200).send(conversations);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get('/:conversationId', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const conversation = await ConversationModel.findById(
      req.params.conversationId
    )
      .populate('members', ['username', 'profilePic', 'bio', 'email'])
      .populate('messages');
    res.status(200).send(conversation);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.put(
  '/:conversationId/retrieveConversation',
  jwtAuthMiddleware,
  async (req, res, next) => {
    try {
      const conversationToRetrieve = await ConversationModel.findOneAndUpdate(
        { _id: req.params.conversationId },
        {
          $set: {
            membersLeft: [req.user._id, req.body.receiverId],
          },
        },
        { runValidators: true, new: true }
      );
      res.status(201).send(conversationToRetrieve);
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
);

router.delete('/:conversationId', jwtAuthMiddleware, async (req, res, next) => {
  try {
    await ConversationModel.findOneAndUpdate(
      { _id: req.params.conversationId },
      {
        $pull: {
          membersLeft: req.user._id,
        },
      },
      { runValidators: true, new: true }
    );
    // const updatedUser = await UserModel.findOneAndUpdate(
    //   { _id: req.user._id },
    //   { $pull: { conversations: req.params.conversationId } },
    //   { runValidators: true, new: true }
    // );
    res.status(204).send();
  } catch (error) {
    console.log(error);
    next(error);
  }
});

export default router;
