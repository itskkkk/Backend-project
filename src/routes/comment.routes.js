import { Router } from "express";
import { addComment,
         deleteComment,
         getVideoComments,
         updateComment,
 } from  "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { checkUser } from "../middlewares/openRouteAuth.middleware.js";


const router = Router() ;
//router.use(verifyJWT)

router.route("/get/:videoId").get(checkUser, getVideoComments);
router.route("/add/:videoId").post(verifyJWT, addComment);
router.route("/:commentId").delete(verifyJWT, deleteComment).patch(verifyJWT, updateComment);


export default router 