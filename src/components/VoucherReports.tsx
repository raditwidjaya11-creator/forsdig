import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell
} from 'recharts';
import { 
  TrendingUp, 
  Ticket, 
  Users, 
  Zap, 
  Calendar,
  Download,
  Info
} from 'lucide-react';
import { Voucher } from '../types';
import { fetchData as fetchCloudData } from '../services/supabaseService';
import { formatCurrency } from '../lib/utils';
import { isSupabaseConfigured } from '../lib/supabase';

const COLORS = ['#F97316', '#3B82F6', '#10B981', '#A855F7', '#EF4444'];

const VoucherReports = () => {
  const [data, setData] = useState<any[]>([]);
  const [vouchers, setVouchers] = useState<Voucher[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!isSupabaseConfigured) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const voucherData = await fetchCloudData<Voucher>('vouchers');
      
      if (voucherData) {
        setVouchers(voucherData);
        
        // Generate usage stats for chart
        const usageData = voucherData.map(v => ({
          code: v.code,
          usage: v.usageCount || 0,
          value: v.value
        })).sort((a, b) => b.usage - a.usage).slice(0, 5);

        setData(usageData);
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const totalUsed = vouchers.reduce((acc, v) => acc + (v.usageCount || 0), 0);
  const totalLimit = vouchers.reduce((acc, v) => acc + (v.usageLimit || 0), 0);
  const usageRate = totalLimit > 0 ? (totalUsed / totalLimit) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <TrendingUp className="text-orange-500" />
            Laporan Voucher
          </h2>
          <p className="text-slate-500">Analisis performa kampanye dan loyalitas pelanggan.</p>
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-slate-600 font-bold hover:bg-slate-50 transition-all">
            <Download size={18} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center text-orange-500 mb-4">
              <Ticket size={32} />
           </div>
           <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Total Redeem</p>
           <h3 className="text-3xl font-black text-slate-800">{totalUsed}</h3>
           <p className="text-xs text-slate-400 mt-2">Voucher telah digunakan oleh pelanggan</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center text-blue-500 mb-4">
              <Zap size={32} />
           </div>
           <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Usage Rate</p>
           <h3 className="text-3xl font-black text-slate-800">{usageRate.toFixed(1)}%</h3>
           <div className="w-full h-2 bg-slate-100 rounded-full mt-4 overflow-hidden max-w-[120px]">
              <div className="h-full bg-blue-500 rounded-full" style={{ width: `${usageRate}%` }}></div>
           </div>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-slate-100 flex flex-col items-center justify-center text-center">
           <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center text-green-500 mb-4">
              <Users size={32} />
           </div>
           <p className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-1">Top Voucher</p>
           <h3 className="text-2xl font-black text-slate-800 truncate max-w-full">
              {data.length > 0 ? data[0].code : '-'}
           </h3>
           <p className="text-xs text-slate-400 mt-2">Voucher paling sering digunakan</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 flex items-center gap-2">
            Peringkat Penggunaan Voucher
            <Info size={14} className="text-slate-300" />
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis 
                  dataKey="code" 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 12, fontWeight: 700 }}
                />
                <YAxis 
                  axisLine={false} 
                  tickLine={false} 
                  tick={{ fill: '#94A3B8', fontSize: 12 }}
                />
                <Tooltip 
                  cursor={{ fill: '#F8FAFC' }}
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="usage" radius={[4, 4, 0, 0]}>
                  {data.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
          <h3 className="text-lg font-bold text-slate-800 mb-6 font-bold flex items-center gap-2">
            Komposisi Tipe Diskon
          </h3>
          <div className="h-80 flex flex-col md:flex-row items-center">
            <div className="flex-1 w-full h-full">
               <ResponsiveContainer width="100%" height="100%">
                 <PieChart>
                    <Pie
                      data={[
                        { name: 'Persentase', value: vouchers.filter(v => v.type === 'percentage').length },
                        { name: 'Nominal Tetap', value: vouchers.filter(v => v.type === 'fixed').length }
                      ]}
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#F97316" />
                      <Cell fill="#3B82F6" />
                    </Pie>
                    <Tooltip />
                 </PieChart>
               </ResponsiveContainer>
            </div>
            <div className="flex flex-col gap-4 px-4">
                <div className="flex items-center gap-3">
                   <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                   <div className="text-sm">
                      <p className="font-bold text-slate-700">Persentase</p>
                      <p className="text-xs text-slate-400">{vouchers.filter(v => v.type === 'percentage').length} Vouchers</p>
                   </div>
                </div>
                <div className="flex items-center gap-3">
                   <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                   <div className="text-sm">
                      <p className="font-bold text-slate-700">Nominal Tetap</p>
                      <p className="text-xs text-slate-400">{vouchers.filter(v => v.type === 'fixed').length} Vouchers</p>
                   </div>
                </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default VoucherReports;
