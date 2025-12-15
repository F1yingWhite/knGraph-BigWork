import React from "react";
import ChatSender from "./ChatSender";

interface WelcomeMessageProps {
  user: { avatar?: string; username: string } | null;
  inputValue: string;
  setInputValue: (value: string) => void;
  isDeepThinking: boolean;
  setIsDeepThinking: (thinking: boolean) => void;
  isSending: boolean;
  handleSend: (input: string) => void;
}

const WelcomeMessage: React.FC<WelcomeMessageProps> = ({
  user,
  inputValue,
  setInputValue,
  isDeepThinking,
  setIsDeepThinking,
  isSending,
  handleSend,
}) => {
  const getGreeting = () => {
    const hour = new Date().getHours();
    return hour < 18 ? "早上好" : "晚上好";
  };

  const quickQuestions = [
    "无上禅师是第几时代的住持?",
    "慧真的老师的老师是谁?",
    "国一贞元祖师的同学有哪些?",
  ];

  return (
    <div className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 lg:px-8 pt-[10vh] pb-[30vh] bg-linear-to-br from-amber-50 to-indigo-50">
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

      <ChatSender
        value={inputValue}
        onChange={setInputValue}
        onSubmit={() => handleSend(inputValue)}
        isDeepThinking={isDeepThinking}
        setIsDeepThinking={setIsDeepThinking}
        isSending={isSending}
      />

      <div className="flex flex-wrap justify-center gap-3 mt-6 max-w-2xl px-2">
        {quickQuestions.map((label) => (
          <button
            key={label}
            onClick={() => setInputValue(label)}
            className="px-6 py-3.5 bg-white text-gray-700 border-2 border-indigo-200 rounded-2xl text-base font-medium hover:bg-linear-to-r hover:from-indigo-50 hover:to-purple-50 hover:border-indigo-400 transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 shadow-md hover:shadow-lg"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default WelcomeMessage;
