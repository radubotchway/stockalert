export const EmptyState = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
    {Icon && <Icon className="mb-2 h-10 w-10 text-slate-300" strokeWidth={1.5} />}
    <p className="font-medium text-slate-700">{title}</p>
    {description && <p className="max-w-sm text-sm text-slate-500">{description}</p>}
    {action && <div className="mt-3">{action}</div>}
  </div>
);
