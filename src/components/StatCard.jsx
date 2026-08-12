import React from 'react';

export default function StatCard({ title, value, icon: Icon, description, trend, trendType = 'neutral', isLarge = false, children }) {
  return (
    <div className={`p-4 sm:p-6 rounded-3xl border border-border-custom bg-bg-secondary flex flex-col justify-between premium-card ${isLarge ? 'md:col-span-2' : ''}`}>
      
      {/* Header del Widget */}
      <div className="flex items-center justify-between gap-2 mb-2 sm:mb-4">
        <span className="text-[10px] sm:text-xs font-bold uppercase tracking-wider text-text-secondary truncate">
          {title}
        </span>
        {Icon && (
          <div className="flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-xl sm:rounded-2xl bg-primary/10 text-primary border border-primary/5 shadow-sm shrink-0">
            <Icon size={14} className="sm:size-[18px]" />
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="flex-1 flex flex-col justify-center">
        {children ? (
          <div className="mt-2">{children}</div>
        ) : (
          <div className="flex flex-wrap items-baseline gap-1.5">
            <span className="text-lg sm:text-3xl font-heading font-bold tracking-tight text-text-primary">
              {value}
            </span>
            {trend && (
              <span className={`text-[9px] sm:text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                trendType === 'up' 
                  ? 'bg-emerald-500/10 text-emerald-500' 
                  : trendType === 'down'
                    ? 'bg-red-500 text-white'
                    : 'bg-bg-primary text-text-secondary'
              }`}>
                {trend}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      {description && !children && (
        <p className="text-xs text-text-secondary mt-3 font-medium hidden sm:block">
          {description}
        </p>
      )}
    </div>
  );
}
