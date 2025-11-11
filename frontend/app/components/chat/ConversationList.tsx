// @/components/chat/ConversationList.tsx
import React, { useState } from "react";
import { Button, Divider, Spin } from "antd";
import { DeleteOutlined, PlusOutlined, RedoOutlined } from "@ant-design/icons";
import InfiniteScroll from "react-infinite-scroll-component";
import { Conversations, Conversation } from "@ant-design/x";
import { deleteChat, Message } from "@/lib/chat";

interface ConversationListProps {
  conversationList: Conversation[];
  chatLength: number | null;
  curChatId: string | undefined;
  setCurChatId: (id: string | undefined) => void;
  setChatHistory: (history: Message[]) => void;
  setConversationList: (list: Conversation[]) => void;
  setChatLength: (length: number | null) => void;
  isSending: boolean;
  messageApi: any;
}

const ConversationList: React.FC<ConversationListProps> = ({
  conversationList,
  chatLength,
  curChatId,
  setCurChatId,
  setChatHistory,
  setConversationList,
  setChatLength,
  isSending,
  messageApi,
}) => {
  const loadMoreData = () => {};

  const handleNewConversion = () => {
    if (isSending) {
      messageApi.error("请等待当前消息发送完成");
      return;
    }
    setChatHistory([]);
    setCurChatId(undefined);
  };

  const getConversationDetail = (id: string) => {
    // 这里不处理 TTS，由 ChatArea 统一处理
    setCurChatId(id);
    setChatHistory([]);
    // 实际项目中，这里应该调用 API 获取会话详情
    // getChatDetail(id).then(res => setChatHistory(res));
  };

  const menuConfig = (conversation: Conversation) => ({
    items: [
      {
        label: "删除",
        key: "Delete",
        icon: <DeleteOutlined />,
        danger: true,
        onClick: () => {
          deleteChat(conversation.key).then(() => {
            setConversationList(
              conversationList.filter((item) => item.key !== conversation.key)
            );
            setChatLength(chatLength ? chatLength - 1 : 0);
            if (conversation.key === curChatId) {
              setCurChatId(undefined);
            }
            setChatHistory([]);
          });
        },
      },
    ],
  });

  return (
    <div className="h-full w-1/4 max-w-[400px] bg-indigo-50 overflow-auto">
      <Button
        icon={<PlusOutlined />}
        onClick={handleNewConversion}
        style={{
          background: "#1677ff0f",
          border: "1px solid #1677ff34",
          width: "calc(100% - 24px)",
          margin: "24px 12px 24px 12px",
        }}
      >
        新的会话
      </Button>
      <InfiniteScroll
        dataLength={conversationList.length}
        next={loadMoreData}
        hasMore={conversationList.length < (chatLength || 0)}
        loader={
          <div style={{ textAlign: "center" }}>
            <Spin indicator={<RedoOutlined spin />} size="small" />
          </div>
        }
        endMessage={<Divider plain>没有更多会话历史了 🤐</Divider>}
        scrollableTarget="scrollableDiv"
      >
        <Conversations
          menu={menuConfig}
          items={conversationList}
          onActiveChange={getConversationDetail}
          activeKey={curChatId}
        />
      </InfiniteScroll>
    </div>
  );
};

export default ConversationList;
