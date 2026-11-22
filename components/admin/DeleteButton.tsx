"use client";

export default function DeleteButton({
  label = "Delete",
  message = "Are you sure? This action cannot be undone.",
  className = "btn btn-ghost !px-2 !py-1 text-xs text-rose-600",
}: {
  label?: string;
  message?: string;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(message)) e.preventDefault();
      }}
    >
      {label}
    </button>
  );
}
