import express from 'express';
import { jwtAuthMiddleware } from '../auth/index.js';
import MessageModel from './schema.js';
import ConversationModel from '../conversations/schema.js';
import { v2 as cloudinary } from 'cloudinary';
import multer from 'multer';
import { CloudinaryStorage } from 'multer-storage-cloudinary';
import { extname } from 'path';

const cloudStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: { folder: 'RideSharingApp' },
});

const cloudMulter = multer({
  storage: cloudStorage,

  fileFilter: function (req, file, next) {
    const acceptedExtensions = ['.png', '.jpg', '.gif', '.bmp', '.jpeg'];
    if (!acceptedExtensions.includes(extname(file.originalname))) {
      return next(
        new ErrorResponse(
          `Image type not allowed: ${extname(file.originalname)}`
        )
      );
    }
    next(null, true);
  },
});

const router = express();

router.post(
  '/',
  cloudMulter.single('picture'),
  jwtAuthMiddleware,
  async (req, res, next) => {
    try {
      let newMessage = new MessageModel(req.body);
      if (req.file) {
        newMessage.picture = req.file.path;
      }

      if (req.body.location === true) {
        newMessage.picture =
          'https://www.dwrl.utexas.edu/wp-content/uploads/2016/11/google-maps-new-interface1.jpg';
      }
      const newMessageSaved = await newMessage.save();

      await ConversationModel.findOneAndUpdate(
        { _id: newMessageSaved.conversationId },
        {
          $push: {
            messages: newMessageSaved,
          },
        },
        { runValidators: true, new: true }
      );
      res.status(201).send(newMessage);
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
);

router.get('/', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const messages = await MessageModel.find().populate('sender', [
      'username',
      'profilePic',
    ]);
    res.status(200).send(messages);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.put('/:messageId', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const messageToUpdate = await MessageModel.findByIdAndUpdate(
      req.params.messageId,
      {
        ...req.body,
        edited: true,
      },
      { runValidators: true, new: true }
    );
    res.status(201).send(messageToUpdate);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.delete('/:messageId', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const messageToDelete = await MessageModel.findByIdAndUpdate(
      { _id: req.params.messageId },
      {
        $set: { text: '', deleted: true },
      },
      { runValidators: true, new: true }
    );
    res.status(204).send(messageToDelete);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

export default router;
