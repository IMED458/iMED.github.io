import { Referral } from "../types";
import { AlertCircle, CheckCircle2, ClipboardList, Clock } from "lucide-react";

interface ReferralStatsProps {
  referrals: Referral[];
}

export default function ReferralStats({ referrals }: ReferralStatsProps) {
  const total = referrals.length;
  const active = referrals.filter((r) => r.status === "აქტიური").length;
  const confirmed = referrals.filter((r) => r.status === "მოვიდეს - დადასტურებულია").length;
  const commented = referrals.filter((r) => r.status === "განხილვაშია - იხილეთ კომენტარი").length;
  const completed = referrals.filter((r) => r.status === "მოვიდა - დასრულებულია").length;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
      {/* Active Stat */}
      <div className="bg-white rounded-xl p-4 border border-blue-100 shadow-sm flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:border-blue-200">
        <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
          <Clock className="w-5 h-5 animate-pulse" />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium font-sans">აქტიური</p>
          <p className="text-2xl font-bold text-slate-900 leading-none mt-1 font-mono">
            {active}
          </p>
        </div>
      </div>

      {/* Confirmed Stat */}
      <div className="bg-white rounded-xl p-4 border border-cyan-100 shadow-sm flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:border-cyan-200">
        <div className="p-3 bg-cyan-50 rounded-lg text-cyan-600">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium font-sans">დადასტურებული</p>
          <p className="text-2xl font-bold text-slate-900 leading-none mt-1 font-mono">
            {confirmed}
          </p>
        </div>
      </div>

      {/* Commented Stat */}
      <div className="bg-white rounded-xl p-4 border border-amber-100 shadow-sm flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:border-amber-200">
        <div className="p-3 bg-amber-50 rounded-lg text-amber-600">
          <AlertCircle className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium font-sans">კომენტარით</p>
          <p className="text-2xl font-bold text-slate-900 leading-none mt-1 font-mono">
            {commented}
          </p>
        </div>
      </div>

      {/* Completed Stat */}
      <div className="bg-white rounded-xl p-4 border border-emerald-100 shadow-sm flex items-center gap-4 transition-all duration-300 hover:shadow-md hover:border-emerald-200">
        <div className="p-3 bg-emerald-50 rounded-lg text-emerald-600">
          <ClipboardList className="w-5 h-5" />
        </div>
        <div>
          <p className="text-xs text-slate-500 font-medium font-sans">დასრულებული</p>
          <p className="text-2xl font-bold text-slate-900 leading-none mt-1 font-mono">
            {completed}
          </p>
        </div>
      </div>
    </div>
  );
}
