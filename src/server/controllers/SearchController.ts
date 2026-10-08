import { Request, Response } from "express"
import { SearchedUser } from "../../../types/types"
import { SessionManager } from "../utils/SessionManager"
import { callInstagrapi } from "../utils/InstagrapiClient"

export class SearchController {
  public static search = async (req: Request, res: Response) => {
    try {
      const session = await SessionManager.deserializeSession(
        String(req.headers.session),
      )
      const username = String(req.query.username)
      const response = await callInstagrapi("/search/users", {
        session,
        query: { query: username },
      })
      if (response.status >= 300) {
        res.sendStatus(400)
        return
      }
      const searchedUsers: SearchedUser[] = (response.body || []).map(
        (u: any) => ({
          username: u.username,
          name: u.full_name,
          profilePicUrl: u.profile_pic_url,
          isPrivate: u.is_private,
          following: u.friendship_status?.following ?? false,
        }),
      )
      res.send(searchedUsers)
    } catch (e) {
      console.log(e)
      res.sendStatus(400)
    }
  }
}
