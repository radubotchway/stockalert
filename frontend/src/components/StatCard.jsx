import { Link } from 'react-router-dom';

const COLORS = {
  brand: 'bg-brand-50 text-brand-700',
  red: 'bg-red-50 text-red-700',
  amber: 'bg-amber-50 text-amber-700',
  blue: 'bg-sky-50 text-sky-700',
  slate: 'bg-slate-100 text-slate-700',
};

export const StatCard = ({ icon: Icon, label, value, color = 'brand', to }) => {
  const content = (
    <div className="rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-100 transition-shadow hover:shadow-md">
      <div className="flex items-center gap-3">
        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${COLORS[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <p className="text-2xl font-bold leading-tight text-slate-900">{value}</p>
          <p className="text-sm text-slate-500">{label}</p>
        </div>
      </div>
    </div>
  );
  return to ? <Link to={to}>{content}</Link> : content;
};
