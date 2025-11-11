// @/components/chat/Sender.tsx
import React from "react";
import { Flex } from "antd";
import { HeatMapOutlined } from "@ant-design/icons";
import { Button, Divider } from "antd";
import { Sender } from "@ant-design/x";

interface SenderProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  isDeepThinking: boolean;
  setIsDeepThinking: (thinking: boolean) => void;
  isSending: boolean;
}

const ChatSender: React.FC<SenderProps> = ({
  value,
  onChange,
  onSubmit,
  isDeepThinking,
  setIsDeepThinking,
  isSending,
}) => {
  return (
    <Sender
      style={{
        width: "80%",
        maxWidth: "1000px",
        background: "rgb(247,248,252)",
      }}
      value={value}
      submitType="shiftEnter"
      onChange={onChange}
      onSubmit={onSubmit}
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
                <span style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <HeatMapOutlined /> 深度思考
                </span>
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
  );
};

export default ChatSender;
