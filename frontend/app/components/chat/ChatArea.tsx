// @/components/chat/ChatArea.tsx
import React, { useState, useEffect, useRef } from "react";
import { Spin, Avatar } from "antd";
import ReactMarkdown from "react-markdown";
import { Message } from "@/lib/chat";
import { wss_host } from "@/lib/axios";
import UserAvatar from "@/components/UserAvatar";
import ChatSender from "./ChatSender";

interface ChatAreaProps {
  chatHistory: Message[];
  setChatHistory: React.Dispatch<React.SetStateAction<Message[]>>;
  isSending: boolean;
  setIsSending: (sending: boolean) => void;
  inputValue: string;
  setInputValue: (value: string) => void;
  isDeepThinking: boolean;
  setIsDeepThinking: (thinking: boolean) => void;
  curChatId: string | undefined;
  setChatID: (id: string | undefined) => void;
  setChatLength: (length: number | null) => void;

  user: any;
  messageApi: any;
}

const ChatArea: React.FC<ChatAreaProps> = ({
  chatHistory,
  setChatHistory,
  isSending,
  setIsSending,
  inputValue,
  setInputValue,
  isDeepThinking,
  setIsDeepThinking,
  curChatId,
  setChatID,
  setChatLength,
  user,
  messageApi,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [hoveredMessageIndex, setHoveredMessageIndex] = useState<number | null>(
    null
  );
  const [clickIndex, setClickIndex] = useState<number | null>(null);

  const getGreeting = () => {
    const hour = new Date().getHours();
    return hour < 18 ? "早上好" : "晚上好";
  };

  const handleSend = (inputValues: string) => {
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
        const payload = chat_id
          ? { messages: updatedChatHistory.slice(0, -1), id: chat_id }
          : { messages: updatedChatHistory.slice(0, -1) };
        websocket.send(JSON.stringify(payload));
      };

      websocket.onmessage = (event) => {
        const data = event.data;
        if (data === "[DONE]") {
          websocket.close();
          setIsSending(false);
        } else if (data.startsWith("[CHAT_ID]:")) {
          const chat_id = data.substring(10);
          setChatID(chat_id);
          setChatLength(chatHistory.length + 1);
          // 更新会话列表（实际项目中应由父组件管理）
        } else {
          setChatHistory((prev) => {
            const lastIdx = prev.length - 1;
            const lastMsg = prev[lastIdx];
            if (lastMsg.role === "assistant") {
              return [
                ...prev.slice(0, lastIdx),
                { ...lastMsg, content: lastMsg.content + data },
              ];
            }
            return prev;
          });
        }
      };

      websocket.onclose = () => {
        messageApi.error("对话意外关闭");
        setIsSending(false);
      };

      websocket.onerror = () => {
        messageApi.error("对话意外关闭");
        setIsSending(false);
      };
    }
  };

  // 滚动到底部
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [chatHistory]);

  // 空状态
  if (chatHistory.length === 0) {
    return (
      <div
        className="w-full h-full flex flex-col"
        style={{
          backgroundImage: "url('/background_light.jpg')",
          backgroundRepeat: "repeat",
          backgroundSize: "auto",
        }}
      >
        <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 pt-[10vh] pb-[30vh]">
          <div className="text-center mb-8">
            <h1 className="text-4xl font-semibold text-gray-800 leading-tight">
              {getGreeting()},
              <span className="font-bold text-indigo-600">
                {" "}
                {user?.username || "施主"}
              </span>
              <span className="animate-pulse">✨</span>
            </h1>
            <p className="mt-2 text-sm text-gray-500">
              今日禅心可安？静待君问一语。
            </p>
          </div>
          <ChatSender
            value={inputValue}
            onChange={setInputValue}
            onSubmit={() => handleSend(inputValue)}
            isDeepThinking={isDeepThinking}
            setIsDeepThinking={setIsDeepThinking}
            isSending={isSending}
          />
          <div className="flex flex-wrap justify-center gap-3 mt-6 max-w-2xl px-2">
            {[
              "无上禅师是第几时代的住持?",
              "慧真的老师的老师是谁?",
              "国一贞元祖师的同学有哪些?",
            ].map((label) => (
              <button
                key={label}
                onClick={() => setInputValue(label)}
                className="px-5 py-3 bg-white text-gray-700 border border-gray-300 rounded-full text-sm font-medium hover:bg-indigo-50 hover:border-indigo-400 transition-all duration-200 transform hover:scale-105 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // 有聊天内容
  return (
    <div
      className="w-full h-full flex flex-col"
      style={{
        backgroundImage: "url('/background_light.jpg')",
        backgroundRepeat: "repeat",
        backgroundSize: "auto",
      }}
    >
      <div className="flex-1 overflow-y-auto p-4 space-y-4 h-full">
        {chatHistory.map((message, index) => (
          <div
            key={index}
            className={`relative z-10 flex ${
              message.role === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div
              className="flex items-start space-x-2 max-w-xl relative"
              onMouseEnter={() => setHoveredMessageIndex(index)}
              onMouseLeave={() => setHoveredMessageIndex(null)}
            >
              {message.role === "assistant" && (
                <Avatar
                  className="mx-2 shrink-0"
                  style={{ backgroundColor: "#fde3cf", color: "#f56a00" }}
                  size={40}
                >
                  径
                </Avatar>
              )}
              <div className="bg-[#DBD0BE] p-2 rounded-md shadow-md relative">
                {message.content === "" ? (
                  <Spin />
                ) : (
                  <div>
                    <ReactMarkdown>{message.content}</ReactMarkdown>
                  </div>
                )}
              </div>
              {message.role === "user" && <UserAvatar width={40} user={user} />}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="flex justify-center items-end pb-4 relative">
        <div className="absolute left-1/2 transform -translate-x-1/2 z-0 pointer-events-none">
          <img
            src="/monk.png"
            alt="Monk"
            className="w-auto h-auto max-h-[35vh] opacity-80"
            style={{
              filter: "brightness(1)",
            }}
          />
        </div>
      </div>

      <div className="flex justify-center items-end pb-4 relative z-10">
        <ChatSender
          value={inputValue}
          onChange={setInputValue}
          onSubmit={() => handleSend(inputValue)}
          isDeepThinking={isDeepThinking}
          setIsDeepThinking={setIsDeepThinking}
          isSending={isSending}
        />
      </div>
    </div>
  );
};

export default ChatArea;
