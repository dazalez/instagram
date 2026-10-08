import React, { useState } from "react"
import {
  VStack,
  Container,
  Tab,
  TabList,
  TabPanel,
  TabPanels,
  Tabs,
  Center,
} from "@chakra-ui/react"
import { Tray } from "../components/tray/Tray"
import { TrayItem } from "../components/tray/TrayItem"
import { BasicPage } from "./BasicPage"
import { useStoriesTray } from "../hooks/useStoriesTray"
import { StoriesType, useStories } from "../hooks/useStories"
import { ContentGrid } from "../components/content/ContentGrid"
import { StoryCard } from "../components/content/StoryCard"
import { useHomePosts } from "../hooks/useHomePosts"
import { PostCard } from "../components/content/PostCard"
import { TrayItem as TrayItemType } from "../../../types/types"
import { BroadcastCard } from "../components/content/BroadcastCard"

export const HomePage = () => {
  const [contentType, setContentType] = useState(0)
  const [selectedTab, setSelectedTab] = useState(0)
  const [selectedItem, setSelectedItem] = useState("")

  const { storiesTray, isLoading } = useStoriesTray()
  const stories = useStories(
    String(selectedItem),
    contentType === 1 || false,
    StoriesType.UserStories
  )
  const posts = useHomePosts()

  const handleClickTrayItem = (item: TrayItemType) => {
    if (item.broadcast) setContentType(3)
    else setContentType(1)

    setSelectedItem(item.id)
    setSelectedTab(-1)
  }

  const handleChangeTab = (index: number) => {
    setContentType(index)
    setSelectedTab(index)
    setSelectedItem("")
  }

  return (
    <BasicPage>
      <VStack py={6} spacing={8}>
        <Container maxW="container.md">
          <Tray isLoading={isLoading}>
            {storiesTray?.map((i) => {
              return (
                <TrayItem
                  key={i.id}
                  itemId={i.id}
                  item={i}
                  onClick={handleClickTrayItem}
                  active={selectedItem === i.id}
                />
              )
            })}
          </Tray>
        </Container>
        <Container maxW="container.lg">
          <Tabs
            isFitted
            variant="enclosed"
            index={selectedTab}
            onChange={handleChangeTab}
          >
            <TabList mb="1em">
              <Tab>Publicaciones</Tab>
            </TabList>
            <TabPanels display={contentType === 1 ? "none" : undefined}>
              <TabPanel>
                <ContentGrid
                  contentLength={posts.homePosts?.length || 0}
                  hasMoreContent={posts.hasMorePosts}
                  loadMoreContent={posts.loadMorePosts}
                  isLoadingContent={posts.isLoading}
                >
                  {posts.homePosts?.map((i) => {
                    return <PostCard key={i.id} post={i} />
                  })}
                </ContentGrid>
              </TabPanel>
            </TabPanels>
          </Tabs>
        </Container>
        <Container
          maxW="container.lg"
          display={contentType !== 1 ? "none" : undefined}
        >
          <ContentGrid
            contentLength={stories.stories?.length || 0}
            hasMoreContent={false}
            loadMoreContent={() => {}}
            isLoadingContent={stories.isLoading}
          >
            {stories.stories?.map((i) => {
              return <StoryCard key={i.id} story={i} />
            })}
          </ContentGrid>
        </Container>
        {contentType === 3 ? (
          <Container maxW="container.md">
            <Center>
              <BroadcastCard
                trayItem={storiesTray?.find((i) => i.id === selectedItem)}
              />
            </Center>
          </Container>
        ) : null}
      </VStack>
    </BasicPage>
  )
}
