import { Request, Response } from "express"
import { SessionManager } from "../utils/SessionManager"
import { callInstagrapi } from "../utils/InstagrapiClient"
import { User, CurrentUser } from "../../../types/types"

export class UserController {
  public static user = async (req: Request, res: Response) => {
    try {
      const session = await SessionManager.deserializeSession(
        String(req.headers.session),
      )
      const username = String(req.query.username)

      const infoResponse = await callInstagrapi("/user", {
        session,
        query: { username },
      })
      if (infoResponse.status >= 300) {
        res.sendStatus(400)
        return
      }
      const info = infoResponse.body

      const friendshipResponse = await callInstagrapi("/user/friendship", {
        session,
        query: { user_id: String(info.pk) },
      })
      const friendship = friendshipResponse.body || {}

      const currentUserResponse = await callInstagrapi("/account", { session })
      const currentUser = currentUserResponse.body || {}

      const user: User = {
        username: info.username,
        name: info.full_name,
        biography: info.biography || "",
        mediaCount: info.media_count,
        followingCount: info.following_count,
        followerCount: info.follower_count,
        profilePicUrl: info.profile_pic_url,
        hdProfilePicUrl: info.profile_pic_url_hd || info.profile_pic_url,
        currentUserAllowedToView:
          friendship.following ||
          !friendship.is_private ||
          currentUser.username === info.username,
      }
      res.send(user)
    } catch (e) {
      res.sendStatus(400)
    }
  }

  public static currentUser = async (req: Request, res: Response) => {
    try {
      const session = await SessionManager.deserializeSession(
        String(req.headers.session),
      )
      const response = await callInstagrapi("/account", { session })
      if (response.status >= 300) {
        res.sendStatus(400)
        return
      }
      const currentUser: CurrentUser = {
        username: response.body.username,
        profilePicUrl: response.body.profile_pic_url,
      }
      res.send(currentUser)
    } catch (e) {
      res.sendStatus(400)
    }
  }
}
