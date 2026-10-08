import { Request, Response } from "express"
import { SessionManager } from "../utils/SessionManager"
import { callInstagrapi } from "../utils/InstagrapiClient"
import { MediaType, Post } from "../../../types/types"

const toUnixSeconds = (takenAt: any): number => {
  if (typeof takenAt === "number") return takenAt
  return Math.floor(new Date(takenAt).getTime() / 1000)
}

const mapMediaToPost = (media: any): Post => {
  // The timeline feed returns raw Instagram payloads (caption.text,
  // carousel_media, video_versions), while /user/posts returns aiograpi's
  // extracted Media (caption_text, resources, video_url). Support both.
  const carousel = media.resources || media.carousel_media
  const medias =
    media.media_type === 1 || media.media_type === 2
      ? [
          {
            type: media.media_type === 1 ? MediaType.Image : MediaType.Video,
            id: String(media.id),
            mediaUrl:
              media.media_type === 1
                ? media.image_versions2?.candidates?.[0]?.url
                : media.video_url || media.video_versions?.[0]?.url,
            previewUrl:
              media.media_type === 2
                ? media.image_versions2?.candidates?.[0]?.url
                : undefined,
          },
        ]
      : carousel
        ? carousel.map((m: any) => ({
            type: m.media_type === 1 ? MediaType.Image : MediaType.Video,
            id: String(m.pk ?? m.id),
            mediaUrl:
              m.media_type === 1
                ? m.thumbnail_url || m.image_versions2?.candidates?.[0]?.url
                : m.video_url ||
                  m.video_versions?.[0]?.url ||
                  m.thumbnail_url,
            previewUrl:
              m.media_type === 2
                ? m.thumbnail_url || m.image_versions2?.candidates?.[0]?.url
                : undefined,
          }))
        : []

  return {
    id: String(media.id),
    username: media.user?.username || "",
    medias,
    caption: media.caption_text || media.caption?.text || "",
    likes: media.like_count ?? 0,
    takenAt: toUnixSeconds(media.taken_at),
  }
}

export class PostsController {
  public static homePosts = async (req: Request, res: Response) => {
    try {
      const session = await SessionManager.deserializeSession(
        String(req.headers.session),
      )
      const response = await callInstagrapi("/account/feed/timeline", {
        session,
        query: {
          max_id: req.query.next ? String(req.query.next) : undefined,
        },
      })
      if (response.status >= 300) {
        res.sendStatus(400)
        return
      }
      const feedItems: any[] = response.body?.feed_items || []
      const homePosts: Post[] = feedItems
        .map((item) => item.media_or_ad)
        .filter((media) => media?.user?.friendship_status?.following)
        .map(mapMediaToPost)
      res.send({
        posts: homePosts,
        next: response.body?.next_max_id || undefined,
      })
    } catch (e) {
      res.sendStatus(400)
    }
  }

  public static userPosts = async (req: Request, res: Response) => {
    try {
      const session = await SessionManager.deserializeSession(
        String(req.headers.session),
      )
      const response = await callInstagrapi("/user/posts", {
        session,
        query: {
          username: String(req.query.username),
          amount: 50,
          cursor: req.query.next ? String(req.query.next) : undefined,
        },
      })
      if (response.status >= 300) {
        res.sendStatus(400)
        return
      }
      const userPosts: Post[] = (response.body?.items || []).map(mapMediaToPost)
      res.send({
        posts: userPosts,
        next: response.body?.next_cursor || undefined,
      })
    } catch (e) {
      res.sendStatus(400)
    }
  }
}
