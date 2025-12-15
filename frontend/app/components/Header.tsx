import React from "react";

const Header: React.FC = () => {
  return (
    <div className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-4 shadow-lg">
      <div className="container mx-auto px-4">
        <h1 className="text-2xl md:text-3xl font-bold text-center">
          知识图谱大作业
        </h1>
      </div>
    </div>
  );
};

export default Header;
