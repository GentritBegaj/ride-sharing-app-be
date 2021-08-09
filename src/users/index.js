import { Router } from 'express';
import { jwtAuthMiddleware } from '../auth/index.js';
import { authenticate } from '../auth/tools.js';
import UserModel from './schema.js';
import ReviewModel from '../reviews/schema.js';
import mongoose from 'mongoose';
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

const router = Router();

router.post('/register', async (req, res, next) => {
  try {
    const newUser = new UserModel(req.body);
    const newUserAdded = await newUser.save();
    res.status(201).send(newUserAdded._id);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await UserModel.checkCredentials(email, password);

    if (user) {
      const tokens = await authenticate(user);
      // res.cookie('accessToken', JSON.stringify(localeObj), {
      //   // maxAge: new Date() * 0.001 + 300,
      //   domain: 'rideshareapp.xyz',
      //   secure: true,
      //   sameSite: 'none',
      // });
      res.cookie('accessToken', tokens.accessToken, {
        maxAge: new Date() * 0.001 + 300,
        domain: 'web.rideshareapp.xyz',
        secure: true,
        sameSite: 'none',
        // httpOnly: true,
      });
      res.cookie('refreshToken', tokens.refreshToken, {
        domain: 'web.rideshareapp.xyz',
        secure: true,
        sameSite: 'none',
        // httpOnly: true,
      });
      res.status(200).send({
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      });
    } else {
      res.status(401).send('Error while logging in');
    }
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get('/logout', jwtAuthMiddleware, async (req, res, next) => {
  try {
    res.clearCookie('accessToken');
    res.clearCookie('refreshToken');
    req.user.refreshToken = '';
    await req.user.save();
    res.send('Logged out');
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get('/', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const users = await UserModel.find().populate('trips');
    res.status(200).send(users);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get('/me', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const user = req.user;
    if (!user) {
      throw new Error();
    }
    res.status(200).send(user);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const user = await UserModel.findById(req.params.id)
      .populate('trips')
      .populate({
        path: 'reviews',
        populate: {
          path: 'user',
          select: ['username', 'profilePic', 'email', '_id'],
        },
      });
    if (!user) {
      throw new Error();
    }
    res.status(200).send(user);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.put(
  '/me',
  jwtAuthMiddleware,
  cloudMulter.single('profilePic'),
  async (req, res, next) => {
    try {
      if (req.body) {
        const updates = Object.keys(req.body);
        updates.forEach((update) => (req.user[update] = req.body[update]));
      }

      if (req.file) {
        req.user.profilePic = req.file.path;
      }

      await req.user.save();
      res.status(201).send(req.user);
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
);

router.delete('/me', jwtAuthMiddleware, async (req, res, next) => {
  try {
    await req.user.deleteOne();
    res.status(204).send();
  } catch (error) {
    console.log(error);
    next(error);
  }
});

// ***************************Reviews************************

router.post('/:userId', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const review = new ReviewModel({
      ...req.body,
      user: req.user._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const updatedUser = await UserModel.findOneAndUpdate(
      { _id: req.params.userId },
      {
        $push: {
          reviews: review,
        },
      },
      { runValidators: true, new: true }
    );

    if (!updatedUser) {
      throw new Error('User not found');
    }
    res.status(201).send(updatedUser);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.put('/:userId/:reviewId', jwtAuthMiddleware, async (req, res, next) => {
  try {
    const updatedUser = await UserModel.findOneAndUpdate(
      {
        _id: req.params.userId,
        'reviews._id': req.params.reviewId,
      },
      {
        $set: {
          'reviews.$': {
            ...req.body,
            _id: req.params.reviewId,
            user: req.user._id,
            updatedAt: new Date(),
          },
        },
      },
      { runValidators: true, new: true }
    );
    res.status(201).send(updatedUser);
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.delete(
  '/:userId/:reviewId',
  jwtAuthMiddleware,
  async (req, res, next) => {
    try {
      const updatedUser = await UserModel.findOneAndUpdate(
        {
          _id: req.params.userId,
        },
        {
          $pull: {
            reviews: { _id: mongoose.Types.ObjectId(req.params.reviewId) },
          },
        },
        { runValidators: true, new: true }
      );
      res.status(201).send(updatedUser);
    } catch (error) {
      console.log(error);
      next(error);
    }
  }
);

export default router;
