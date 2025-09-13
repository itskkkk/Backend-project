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


const router = Router() ;

router.use(verifyJWT);

router.route("/").post(createPlaylist);

router.route("/:playlistId")
      .get(getPlaylistById)
      .patch(updatePlaylist)
      .delete(deletePlaylist)


router.route("/add/:playlistId/:videoId").patch(addVideoToPlaylist);
router.route("/remove/:playlistId/:videoId").patch(removeVideoFromPlaylist);
router.route("/users/:userId").get(getUserPlaylists);
router.route("/user/playlists/:videoId").get(getVideoSavePlaylists);

export default router