import { Router } from "express";
import { getSubscribedChannels, getUserChannelSubscribers, toggleSubscription } from "../controllers/subscription.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { checkUser } from "../middlewares/openRouteAuth.middleware.js";


const router = Router();
//router.use(verifyJWT);

router.route("/:channelId")
      .get(checkUser, getUserChannelSubscribers)
      .post(verifyJWT, toggleSubscription)
        
router.route("/users/:subscriberId").get(checkUser, getSubscribedChannels);

export default router