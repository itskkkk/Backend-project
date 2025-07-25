import { Router } from "express";
import { getLikedVideos,
         toggelCommentLike,
         toggleTweetLike,
         toggleVideoLike,
 } from "../controllers/like.controller.js";

 import { verifyJWT } from "../middlewares/auth.middleware.js"

 const router = Router();
 router.use(verifyJWT);

 router.route("/toggle/v/:videoId").post(toggleVideoLike);
 router.route("/toggle/c/:commentId").post(toggelCommentLike);
 router.route("/toggle/t/:tweetId").post(toggleTweetLike);
 router.route("/videos").get(getLikedVideos);

 export default router