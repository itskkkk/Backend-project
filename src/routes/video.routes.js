import { Router } from "express";
import {deleteVideo,
        getAllVideos,
        getAllVideosByOption,
        getVideoById,
        publishAVideo,  
        togglePublishStatus, 
        updateVideo,
        updateView} from "../controllers/video.controller.js";

import {verifyJWT} from "../middlewares/auth.middleware.js";
import {upload} from "../middlewares/multer.middleware.js";
import { checkAborted } from "../middlewares/abortedRequest.middleware.js";
import { checkUser } from "../middlewares/openRouteAuth.middleware.js";


const router = Router();
//router.use(verifyJWT); //Apply verifyJWT middleware to all routes in this file

router.route("/all/option").get(getAllVideosByOption);

router.route("/")
      .get(getAllVideos)
      .post(
        verifyJWT,
        upload.fields([
            {
                name: "videoFile",
                maxCount: 1,
            },
            {
                name: "thumbnail",
                maxCount:1,
            },
        ]),
        checkAborted,
        publishAVideo
      );

router.route("/:videoId")
      .get(checkUser, getVideoById)
      .delete(verifyJWT, deleteVideo)
      .patch(verifyJWT, upload.single("thumbnail"), updateVideo);

router.route("/toggle/publish/:videoId").patch(verifyJWT, togglePublishStatus);
router.route("/view/:videoId").patch(checkUser, updateView)

export default router