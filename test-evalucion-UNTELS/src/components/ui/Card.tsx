interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hover?: boolean;
}

export default function Card({ children, className = '', onClick, hover = false }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`rounded-xl border border-[var(--border)] bg-[var(--background)] p-5 shadow-sm ${
        hover ? 'hover:shadow-md hover:border-[var(--primary)]/40 transition-all cursor-pointer' : ''
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {children}
    </div>
  );
}
