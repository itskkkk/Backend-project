import { Router } from "express";
import { addVideoToPlaylist,
         createPlaylist,
         deletePlaylist,
         getPlaylistById,
         getUserPlaylists,
         getVideoSavePlaylists,
         removeVideoFromPlaylist,
         updatePlaylist,
} from "../controllers/playlist.controller.js";

import { verifyJWT } from "../middlewares/auth.middleware.js";
import { checkUser } from "../middlewares/openRouteAuth.middleware.js";


const router = Router() ;

//router.use(verifyJWT);

router.route("/").post(verifyJWT, createPlaylist);

router.route("/:playlistId")
      .get(checkUser, getPlaylistById)
      .patch(verifyJWT, updatePlaylist)
      .delete(verifyJWT, deletePlaylist)


router.route("/add/:playlistId/:videoId").patch(verifyJWT, addVideoToPlaylist);
router.route("/remove/:playlistId/:videoId").patch(verifyJWT, removeVideoFromPlaylist);
router.route("/users/:userId").get(checkUser, getUserPlaylists);
router.route("/user/playlists/:videoId").get(verifyJWT, getVideoSavePlaylists);

export default router