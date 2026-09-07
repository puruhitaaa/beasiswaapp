import React from "react";

interface StatCardProps {
  title: string;
  value: number | string;
  bgVariant?: "primary" | "info" | "success" | "warning" | "danger" | "secondary";
  textColor?: "text-white" | "text-dark";
  icon?: string;
  className?: string;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  bgVariant = "primary",
  textColor = bgVariant === "warning" ? "text-dark" : "text-white",
  icon,
  className = "",
}) => {
  const subtitleColor =
    textColor === "text-white" ? "text-white-50" : "text-dark-50";

  return (
    <div className={`card card-stat bg-${bgVariant} ${textColor} p-3 ${className}`}>
      <div className="d-flex justify-content-between align-items-center">
        <div>
          <small className={subtitleColor}>{title}</small>
          <h2 className="fw-bold mb-0 mt-1">{value}</h2>
        </div>
        {icon && <i className={`bi ${icon} fs-1 opacity-50`}></i>}
      </div>
    </div>
  );
};

export default StatCard;
