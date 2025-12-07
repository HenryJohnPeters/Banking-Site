interface StatusBadgeProps {
  status: string;
  type?: "status" | "transaction-type";
}

const StatusBadge = ({ status, type = "status" }: StatusBadgeProps) => {
  const getStatusStyles = (status: string, type: string) => {
    if (type === "transaction-type") {
      return "bg-blue-100 text-blue-800";
    }

    switch (status) {
      case "COMPLETED":
        return "bg-green-100 text-green-800";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800";
      case "FAILED":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusStyles(
        status,
        type
      )}`}
    >
      {status}
    </span>
  );
};

export default StatusBadge;
