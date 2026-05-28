import { useState } from "react";
import { Referral, StatusFilter } from "../types";
import {
  Search,
  User,
  Activity,
  Calendar,
  Eye,
  MessageSquare,
  CheckCircle2,
  Trash2,
  AlertCircle,
  Clock,
  ArrowRightLeft,
  Filter,
  Check,
  ChevronDown,
  X
} from "lucide-react";

interface ReferralListProps {
  referrals: Referral[];
  role: "doctor" | "emergency";
  onUpdateStatus: (id: string, status: Referral["status"], comment?: string) => Promise<boolean>;
  onDeleteReferral: (id: string) => Promise<boolean>;
}

const QUICK_COMMENTS = [
  "ადგილები არ გვაქვს",
  "ვერ მივიღებთ ამ ეტაპზე",
  "დაურეკეთ განყოფილების ხელმძღვანელს",
  "პაციენტი ჯერ არ მოსულა",
  "მიღება შესაძლებელია 30 წუთში",
  // საჭიროა დამატებითი ინფორმაცია. გთხოვთ დაუკავშირდეთ მორიგე ექიმს.
  "საჭიროა დამატებითი ინფორმაცია. გთხოვთ დაუკავშირდეთ მორიგე ექიმს.",
];

function formatGeoDate(dateStr: string) {
  try {
    const d = new Date(dateStr);
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    const day = d.getDate();
    const monthsGeo = [
      "იანვარი",
      "თებერვალი",
      "მარტი",
      "აპრილი",
      "მაისი",
      "ივნისი",
      "ივლისი",
      "აგვისტო",
      "სექტემბერი",
      "ოქტომბერი",
      "ნოემბერი",
      "დეკემბერი"
    ];
    const month = monthsGeo[d.getMonth()];
    return `${day} ${month}, ${hours}:${minutes}`;
  } catch (e) {
    return dateStr;
  }
}

export default function ReferralList({
  referrals,
  role,
  onUpdateStatus,
  onDeleteReferral
}: ReferralListProps) {
  // Query States
  const [searchPatient, setSearchPatient] = useState("");
  const [searchDoctor, setSearchDoctor] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("ყველა");
  const [deptFilter, setDeptFilter] = useState("");

  // Comment Editor State
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [currentCommentText, setCurrentCommentText] = useState("");
  const [toastMessage, setToastMessage] = useState("");

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(""), 4000);
  };

  // Departments for unique filtering
  const departments = Array.from(new Set(referrals.map((r) => r.department))).filter(Boolean);

  // Filter referrals
  const filteredReferrals = referrals.filter((r) => {
    const matchesPatient = r.patientName.toLowerCase().includes(searchPatient.toLowerCase());
    const matchesDoctor = r.doctorName.toLowerCase().includes(searchDoctor.toLowerCase());
    const matchesDept = deptFilter ? r.department === deptFilter : true;

    let matchesStatus = true;
    if (statusFilter === "აქტიური") {
      matchesStatus = r.status === "აქტიური";
    } else if (statusFilter === "მოვიდეს - დადასტურებულია") {
      matchesStatus = r.status === "მოვიდეს - დადასტურებულია";
    } else if (statusFilter === "განხილვაშია - იხილეთ კომენტარი") {
      matchesStatus = r.status === "განხილვაშია - იხილეთ კომენტარი";
    } else if (statusFilter === "მოვიდა - დასრულებულია") {
      matchesStatus = r.status === "მოვიდა - დასრულებულია";
    }

    return matchesPatient && matchesDoctor && matchesDept && matchesStatus;
  });

  // Sort based on role requirements:
  // - Emergency: "ორიენტირებული ახალზე" - status = "აქტიური" comes absolute first & floats to top.
  // - Doctor: "ბოლოს შესრულებული მოქმედების მიხედვით" - sorted by updatedAt descending.
  const sortedReferrals = [...filteredReferrals].sort((a, b) => {
    if (role === "emergency") {
      // Emergency status weights:
      // აქტიური (New/ახალი) = 0
      // მოვიდეს - დადასტურებულია = 1
      // განხილვაშია - იხილეთ კომენტარი = 2
      // მოვიდა - დასრულებულია = 3
      const getWeight = (status: Referral["status"]) => {
        switch (status) {
          case "აქტიური":
            return 0;
          case "მოვიდეს - დადასტურებულია":
            return 1;
          case "განხილვაშია - იხილეთ კომენტარი":
            return 2;
          case "მოვიდა - დასრულებულია":
            return 3;
          default:
            return 4;
        }
      };

      const weightA = getWeight(a.status);
      const weightB = getWeight(b.status);

      if (weightA !== weightB) {
        return weightA - weightB;
      }

      // Within SAME status group, newest created goes first
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    } else {
      // Doctor: sorted in the head/top by latest action (updatedAt descending)
      return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });

  const handleStatusArrived = async (id: string) => {
    const success = await onUpdateStatus(id, "მოვიდა - დასრულებულია");
    if (success) {
      showToast("პაციენტი მონიშნულია მოსულად და მიმართვა დასრულებულად");
    }
  };

  const handleStatusCanCome = async (id: string) => {
    const success = await onUpdateStatus(id, "მოვიდეს - დადასტურებულია");
    if (success) {
      showToast("პაციენტის გადმოყვანა (მოვიდეს) დადასტურდა");
    }
  };

  const handleSaveComment = async (id: string) => {
    const success = await onUpdateStatus(id, "განხილვაშია - იხილეთ კომენტარი", currentCommentText);
    if (success) {
      setEditingCommentId(null);
      setCurrentCommentText("");
      showToast("კომენტარი შენახულია და სტატუსი განახლდა");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const confirmed = window.confirm(`ნამდვილად გსურთ ამ მიმართვის წაშლა? (პაციენტი: ${name})`);
    if (confirmed) {
      const success = await onDeleteReferral(id);
      if (success) {
        showToast("მიმართვა წარმატებით წაშლილია");
      }
    }
  };

  const selectQuickComment = (text: string) => {
    setCurrentCommentText(text);
  };

  return (
    <div className="space-y-6">
      {/* Toast Alert Indicator */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white rounded-xl py-3 px-5 shadow-xl border border-slate-800 flex items-center gap-3 animate-fade-in text-sm font-sans">
          <div className="w-2 h-2 rounded-full bg-teal-400 animate-ping"></div>
          {toastMessage}
        </div>
      )}

      {/* Modern Filter Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 md:p-5">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-50">
            <Filter className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-700 font-sans">ფილტრაცია და ძებნა</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {/* Search Patient */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                id="search-patient"
                type="text"
                placeholder="პაციენტის სახელი, გვარი..."
                value={searchPatient}
                onChange={(e) => setSearchPatient(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-sans"
              />
            </div>

            {/* Search Doctor */}
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-slate-400" />
              <input
                id="search-doctor"
                type="text"
                placeholder="ექიმის სახელი, გვარი..."
                value={searchDoctor}
                onChange={(e) => setSearchDoctor(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all font-sans"
              />
            </div>

            {/* Department Filter */}
            <div className="relative">
              <select
                id="filter-dept"
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all bg-white font-sans appearance-none cursor-pointer"
              >
                <option value="">ყველა განყოფილება</option>
                {departments.map((dept) => (
                  <option key={dept} value={dept}>
                    {dept}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Status Tabs/Shortcuts */}
            <div className="relative">
              <select
                id="filter-status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
                className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-400 transition-all bg-white font-sans appearance-none cursor-pointer"
              >
                <option value="ყველა">სტატუსი: ყველა</option>
                <option value="აქტიური">სტატუსი: აქტიური</option>
                <option value="მოვიდეს - დადასტურებულია">სტატუსი: მოვიდეს - დადასტურებულია</option>
                <option value="განხილვაშია - იხილეთ კომენტარი">სტატუსი: განხილვაშია - იხილეთ კომენტარი</option>
                <option value="მოვიდა - დასრულებულია">სტატუსი: მოვიდა - დასრულებულია</option>
              </select>
              <ChevronDown className="absolute right-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>
      </div>

      {/* Referral Results Count & Quick Reset */}
      <div className="flex justify-between items-center px-1">
        <p className="text-xs text-slate-500 font-sans">
          ნაჩვენებია <span className="font-semibold text-slate-800">{sortedReferrals.length}</span> მიმართვა
        </p>
        {(searchPatient || searchDoctor || deptFilter || statusFilter !== "ყველა") && (
          <button
            id="btn-reset-filters"
            onClick={() => {
              setSearchPatient("");
              setSearchDoctor("");
              setDeptFilter("");
              setStatusFilter("ყველა");
            }}
            className="text-xs text-blue-600 hover:text-blue-700 font-medium font-sans flex items-center gap-1 cursor-pointer"
          >
            ფილტრების გასუფთავება
          </button>
        )}
      </div>

      {/* Simple Table (Desktop) / Cards (Mobile) Grid */}
      {sortedReferrals.length === 0 ? (
        <div className="bg-white border border-slate-100 rounded-2xl py-12 px-4 shadow-sm text-center">
          <Activity className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-700 font-sans">მიმართვები ვერ მოიძებნა</h3>
          <p className="text-xs text-slate-500 font-sans mt-1">შეცვალეთ ფილტრის პირობები ან დაამატეთ ახალი პაციენტის მიმართვა</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {sortedReferrals.map((referral) => {
            const isCompleted = referral.status === "მოვიდა - დასრულებულია";
            const isEditingComment = editingCommentId === referral.id;

            return (
              <div
                id={`referral-card-${referral.id}`}
                key={referral.id}
                className={`bg-white rounded-2xl border transition-all duration-300 shadow-sm hover:shadow-md overflow-hidden ${
                  isCompleted
                    ? "border-emerald-100 opacity-90 hover:opacity-100"
                    : referral.status === "განხილვაშია - იხილეთ კომენტარი"
                    ? "border-amber-100 ring-1 ring-amber-50"
                    : referral.status === "მოვიდეს - დადასტურებულია"
                    ? "border-cyan-100 ring-1 ring-cyan-50/50"
                    : referral.status === "აქტიური"
                    ? "border-rose-150 ring-1 ring-rose-50/40 bg-rose-50/5"
                    : "border-slate-100"
                }`}
              >
                {/* Status Indicator Banner */}
                <div className="px-5 py-3 border-b border-slate-50 flex flex-wrap gap-2 items-center justify-between">
                  {/* Status Badges */}
                  <div className="flex flex-wrap gap-2 items-center">
                    {referral.status === "აქტიური" && (
                      <>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-500 text-white border border-rose-600 animate-pulse">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-ping" />
                          ახალი
                        </span>
                        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                          <Clock className="w-3.5 h-3.5" />
                          აქტიური
                        </span>
                      </>
                    )}
                    {referral.status === "მოვიდეს - დადასტურებულია" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-cyan-50 text-cyan-800 border border-cyan-200">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        მოვიდეს - დადასტურებულია
                      </span>
                    )}
                    {referral.status === "განხილვაშია - იხილეთ კომენტარი" && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
                        <AlertCircle className="w-3.5 h-3.5 bg-amber-50 rounded" />
                        განხილვაშია - იხილეთ კომენტარი
                      </span>
                    )}
                    {isCompleted && (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Check className="w-3.5 h-3.5 bg-emerald-100 rounded-full p-0.5" />
                        მოვიდა - დასრულებულია
                      </span>
                    )}
                  </div>

                  {/* Date Created/Completed */}
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 font-mono">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>შექმნა: {formatGeoDate(referral.createdAt)}</span>
                    {referral.completedAt && (
                      <span className="text-emerald-600 font-medium">
                        | დახურვა: {formatGeoDate(referral.completedAt)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Patient Information Content Block */}
                <div className="p-5 grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Left Column: Patient & Doctor */}
                  <div className="space-y-3">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block font-sans">
                        პაციენტი
                      </span>
                      <p className="text-base font-bold text-slate-950 font-sans mt-0.5">
                        {referral.patientName}
                      </p>
                    </div>

                    {/* Diagnosis & Complaints Displays */}
                    {(referral.diagnosis || referral.complaints) && (
                      <div className="space-y-1.5 pt-1.5 border-t border-slate-50">
                        {referral.diagnosis && (
                          <div className="bg-rose-50/40 text-rose-950 px-2.5 py-1.5 rounded-lg border border-rose-100/50 text-xs font-sans">
                            <span className="font-semibold text-rose-800 block text-[10px] uppercase tracking-wider mb-0.5">🩺 წინასწარი დიაგნოზი:</span>
                            {referral.diagnosis}
                          </div>
                        )}
                        {referral.complaints && (
                          <div className="bg-amber-50/30 text-amber-950 px-2.5 py-1.5 rounded-lg border border-amber-100/60 text-xs font-sans">
                            <span className="font-semibold text-amber-800 block text-[10px] uppercase tracking-wider mb-0.5">🤒 ჩივილები:</span>
                            {referral.complaints}
                          </div>
                        )}
                      </div>
                    )}

                    <div className="pt-2 border-t border-slate-50">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block font-sans">
                        მიმმართველი ექიმი
                      </span>
                      <p className="text-sm font-semibold text-slate-700 font-sans mt-0.5 flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        {referral.doctorName}
                      </p>
                    </div>
                  </div>

                  {/* Middle Column: Location & Studies */}
                  <div className="space-y-2 border-slate-50 md:border-l md:pl-4">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block font-sans">
                        განყოფილება და ადგილი
                      </span>
                      <p className="text-sm font-bold text-blue-900 mt-0.5 font-sans">
                        {referral.department}
                      </p>
                      {referral.bedLocation ? (
                        <p className="text-xs text-slate-600 font-sans mt-1">
                          {referral.bedLocation}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-300 italic font-sans mt-1">
                          მდებარეობა არ არის მითითებული
                        </p>
                      )}
                    </div>

                    {referral.requestedTests && (
                      <div className="pt-2 border-t border-slate-50">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block font-sans">
                          საჭირო კვლევები
                        </span>
                        <p className="text-xs text-slate-700 font-sans mt-0.5 line-clamp-2">
                          {referral.requestedTests}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Right Column: Doctor's Note */}
                  <div className="space-y-2 border-slate-50 md:border-l md:pl-4">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest block font-sans">
                        ექიმის შენიშვნა
                      </span>
                      {referral.doctorNote ? (
                        <p className="text-xs text-slate-600 font-sans mt-1 bg-slate-50/70 p-2.5 rounded-lg border border-slate-100 whitespace-pre-line leading-relaxed">
                          {referral.doctorNote}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic font-sans mt-1">
                          შენიშვნა არ არსებობს
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Emergency comment display if exists */}
                {referral.emergencyComment && (
                  <div className="bg-amber-50/50 px-5 py-3 border-t border-amber-100 flex items-start gap-2.5">
                    <MessageSquare className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block font-sans">
                        ემერჯენსის კომენტარი
                      </span>
                      <p className="text-xs text-slate-800 font-medium font-sans mt-0.5">
                        {referral.emergencyComment}
                      </p>
                    </div>
                  </div>
                )}

                {/* Active Comment Form inline on card */}
                {isEditingComment && (
                  <div className="bg-slate-50 p-5 border-t border-slate-100 space-y-3 animate-fade-in">
                    <div>
                      <label id={`comment-label-${referral.id}`} className="block text-xs font-semibold text-slate-700 mb-2 font-sans">
                        შეიყვანეთ კომენტარი ან აირჩიეთ შაბლონიდან:
                      </label>
                      <input
                        id={`comment-input-${referral.id}`}
                        type="text"
                        value={currentCommentText}
                        onChange={(e) => setCurrentCommentText(e.target.value)}
                        placeholder="ჩაწერეთ კომენტარი პაციენტის შესახებ..."
                        className="w-full px-3 py-2 text-sm rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400 bg-white font-sans"
                      />
                    </div>

                    {/* Quick Suggestions template */}
                    <div className="flex flex-wrap gap-1.5">
                      {QUICK_COMMENTS.map((comm) => (
                        <button
                          key={comm}
                          id={`quick-comment-btn-${comm}`}
                          onClick={() => selectQuickComment(comm)}
                          className="text-[11px] bg-white hover:bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg border border-slate-200 transition font-sans cursor-pointer whitespace-nowrap"
                        >
                          {comm}
                        </button>
                      ))}
                    </div>

                    <div className="flex justify-end gap-2 pt-2">
                      <button
                        id={`comment-cancel-${referral.id}`}
                        onClick={() => {
                          setEditingCommentId(null);
                          setCurrentCommentText("");
                        }}
                        className="text-xs bg-slate-200 hover:bg-slate-300 text-slate-800 px-3 py-1.5 rounded-lg font-semibold font-sans transition cursor-pointer"
                      >
                        გაუქმება
                      </button>
                      <button
                        id={`comment-save-${referral.id}`}
                        disabled={!currentCommentText.trim()}
                        onClick={() => handleSaveComment(referral.id)}
                        className={`text-xs px-3.5 py-1.5 rounded-lg font-semibold font-sans transition flex items-center gap-1 cursor-pointer ${
                          currentCommentText.trim()
                            ? "bg-amber-500 hover:bg-amber-600 text-white"
                            : "bg-amber-200 text-amber-700 cursor-not-allowed"
                        }`}
                      >
                        კომენტარის შენახვა
                      </button>
                    </div>
                  </div>
                )}

                {/* Bottom Control Actions (Only shown if in relevant roles) */}
                <div className="bg-slate-50/50 px-5 py-3 border-t border-slate-100 flex flex-wrap gap-2 items-center justify-between">
                  {/* Left Side: General delete button always accessible */}
                  <div>
                    <button
                      id={`delete-btn-${referral.id}`}
                      onClick={() => handleDelete(referral.id, referral.patientName)}
                      className="inline-flex items-center gap-1 text-xs text-rose-500 hover:text-rose-600 font-semibold px-2 py-1 rounded-lg hover:bg-rose-50 transition cursor-pointer font-sans"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      წაშლა
                    </button>
                  </div>

                  {/* Right Side: Role-based state action loops */}
                  <div className="flex flex-wrap gap-2">
                    {role === "emergency" && !isCompleted && (
                      <>
                        {/* 1. Comment button */}
                        <button
                          id={`comment-trigger-btn-${referral.id}`}
                          onClick={() => {
                            setEditingCommentId(referral.id);
                            setCurrentCommentText(referral.emergencyComment || "");
                          }}
                          className="inline-flex items-center gap-1.5 text-xs bg-white hover:bg-slate-100 text-slate-700 font-bold px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm transition cursor-pointer font-sans"
                        >
                          <MessageSquare className="w-3.5 h-3.5 text-slate-500" />
                          კომენტარი (განხილვაშია)
                        </button>

                        {/* 2. Patient can come */}
                        {referral.status !== "მოვიდეს - დადასტურებულია" && (
                          <button
                            id={`accept-transfer-btn-${referral.id}`}
                            onClick={() => handleStatusCanCome(referral.id)}
                            className="inline-flex items-center gap-1.5 text-xs bg-cyan-600 hover:bg-cyan-700 text-white font-bold px-3.5 py-1.5 rounded-xl shadow-sm hover:shadow transition cursor-pointer font-sans"
                          >
                            <ArrowRightLeft className="w-3.5 h-3.5" />
                            მოვიდეს (დადასტურება)
                          </button>
                        )}

                        {/* 3. Patient arrived - Marks as completed/done */}
                        <button
                          id={`confirm-arrival-btn-${referral.id}`}
                          onClick={() => handleStatusArrived(referral.id)}
                          className="inline-flex items-center gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-3.5 py-1.5 rounded-xl shadow-sm hover:shadow transition cursor-pointer font-sans"
                        >
                          <Check className="w-3.5 h-3.5" />
                          მოვიდა (დასრულება)
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
