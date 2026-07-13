const STYLES = {
  slate: 'bg-slate-100 text-slate-700',
  green: 'bg-emerald-100 text-emerald-700',
  amber: 'bg-amber-100 text-amber-800',
  red: 'bg-red-100 text-red-700',
  blue: 'bg-sky-100 text-sky-700',
  purple: 'bg-violet-100 text-violet-700',
};

export const Badge = ({ color = 'slate', children }) => (
  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${STYLES[color] || STYLES.slate}`}>
    {children}
  </span>
);

const daysUntil = (date) => Math.ceil((new Date(date) - new Date()) / (1000 * 60 * 60 * 24));

export const ExpiryBadge = ({ expiryDate }) => {
  const days = daysUntil(expiryDate);
  if (days < 0) return <Badge color="red">Expired</Badge>;
  if (days <= 30) return <Badge color="amber">Expires in {days}d</Badge>;
  if (days <= 90) return <Badge color="blue">Expires in {days}d</Badge>;
  return <Badge color="green">OK</Badge>;
};

export const expiryRowClass = (expiryDate) => {
  const days = daysUntil(expiryDate);
  if (days < 0) return 'bg-red-50';
  if (days <= 30) return 'bg-amber-50';
  return '';
};

export const POStatusBadge = ({ status }) => {
  const map = {
    DRAFT: 'slate',
    SENT: 'blue',
    PARTIALLY_RECEIVED: 'amber',
    RECEIVED: 'green',
    CANCELLED: 'red',
  };
  return <Badge color={map[status] || 'slate'}>{status.replace('_', ' ')}</Badge>;
};
