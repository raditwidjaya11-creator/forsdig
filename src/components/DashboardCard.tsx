import React, { memo } from 'react';
import { motion } from 'motion/react';
import { LucideIcon } from 'lucide-react';

interface DashboardCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: 'white' | 'orange' | 'green' | 'blue' | 'purple' | 'yellow';
  delay?: number;
}

const DashboardCard = memo(({ title, value, icon: Icon, variant = 'white', delay = 0 }: DashboardCardProps) => {
  const variants = {
    white: "bg-white border-slate-100 text-slate-900 icon-bg-slate-50 icon-text-slate-600",
    blue: "bg-blue-50 border-blue-100 text-blue-900 icon-bg-white icon-text-blue-600",
    orange: "bg-orange-50 border-orange-100 text-orange-600 icon-bg-white icon-text-orange-600",
    green: "bg-green-50 border-green-100 text-green-600 icon-bg-white icon-text-green-600",
    purple: "bg-purple-50 border-purple-100 text-purple-600 icon-bg-white icon-text-purple-600",
    yellow: "bg-yellow-50 border-yellow-100 text-yellow-700 icon-bg-white icon-text-yellow-600",
  };

  const currentVariant = variants[variant] || variants.white;
  const [bgClass, borderClass, textClass, iconBgClass, iconTextClass] = currentVariant.split(' ');

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -5 }}
      className={`min-w-[200px] sm:min-w-0 ${bgClass} p-4 sm:p-6 rounded-3xl shadow-sm border ${borderClass}`}
    >
      <div className="flex items-center gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div className={`p-2 sm:p-3 ${iconBgClass.replace('icon-bg-', '')} rounded-2xl ${iconTextClass.replace('icon-text-', '')}`}>
          <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
        </div>
        <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-widest">{title}</span>
      </div>
      <div className={`text-lg sm:text-xl font-black ${textClass}`}>{value}</div>
    </motion.div>
  );
});

DashboardCard.displayName = 'DashboardCard';

export default DashboardCard;
