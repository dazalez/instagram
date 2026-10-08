import { Request, Response } from "express"
import { SessionManager } from "../utils/SessionManager"
import { callInstagrapi } from "../utils/InstagrapiClient"
import { TrayItem, Story, MediaType } from "../../../types/types"

const resolveUserId = async (
  session: string,
  username: string,
): Promise<string | undefined> => {
  const response = await callInstagrapi("/user", {
    session,
    query: { username },
  })
  if (response.status >= 300) return undefined
  return response.body?.pk ? String(response.body.pk) : undefined
}

const coverUrl = (coverMedia: any): string | undefined => {
  if (!coverMedia) return undefined
  const cropped =
    coverMedia.cropped_image_version || coverMedia.cropped_image_version_v2
  const full = coverMedia.full_image_version
  return cropped?.url || full?.url
}

const fullCoverUrl = (coverMedia: any): string | undefined =>
  coverMedia?.full_image_version?.url

const rawThumbnail = (item: any): string | undefined =>
  item?.thumbnail_url || item?.image_versions2?.candidates?.[0]?.url

const mapStory = (i: any): Story => ({
  id: String(i.id),
  username: i.user?.username || "",
  media: {
    type: i.media_type === 1 ? MediaType.Image : MediaType.Video,
    id: String(i.id),
    mediaUrl:
      i.media_type === 1
        ? rawThumbnail(i)
        : i.video_url || i.video_versions?.[0]?.url,
    previewUrl: i.media_type === 2 ? rawThumbnail(i) : undefined,
  },
  takenAt: Math.floor(new Date(i.taken_at).getTime() / 1000),
})

export class StoriesController {
  public static highlightsTray = async (req: Request, res: Response) => {
    try {
      const session = await SessionManager.deserializeSession(
        String(req.headers.session),
      )
      const userId = await resolveUserId(session, String(req.query.username))
      if (!userId) {
        res.sendStatus(400)
        return
      }
      const response = await callInstagrapi("/user/highlights", {
        session,
        query: { user_id: userId },
      })
      if (response.status >= 300) {
        res.sendStatus(400)
        return
      }
      const highlightsTrayItems: TrayItem[] = (response.body || []).map(
        (i: any) => ({
          id: String(i.pk),
          title: i.title,
          coverUrl: coverUrl(i.cover_media) || "",
          fullCoverUrl: fullCoverUrl(i.cover_media),
        }),
      )
      res.send(highlightsTrayItems)
    } catch (e) {
      res.sendStatus(400)
    }
  }

  public static storiesTray = async (req: Request, res: Response) => {
    try {
      const session = await SessionManager.deserializeSession(
        String(req.headers.session),
      )
      const response = await callInstagrapi("/story/tray", { session })
      if (response.status >= 300) {
        res.sendStatus(400)
        return
      }
      const broadcasts: any[] = response.body?.broadcasts || []
      const tray: any[] = response.body?.tray || []

      const broadcastsTrayItems: TrayItem[] = broadcasts.map((i: any) => ({
        id: String(i.id),
        coverUrl: i.broadcast_owner?.profile_pic_url || "",
        username: i.broadcast_owner?.username,
        broadcast: {
          url: i.dash_playback_url,
          frameUrl: i.cover_frame_url,
          views: i.viewer_count,
        },
      }))

      const storiesTrayItems: TrayItem[] = tray.map((i: any) => {
        const firstItem = i.items?.[0]
        return {
          id: String(i.user?.pk ?? i.id),
          coverUrl: i.user?.profile_pic_url || rawThumbnail(firstItem) || "",
          username: i.user?.username,
          isSeen:
            Number(i.seen ?? 0) >= Number(i.latest_reel_media ?? 0),
          isBestie: Boolean(i.has_besties_media),
          isHide: Boolean(i.hide_from_feed_unit),
        }
      })

      res.send(broadcastsTrayItems.concat(storiesTrayItems))
    } catch (e) {
      res.sendStatus(400)
    }
  }

  public static stories = async (req: Request, res: Response) => {
    try {
      const session = await SessionManager.deserializeSession(
        String(req.headers.session),
      )

      if (req.query.highlight) {
        const response = await callInstagrapi("/highlight", {
          session,
          query: { highlight_pk: String(req.query.highlight) },
        })
        if (response.status >= 300) {
          res.sendStatus(400)
          return
        }
        const stories: Story[] = (response.body?.items || []).map(mapStory)
        res.send(stories)
        return
      }

      let userId = ""
      if (req.query.username) {
        userId =
          (await resolveUserId(session, String(req.query.username))) || ""
      }
      if (req.query.id) {
        userId = String(req.query.id)
      }
      if (!userId) {
        res.sendStatus(400)
        return
      }
      const response = await callInstagrapi("/user/stories", {
        session,
        query: { user_id: userId },
      })
      if (response.status >= 300) {
        res.sendStatus(400)
        return
      }
      const stories: Story[] = (response.body || []).map(mapStory)
      res.send(stories)
    } catch (e) {
      console.log(e)
      res.sendStatus(400)
    }
  }
}
