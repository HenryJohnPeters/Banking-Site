import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

const Card = ({ children, className = "", padding = true }: CardProps) => {
  return (
    <div
      className={`bg-white shadow rounded-lg overflow-hidden ${
        padding ? "p-6" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
};

export default Card;
