import { verifyJWT } from "./tools.js";
import UserModel from "../users/schema.js";

export const jwtAuthMiddleware = async (req, res, next) => {
  try {
    const token = req.cookies.accessToken;
    const decoded = await verifyJWT(token);

    const user = await UserModel.findOne({ _id: decoded._id })
      .populate({
        path: "trips",
        populate: {
          path: "participants",
          select: ["username", "email", "profilePic", "_id"],
        },
      })
      .populate({
        path: "reviews",
        populate: {
          path: "user",
          select: ["username", "email", "_id", "profilePic"],
        },
      });

    if (!user) {
      throw new Error();
    }

    req.user = user;
    next();
  } catch (error) {
    console.log(error);
    next(error);
  }
};
