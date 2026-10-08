import { useQuery, UseQueryResult } from "react-query"
import { Story } from "../../../types/types"
import { useLocalStorage } from "./useLocalStorage"

export enum StoriesType {
  Stories,
  Highlights,
  UserStories,
}

export const useStories = (id: string, allowed: boolean, type: StoriesType) => {
  const [session] = useLocalStorage("session", "")

  const url =
    type === StoriesType.Stories
      ? `/api/stories/stories?username=${id}`
      : type === StoriesType.Highlights
      ? `/api/stories/stories?highlight=${id}`
      : type === StoriesType.UserStories
      ? `/api/stories/stories?id=${id}`
      : ""

  const storiesFetch = async () => {
    const response = await fetch(url, {
      method: "GET",
      headers: { "Content-Type": "application/json", session },
      credentials: "include",
    })
    return response.json()
  }

  const storiesQuery: UseQueryResult<Story[], Error> = useQuery(
    ["stories", type, id],
    storiesFetch,
    {
      enabled: allowed,
    }
  )

  return {
    stories: storiesQuery.data,
    isLoading: storiesQuery.isLoading,
  }
}
