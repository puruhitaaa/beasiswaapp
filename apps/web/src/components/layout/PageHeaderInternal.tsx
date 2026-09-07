import React from "react";

interface PageHeaderInternalProps {
  title: string;
  subtitle: string;
  badgeIcon?: string;
  badgeText: string;
}

export const PageHeaderInternal: React.FC<PageHeaderInternalProps> = ({
  title,
  subtitle,
  badgeIcon = "bi-person-circle",
  badgeText,
}) => {
  return (
    <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom bg-white p-3 rounded shadow-sm">
      <div>
        <h4 className="fw-bold mb-0">{title}</h4>
        <small className="text-muted">{subtitle}</small>
      </div>
      <div className="d-flex align-items-center gap-2">
        <span className="badge bg-primary-subtle text-primary border border-primary px-3 py-2 fs-6">
          <i className={`bi ${badgeIcon} me-1`}></i> {badgeText}
        </span>
      </div>
    </div>
  );
};

export default PageHeaderInternal;
