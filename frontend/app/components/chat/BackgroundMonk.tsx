import React from "react";

const BackgroundMonk: React.FC = () => {
  return (
    <div className="flex justify-center items-end pb-6 relative">
      <div className="absolute left-1/2 transform -translate-x-1/2 z-0 pointer-events-none opacity-90">
        <div className="bg-gradient-to-t from-amber-100/30 to-transparent p-4 rounded-t-3xl">
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
  );
};

export default BackgroundMonk;