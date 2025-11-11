"use client";
import React, { useState, useEffect, useRef } from "react";
import {
  Avatar,
  Button,
  Divider,
  Flex,
  GetProp,
  message,
  Space,
  Spin,
} from "antd";
import Icon, {
  DeleteOutlined,
  FireOutlined,
  HeatMapOutlined,
  PlusOutlined,
  RedoOutlined,
} from "@ant-design/icons";
import {
  deleteChat,
  getChatDetail,
  getHistory,
  getHistoryLength,
  Message,
} from "@/lib/chat";
import { wss_host } from "@/lib/axios";
import ReactMarkdown from "react-markdown";
import {
  Bubble,
  Conversations,
  ConversationsProps,
  Prompts,
  Sender,
  Welcome,
} from "@ant-design/x";
import InfiniteScroll from "react-infinite-scroll-component";
import { Conversation } from "@ant-design/x/es/conversations";
import UserAvatar from "@/components/UserAvatar";
const renderTitle = (icon: React.ReactElement<any>, title: string) => (
  <Space align="start">
    {icon}
    <span>{title}</span>
  </Space>
);

const placeholderPromptsItems: GetProp<typeof Prompts, "items"> = [
  {
    key: "1",
    label: renderTitle(
      <FireOutlined style={{ color: "#FF4D4F" }} />,
      "热门问题"
    ),
    description: "您对什么感兴趣",
    children: [
      {
        key: "1-1",
        description: `无上禅师是第几时代的住持?`,
      },
      {
        key: "1-2",
        description: `慧真的老师的老师是谁?`,
      },
      {
        key: "1-3",
        description: `国一贞元祖师的同学有哪些?`,
      },
    ],
  },
];

export default function Page() {
  const getTheme = "light";
  const [isDeepThinking, setIsDeepThinking] = useState<boolean>(false);
  const [chatHistory, setChatHistory] = useState<Message[]>([]);
  const [conversationList, setConversationList] = useState<Conversation[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hoveredMessageIndex, setHoveredMessageIndex] = useState<number | null>(
    null
  );
  const [clickIndex, setClickIndex] = useState<number | null>(null);
  const [curChatId, setChatID] = useState<string | undefined>();
  const [chatLength, setChatLength] = useState<number | null>(null);
  const [messageApi, contextHolder] = message.useMessage();
  const [user, setUser] = useState<{
    avatar?: string;
    username: string;
  } | null>(null);
  const iconStyle = {
    fontSize: 18,
  };
  const loadMoreData = () => {};
  const getGreeting = () => {
    const hour = new Date().getHours();
    return hour < 18 ? "早上好" : "晚上好";
  };

  const handleSend = async (inputValues: string) => {
    if (inputValues.trim() && !isSending) {
      setIsSending(true);
      const newMessage: Message = {
        role: "user",
        content: inputValues,
        isDeepThinking,
      };
      const updatedChatHistory = [
        ...chatHistory,
        newMessage,
        { role: "assistant" as "assistant", content: "" },
      ];
      setChatHistory(updatedChatHistory);
      setInputValue("");

      const uri = `${wss_host}/chat/ws`;
      const websocket = new WebSocket(uri);

      websocket.onopen = () => {
        const chat_id = curChatId;
        if (chat_id) {
          websocket.send(
            JSON.stringify({
              messages: updatedChatHistory.slice(0, -1),
              id: chat_id,
            })
          );
        } else {
          websocket.send(
            JSON.stringify({ messages: updatedChatHistory.slice(0, -1) })
          );
        }
      };

      websocket.onmessage = (event) => {
        const data = event.data;
        if (data === "[DONE]") {
          websocket.close();
          setIsSending(false);
        } else if (data.startsWith("[CHAT_ID]:")) {
          const chat_id = data.substring(10);
          setChatID(chat_id);
          setChatLength(chatLength ? chatLength + 1 : 1);
          setConversationList([
            { key: chat_id, label: inputValues },
            ...conversationList,
          ]);
        } else {
          setChatHistory((prevHistory) => {
            const lastMessageIndex = prevHistory.length - 1;
            const lastMessage = prevHistory[lastMessageIndex];

            if (lastMessage.role === "assistant") {
              const updatedLastMessage = {
                ...lastMessage,
                content: lastMessage.content + data,
              };

              return [
                ...prevHistory.slice(0, lastMessageIndex),
                updatedLastMessage,
              ];
            }
            return prevHistory;
          });
        }
      };

      websocket.onclose = (event) => {
        if (event.wasClean) {
          console.log("WebSocket connection closed normally");
        } else {
          messageApi.error("对话意外关闭");
        }
        setIsSending(false);
      };

      websocket.onerror = (error) => {
        messageApi.error("对话意外关闭");
        setIsSending(false);
      };
    }
  };

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  useEffect(() => {
    // Load user info from localStorage
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
      } catch (e) {
        console.error("Failed to parse user data from localStorage", e);
        // If parsing fails, set a default user object
        setUser({ username: "施主" });
      }
    } else {
      // If no user in localStorage, set a default username
      setUser({ username: "施主" });
    }

    getHistoryLength().then((res) => {
      setChatLength(res.length);
    });
    getHistory().then((res) => {
      setConversationList(res);
    });

    return () => {};
  }, [user]);

  const menuConfig: ConversationsProps["menu"] = (conversation) => ({
    items: [
      {
        label: "删除",
        key: "Delete",
        icon: <DeleteOutlined />,
        danger: true,
        onClick: (menuInfo) => {
          deleteChat(conversation.key).then(() => {
            setConversationList(
              conversationList.filter((item) => item.key !== conversation.key)
            );
            setChatLength(chatLength ? chatLength - 1 : 0);
            if (conversation.key === curChatId) {
              setChatID(undefined);
            }
            setChatHistory([]);
          });
        },
      },
    ],
  });

  const handleNewConversion = () => {
    if (isSending) {
      messageApi.error("请等待当前消息发送完成");
      return;
    }
    setChatHistory([]);
    setChatID(undefined);
  };

  // 根据 isActive 动态设置按钮的类名

  const getConversationDetail = (id: string) => {
    getChatDetail(id).then((res) => {
      setChatHistory(res);
    });
    setChatID(id);
  };

  const newLocal = "mx-2 shrink-0";
  return (
    <div className="w-full h-screen flex flex-col bg-white">
      {" "}
      {/* Changed to flex-col to accommodate navbar */}
      {/* Top Navigation Bar */}
      <div className="w-full bg-linear-to-r from-indigo-600 to-purple-600 text-white py-4 shadow-lg">
        <div className="container mx-auto px-4">
          <h1 className="text-2xl md:text-3xl font-bold text-center">
            知识图谱大作业
          </h1>
        </div>
      </div>
      {contextHolder}
      {/* Main content area with chat interface */}
      <div className="flex flex-1 overflow-hidden">
        {/* 左侧会话列表 */}
        <div className="h-full w-1/4 max-w-[400px] bg-linear-to-b from-indigo-50 to-indigo-100 overflow-auto border-r border-indigo-200">
          <Button
            icon={<PlusOutlined />}
            onClick={handleNewConversion}
            style={{
              background: "linear-gradient(135deg, #e0e7ff, #c7d2fe)",
              border: "1px solid #a5b4fc",
              width: "calc(100% - 24px)",
              margin: "24px 12px 24px 12px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
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

        {/* 右侧主聊天区 */}
        <div
          className="w-full h-full flex flex-col"
          style={{
            backgroundImage: "url('/background_light.jpg')",
            backgroundRepeat: "repeat",
            backgroundSize: "auto",
          }}
        >
          {chatHistory.length === 0 ? (
            // ✅ 空状态：居中显示 Sender，向上偏移20%
            <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 pt-[10vh] pb-[30vh] bg-linear-to-br from-amber-50 to-indigo-50">
              {/* 问候语 */}
              <div className="text-center mb-10">
                <h1 className="text-5xl font-bold text-gray-800 leading-tight mb-4">
                  {getGreeting()},
                  <span className="font-extrabold text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-purple-600">
                    {" "}
                    {user?.username || "施主"}
                  </span>
                </h1>
                <div className="relative inline-block">
                  <span className="animate-pulse text-4xl">✨</span>
                </div>
                <p className="mt-6 text-lg text-gray-600 italic">
                  今日禅心可安？静待君问一语。
                </p>
              </div>

              <Sender
                style={{
                  width: "80%",
                  maxWidth: "1000px",
                  background: "rgb(247,248,252)",
                }}
                value={inputValue}
                submitType="shiftEnter"
                onChange={setInputValue}
                onSubmit={() => {
                  handleSend(inputValue);
                }}
                footer={({ components }) => {
                  const { SendButton, LoadingButton } = components;
                  return (
                    <Flex justify="space-between" align="center">
                      <Flex gap="small" align="center">
                        <Button
                          shape="round"
                          style={{
                            backgroundColor: isDeepThinking
                              ? "#374151"
                              : "rgb(247,248,252)",
                            color: isDeepThinking ? "white" : "#1f2937",
                            borderColor: isDeepThinking ? "#374151" : "#d1d5db",
                            padding: "8px 16px",
                          }}
                          onClick={() => setIsDeepThinking(!isDeepThinking)}
                        >
                          <Icon component={HeatMapOutlined} /> 深度思考
                        </Button>
                        <Divider type="vertical" />
                      </Flex>
                      <Flex align="center">
                        <Divider type="vertical" />
                        <Divider type="vertical" />
                        {isSending ? (
                          <LoadingButton type="default" />
                        ) : (
                          <SendButton type="primary" disabled={false} />
                        )}
                      </Flex>
                    </Flex>
                  );
                }}
                actions={false}
              />
              {/* 快捷提问按钮组 */}
              <div className="flex flex-wrap justify-center gap-3 mt-6 max-w-2xl px-2">
                {[
                  "无上禅师是第几时代的住持?",
                  "慧真的老师的老师是谁?",
                  "国一贞元祖师的同学有哪些?",
                ].map((label) => (
                  <button
                    key={label}
                    onClick={() => setInputValue(label)}
                    className="px-6 py-3.5 bg-white text-gray-700
                   border-2 border-indigo-200 rounded-2xl
                   text-base font-medium hover:bg-linear-to-r hover:from-indigo-50 hover:to-purple-50
                   hover:border-indigo-400 transition-all duration-300 transform hover:scale-105
                   focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75
                   shadow-md hover:shadow-lg"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            // ✅ 有聊天内容：正常布局
            <>
              <div className="flex-1 overflow-y-auto p-6 space-y-6 h-full bg-amber-50/30">
                {chatHistory.map((message, index) => (
                  <div
                    key={index}
                    className={`relative z-10 flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    } w-full`}
                  >
                    <div
                      className="flex items-start space-x-3 max-w-[75%] min-w-0 relative"
                      onMouseEnter={() => setHoveredMessageIndex(index)}
                      onMouseLeave={() => setHoveredMessageIndex(null)}
                    >
                      {message.role === "assistant" && (
                        <Avatar
                          className={newLocal}
                          style={{
                            backgroundColor: "#fde3cf",
                            color: "#f56a00",
                            border: "1px solid #f9a825",
                          }}
                          size={42}
                        >
                          径
                        </Avatar>
                      )}
                      <div className="bg-linear-to-br from-amber-50 to-amber-100 p-5 rounded-2xl shadow-lg relative max-w-full border border-amber-200">
                        {message.content === "" ? (
                          <Spin />
                        ) : (
                          <div className="prose prose-sm max-w-none wrap-break-word overflow-wrap-anywhere">
                            <ReactMarkdown
                              components={{
                                p: ({ children }) => (
                                  <p className="last:mb-0 wrap-break-word ">
                                    {children}
                                  </p>
                                ),
                                code: ({ children }) => (
                                  <code className="break-all rounded">
                                    {children}
                                  </code>
                                ),
                                pre: ({ children }) => (
                                  <pre className="break-all overflow-x-auto rounded">
                                    {children}
                                  </pre>
                                ),
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        )}
                      </div>
                      {message.role === "user" && (
                        <UserAvatar width={42} user={user} />
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* 背景图片 - 在聊天历史和Sender之间 */}
              <div className="flex justify-center items-end pb-6 relative">
                <div className="absolute left-1/2 transform -translate-x-1/2 z-0 pointer-events-none opacity-90">
                  <div className="bg-linear-to-t from-amber-100/30 to-transparent p-4 rounded-t-3xl">
                    <img
                      src="/monk.png"
                      alt="Monk"
                      className="w-auto h-auto max-h-[30vh] object-contain drop-shadow-2xl"
                      style={{
                        filter:
                          "brightness(1) drop-shadow(0 10px 15px rgba(0,0,0,0.1))",
                      }}
                    />
                  </div>
                </div>
              </div>

              {/* 底部 Sender */}
              <div className="flex justify-center items-end pb-6 relative z-10">
                <div className="w-4/5 max-w-4xl bg-white/80 backdrop-blur-sm rounded-2xl p-4 shadow-xl border border-indigo-100">
                  <Sender
                    style={{
                      background: "rgb(247,248,252)",
                      borderRadius: "1rem",
                    }}
                    value={inputValue}
                    submitType="shiftEnter"
                    onChange={setInputValue}
                    onSubmit={() => {
                      handleSend(inputValue);
                    }}
                    footer={({ components }) => {
                      const { SendButton, LoadingButton } = components;
                      return (
                        <Flex justify="space-between" align="center">
                          <Flex gap="small" align="center">
                            <Button
                              shape="round"
                              style={{
                                backgroundColor: isDeepThinking
                                  ? "#4f46e5"
                                  : "rgb(247,248,252)",
                                color: isDeepThinking ? "white" : "#1f2937",
                                borderColor: isDeepThinking
                                  ? "#4f46e5"
                                  : "#d1d5db",
                                padding: "8px 16px",
                              }}
                              className="hover:shadow-md transition-shadow"
                              onClick={() => setIsDeepThinking(!isDeepThinking)}
                            >
                              <Icon component={HeatMapOutlined} /> 深度思考
                            </Button>
                            <Divider type="vertical" />
                          </Flex>
                          <Flex align="center">
                            <Divider type="vertical" />
                            <Divider type="vertical" />
                            {isSending ? (
                              <LoadingButton type="default" />
                            ) : (
                              <SendButton
                                type="primary"
                                disabled={false}
                                style={{
                                  background:
                                    "linear-gradient(135deg, #6366f1, #8b5cf6)",
                                  borderColor: "#6366f1",
                                }}
                                className="hover:opacity-90 transition-opacity"
                              />
                            )}
                          </Flex>
                        </Flex>
                      );
                    }}
                    actions={false}
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </div>{" "}
      {/* Closing div for flex container that wraps left and right panels */}
    </div>
  );
}
