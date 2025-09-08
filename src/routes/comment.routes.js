import { Router } from "express";
import { addComment,
         deleteComment,
         getVideoComments,
         updateComment,
 } from  "../controllers/comment.controller.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";


const router = Router() ;
router.use(verifyJWT)

router.route("/get/:videoId").get(getVideoComments);
router.route("/add/:videoId").post(addComment);
router.route("/:commentId").delete(deleteComment).patch(updateComment);


export default router 