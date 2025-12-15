import React, { useState } from "react";
import { Avatar, Spin } from "antd";
import ReactMarkdown from "react-markdown";
import UserAvatar from "@/components/UserAvatar";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  user: { avatar?: string; username: string } | null;
  index: number;
  isLastMessage: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({
  role,
  content,
  user,
  index,
  isLastMessage,
}) => {
  const [hoveredMessageIndex, setHoveredMessageIndex] = useState<number | null>(null);

  return (
    <div
      key={index}
      className={`relative z-10 flex ${
        role === "user" ? "justify-end" : "justify-start"
      } w-full`}
    >
      <div
        className="flex items-start space-x-3 max-w-[75%] min-w-0 relative"
        onMouseEnter={() => setHoveredMessageIndex(index)}
        onMouseLeave={() => setHoveredMessageIndex(null)}
      >
        {role === "assistant" && (
          <Avatar
            className="mx-2 shrink-0"
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
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 p-5 rounded-2xl shadow-lg relative max-w-full border border-amber-200">
          {content === "" ? (
            <Spin />
          ) : (
            <div className="prose prose-sm max-w-none wrap-break-word overflow-wrap-anywhere">
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="last:mb-0 wrap-break-word ">{children}</p>
                  ),
                  code: ({ children }) => (
                    <code className="break-all rounded">{children}</code>
                  ),
                  pre: ({ children }) => (
                    <pre className="break-all overflow-x-auto rounded">
                      {children}
                    </pre>
                  ),
                }}
              >
                {content}
              </ReactMarkdown>
            </div>
          )}
        </div>
        {role === "user" && <UserAvatar width={42} user={user} />}
      </div>
    </div>
  );
};

export default MessageBubble;