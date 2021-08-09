import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { Server } from 'socket.io';
import {
  notFoundErrorHandler,
  badRequestErrorHandler,
  forbiddenErrorHandler,
  catchAllErrorHandler,
  unauthorizedErrorHandler,
} from './errorHandlers.js';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import usersRoutes from './users/index.js';
import tripsRoutes from './trips/index.js';
import conversationsRoutes from './conversations/index.js';
import messagesRoutes from './messages/index.js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET);

const port = process.env.PORT || 3001;

const app = express();
const server = createServer(app);
app.use(cors({ origin: 'http://rideshareapp.xyz', credentials: true }));

const io = new Server(server, {
  allowEIO3: true,
  cors: {
    origin: 'http://rideshareapp.xyz',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
  },
});

app.use(express.json());
app.use(cookieParser());

app.use('/users', usersRoutes);
app.use('/trips', tripsRoutes);
app.use('/conversations', conversationsRoutes);
app.use('/messages', messagesRoutes);

// ********************************* SOCKET IO *******************************

let activeSockets = [];

io.on('connection', (socket) => {
  console.log(`User with socket ID ${socket.id} just connected`);

  socket.on('isOnline', ({ userID }) => {
    activeSockets = activeSockets.filter((u) => u.userId !== userID);
    activeSockets.push({ userId: userID, socketId: socket.id });

    io.sockets.emit('getUsers', activeSockets);
  });

  socket.on('sendMessage', (message) => {
    const userIntended = activeSockets.find(
      (u) => u.userId === message.receiverId
    );
    const sender = activeSockets.find((u) => u.userId === message.sender);
    if (sender && userIntended) {
      socket.emit('ownMessage', message);
      socket.to(userIntended.socketId).emit('newMessage', message);
    }
    if (!userIntended) return null;
  });

  socket.on('disconnect', async () => {
    console.log(`${socket.id} disconnected`);
    const user = activeSockets.find((u) => u.socketId === socket.id);
    // const userDB = await UserModel.findById(user.userId);

    activeSockets = activeSockets
      .filter((u) => u.socketId !== socket.id)
      .filter((u) => u.userId !== undefined);
    io.sockets.emit('getUsers', activeSockets);
  });
});

app.post('/payment', async (req, res, next) => {
  let { amount, id } = req.body;
  try {
    const payment = await stripe.paymentIntents.create({
      amount,
      currency: 'USD',
      description: 'Seat reservation with RideShareApp',
      payment_method: id,
      confirm: true,
    });
    res.send({
      message: 'Payment successful',
      success: true,
    });
  } catch (error) {
    console.log(error);
    res.send({
      message: 'Payment failed',
      success: false,
    });
  }
});

app.get('/', (req, res, next) => {
  res.status(200).json('OK');
});

app.use(badRequestErrorHandler);
app.use(notFoundErrorHandler);
app.use(forbiddenErrorHandler);
app.use(unauthorizedErrorHandler);
app.use(catchAllErrorHandler);

mongoose
  .connect(process.env.MONGO_CONNECTION, {
    useFindAndModify: false,
    useNewUrlParser: true,
    useUnifiedTopology: true,
    useCreateIndex: true,
  })
  .then(
    server.listen(port, () =>
      console.log(`Server is listening on port ${port}`)
    )
  )
  .catch((err) => console.log(err));
