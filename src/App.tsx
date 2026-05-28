import { useState, useEffect } from "react";
import { Referral } from "./types";
import ReferralForm from "./components/ReferralForm";
import ReferralList from "./components/ReferralList";
import ReferralStats from "./components/ReferralStats";
import {
  subscribeToReferrals,
  addReferral,
  updateReferralStatus,
  deleteReferral,
} from "./services/referralService";
import {
  Activity,
  HeartPulse,
  Stethoscope,
  ShieldAlert,
  Clock,
  Wifi,
} from "lucide-react";

export default function App() {
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [activeTab, setActiveTab] = useState<"doctor" | "emergency">("doctor");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [synced, setSynced] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hrs = String(now.getHours()).padStart(2, "0");
      const mins = String(now.getMinutes()).padStart(2, "0");
      setCurrentTime(`${hrs}:${mins}`);
    };
    updateTime();
    const timer = setInterval(updateTime, 15000);
    return () => clearInterval(timer);
  }, []);

  // Live Firestore subscription — no polling needed
  useEffect(() => {
    const unsubscribe = subscribeToReferrals(
      (data) => {
        setReferrals(data);
        setIsLoading(false);
        setError(null);
        setSynced(true);
      },
      (err) => {
        setError("Firebase-თან კავშირის შეცდომა: " + err.message);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, []);

  const handleAddReferral = async (data: {
    doctorName: string;
    patientName: string;
    department: string;
    bedLocation?: string;
    requestedTests?: string;
    doctorNote?: string;
    diagnosis?: string;
    complaints?: string;
  }): Promise<boolean> => {
    try {
      await addReferral(data);
      return true;
    } catch (err: any) {
      alert(`შეცდომა: ${err.message}`);
      return false;
    }
  };

  const handleUpdateStatus = async (
    id: string,
    status: Referral["status"],
    comment?: string
  ): Promise<boolean> => {
    try {
      await updateReferralStatus(id, status, comment);
      return true;
    } catch (err: any) {
      alert(`შეცდომა: ${err.message}`);
      return false;
    }
  };

  const handleDeleteReferral = async (id: string): Promise<boolean> => {
    try {
      await deleteReferral(id);
      return true;
    } catch (err: any) {
      alert(`შეცდომა: ${err.message}`);
      return false;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12 antialiased">
      {/* Header */}
      <header className="bg-white border-b border-slate-100 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-sm shadow-blue-200 flex items-center justify-center">
                <HeartPulse className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight font-sans">
                  გადაუდებელი მედიცინის მიმართვების სისტემა
                </h1>
                <p className="text-[10px] sm:text-xs text-slate-500 font-medium font-sans">
                  პალატების კოორდინაციისა და ჰოსპიტალიზაციის მართვა
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 bg-slate-100 text-slate-800 px-3 py-1.5 rounded-lg text-xs font-mono">
                <Clock className="w-3.5 h-3.5 text-slate-500" />
                <span>{currentTime}</span>
              </div>

              <div
                className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-xl border font-bold font-sans transition-all ${
                  synced
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-slate-50 text-slate-500 border-slate-200"
                }`}
              >
                <Wifi className={`w-3.5 h-3.5 ${synced ? "text-emerald-500" : "text-slate-400"}`} />
                <span className="hidden md:inline">
                  {synced ? "Firebase Live" : "კავშირი..."}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-6">
        {error && (
          <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl p-4 mb-6 flex items-start gap-3 shadow-xs animate-fade-in">
            <ShieldAlert className="w-5 h-5 text-rose-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-bold font-sans">კავშირის პრობლემა Firebase-თან</p>
              <p className="text-xs text-rose-600 mt-1 font-sans">{error}</p>
            </div>
          </div>
        )}

        {!isLoading && <ReferralStats referrals={referrals} />}

        <div className="flex p-1 bg-slate-200/70 rounded-2xl max-w-lg mb-6 shadow-2xs">
          <button
            id="tab-doctor-panel"
            onClick={() => setActiveTab("doctor")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "doctor"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Stethoscope className="w-4 h-4" />
            <span className="font-sans">ექიმის პანელი</span>
          </button>

          <button
            id="tab-emergency-panel"
            onClick={() => setActiveTab("emergency")}
            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all duration-200 cursor-pointer ${
              activeTab === "emergency"
                ? "bg-white text-blue-700 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Activity className="w-4 h-4" />
            <span className="font-sans">ემერჯენსის პანელი</span>
          </button>
        </div>

        {isLoading && referrals.length === 0 ? (
          <div className="bg-white border border-slate-100 rounded-3xl py-24 text-center shadow-xs">
            <div className="w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-sm text-slate-500 font-sans">Firebase-სთან კავშირი...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {activeTab === "doctor" ? (
              <>
                <div className="lg:col-span-5">
                  <ReferralForm onAddReferral={handleAddReferral} />
                </div>
                <div className="lg:col-span-7 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-slate-950 font-sans">
                        მიმდინარე მიმართვები
                      </h3>
                      <p className="text-xs text-slate-500 font-sans mt-0.5">
                        ექიმის რეჟიმი (მხოლოდ დათვალიერება და წაშლა)
                      </p>
                    </div>
                  </div>
                  <ReferralList
                    referrals={referrals}
                    role="doctor"
                    onUpdateStatus={handleUpdateStatus}
                    onDeleteReferral={handleDeleteReferral}
                  />
                </div>
              </>
            ) : (
              <>
                <div className="lg:col-span-12 space-y-4">
                  <div>
                    <h3 className="text-base font-bold text-slate-950 font-sans">
                      შემოსული მიმართვების კოორდინაცია
                    </h3>
                    <p className="text-xs text-slate-500 font-sans mt-0.5">
                      ემერჯენსის რეჟიმი (კომენტარების მართვა, გადმოყვანის დადასტურება, მიღება)
                    </p>
                  </div>
                  <ReferralList
                    referrals={referrals}
                    role="emergency"
                    onUpdateStatus={handleUpdateStatus}
                    onDeleteReferral={handleDeleteReferral}
                  />
                </div>
              </>
            )}
          </div>
        )}
      </main>

      <footer className="max-w-7xl mx-auto px-4 text-center mt-20 border-t border-slate-150 pt-6">
        <p className="text-xs text-slate-400 font-sans">
          © {new Date().getFullYear()} გადაუდებელი მედიცინის დეპარტამენტის პაციენტთა მართვის სისტემა.
        </p>
      </footer>
    </div>
  );
}
