import express from "express";
import cors from "cors";
import { createServer } from "http";
import { Server } from "socket.io";
import {
  notFoundErrorHandler,
  badRequestErrorHandler,
  forbiddenErrorHandler,
  catchAllErrorHandler,
  unauthorizedErrorHandler,
} from "./errorHandlers.js";
import cookieParser from "cookie-parser";
import mongoose from "mongoose";
import usersRoutes from "./users/index.js";
import tripsRoutes from "./trips/index.js";

const port = process.env.PORT || 3001;

const app = express();
const server = createServer(app);
app.use(cors({ origin: "http://localhost:3000", credentials: true }));

app.use(express.json());
app.use(cookieParser());

app.use("/users", usersRoutes);
app.use("/trips", tripsRoutes);

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
  })
  .then(
    server.listen(port, () =>
      console.log(`Server is listening on port ${port}`)
    )
  )
  .catch((err) => console.log(err));
