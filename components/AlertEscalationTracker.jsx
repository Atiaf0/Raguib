import React, { useState, useEffect } from 'react';

/**
 * Dynamic 4-Level Alert Escalation Timeline Tracker for Raqeeb Control Center
 * 
 * Escalation Levels:
 *  - Level 1 (Immediate / 0m): Driver + Fleet Manager + Quality Officer
 *  - Level 2 (+5 Mins): Operations Director
 *  - Level 3 (+15 Mins): Quality Director
 *  - Level 4 (+30 Mins): Automated Call / SMS (Future Roadmap)
 */
export default function AlertEscalationTracker({
  incidentId = "INC-8842",
  shipmentId = "RQ-1002",
  initialElapsedSeconds = 462, // e.g. 7m 42s active breach
  onEscalationChange
}) {
  const [elapsedSeconds, setElapsedSeconds] = useState(initialElapsedSeconds);
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setElapsedSeconds(prev => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused]);

  // Convert seconds to MM:SS format
  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainderSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainderSecs.toString().padStart(2, '0')}`;
  };

  const elapsedMins = elapsedSeconds / 60;

  // Escalation Definitions
  const levels = [
    {
      level: 1,
      name: "المستوى الأول (فوري)",
      timeLabel: "00:00 - 05:00 د",
      thresholdMins: 0,
      recipients: "السائق + مدير الأسطول + مسؤول الجودة",
      icon: "🚨"
    },
    {
      level: 2,
      name: "المستوى الثاني (+5 د دقائق)",
      timeLabel: "+5 دقائق",
      thresholdMins: 5,
      recipients: "مدير العمليات اللوجستية",
      icon: "⚠️"
    },
    {
      level: 3,
      name: "المستوى الثالث (+15 دقيقة)",
      timeLabel: "+15 دقيقة",
      thresholdMins: 15,
      recipients: "مدير عام الجودة وسلاسل التبريد",
      icon: "⚡"
    },
    {
      level: 4,
      name: "المستوى الرابع (+30 دقيقة)",
      timeLabel: "+30 دقيقة",
      thresholdMins: 30,
      recipients: "اتصال آلي ذكي + SMS للطوارئ (خريطة المستقبل)",
      icon: "📞"
    }
  ];

  // Determine Active Level Index
  const getActiveLevelIndex = () => {
    if (elapsedMins < 5) return 0;
    if (elapsedMins < 15) return 1;
    if (elapsedMins < 30) return 2;
    return 3;
  };

  const activeIndex = getActiveLevelIndex();

  return (
    <div className="bg-slate-800/90 border border-slate-700/50 rounded-2xl p-6 backdrop-blur-md text-slate-100 font-sans shadow-xl">
      {/* Top Banner & Active Live Ticker */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-slate-700/50 mb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-rose-400">تتبع تصعيد التنبيهات الحية</span>
          </div>
          <h3 className="text-lg font-bold text-white tracking-tight">
            مؤشر التصعيد التراكمي للحوادث الحرارية <span className="text-slate-400 text-sm font-normal">({incidentId} - الشحنة {shipmentId})</span>
          </h3>
        </div>

        <div className="flex items-center gap-3 bg-slate-900/90 border border-slate-700/60 rounded-xl px-4 py-2 self-start md:self-auto">
          <div className="text-right">
            <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">الزمن المنقضي للتجاوز</div>
            <div className="font-mono text-xl font-extrabold text-rose-400 tracking-wider">
              {formatTime(elapsedSeconds)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => setIsPaused(!isPaused)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white transition-colors"
            title={isPaused ? "استئناف المؤقت" : "إيقاف المؤقت مؤقتاً"}
          >
            {isPaused ? '▶' : '⏸'}
          </button>
        </div>
      </div>

      {/* Horizontal Escalation Timeline */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 relative">
        {levels.map((item, idx) => {
          const isActive = idx === activeIndex;
          const isPassed = idx < activeIndex;
          const isFuture = idx > activeIndex;

          let cardBorder = "border-slate-700/50 bg-slate-900/40 text-slate-400";
          let badgeBg = "bg-slate-800 text-slate-400 border-slate-700";
          let nodeBg = "bg-slate-700 text-slate-400 border-slate-600";

          if (isActive) {
            cardBorder = "border-rose-500/80 bg-slate-900/90 text-white shadow-lg shadow-rose-500/10 ring-1 ring-rose-500/50";
            badgeBg = "bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse";
            nodeBg = "bg-rose-500 text-white border-rose-400 animate-bounce";
          } else if (isPassed) {
            cardBorder = "border-emerald-500/40 bg-slate-900/70 text-slate-200";
            badgeBg = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
            nodeBg = "bg-emerald-500 text-slate-950 border-emerald-400";
          }

          return (
            <div key={item.level} className={`relative rounded-xl border p-4 transition-all duration-300 ${cardBorder}`}>
              {/* Connector line for desktop */}
              {idx < levels.length - 1 && (
                <div className="hidden md:block absolute top-1/2 -left-2 w-4 h-0.5 z-10 bg-slate-700 transform -translate-y-1/2">
                  <div className={`h-full ${isPassed ? 'bg-emerald-500' : 'bg-slate-700'}`}></div>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="text-xl">{item.icon}</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeBg}`}>
                  {isActive ? 'نشط الآن (Active)' : isPassed ? 'تم التصعيد ✓' : 'قادم'}
                </span>
              </div>

              <div className="space-y-1">
                <div className="text-xs font-bold tracking-tight text-slate-200">{item.name}</div>
                <div className="text-[11px] font-mono text-slate-400">{item.timeLabel}</div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-800 text-[11px] leading-relaxed">
                <span className="block text-[10px] text-slate-400 mb-0.5">جهات الإشعارات:</span>
                <span className={isActive ? "font-semibold text-rose-300" : isPassed ? "text-emerald-300" : "text-slate-500"}>
                  {item.recipients}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
