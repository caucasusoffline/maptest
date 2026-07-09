import React from "react";
import { MetricType } from "../types";

export const Legend = React.memo(function Legend({ activeMetric, connectionType }: { activeMetric: MetricType, connectionType: 'fixed' | 'mobile' }) {
  let title = "ჩამოტვირთვა (Mbps)";
  let items = [];

  if (activeMetric === 'download') {
    if (connectionType === 'mobile') {
      items = [
        { color: "#10b981", label: "50+ Mbps (სწრაფი)" },
        { color: "#fbbf24", label: "30 - 50 Mbps (საშუალო)" },
        { color: "#f97316", label: "15 - 30 Mbps (ნელი)" },
        { color: "#ef4444", label: "< 15 Mbps (კრიტიკული)" }
      ];
    } else {
      items = [
        { color: "#10b981", label: "100+ Mbps (სწრაფი)" },
        { color: "#fbbf24", label: "50 - 100 Mbps (საშუალო)" },
        { color: "#f97316", label: "20 - 50 Mbps (ნელი)" },
        { color: "#ef4444", label: "< 20 Mbps (კრიტიკული)" }
      ];
    }
  } else if (activeMetric === 'upload') {
    title = "ატვირთვა (Mbps)";
    if (connectionType === 'mobile') {
      items = [
        { color: "#3b82f6", label: "20+ Mbps (სწრაფი)" },
        { color: "#8b5cf6", label: "10 - 20 Mbps (საშუალო)" },
        { color: "#f43f5e", label: "5 - 10 Mbps (ნელი)" },
        { color: "#ef4444", label: "< 5 Mbps (კრიტიკული)" }
      ];
    } else {
      items = [
        { color: "#3b82f6", label: "50+ Mbps (სწრაფი)" },
        { color: "#8b5cf6", label: "20 - 50 Mbps (საშუალო)" },
        { color: "#f43f5e", label: "10 - 20 Mbps (ნელი)" },
        { color: "#ef4444", label: "< 10 Mbps (კრიტიკული)" }
      ];
    }
  } else if (activeMetric === 'ping') {
    title = "დაყოვნება / Ping (ms)";
    if (connectionType === 'mobile') {
      items = [
        { color: "#10b981", label: "< 30 ms (იდეალური)" },
        { color: "#fbbf24", label: "30 - 50 ms (კარგი)" },
        { color: "#f97316", label: "50 - 80 ms (საშუალო)" },
        { color: "#ef4444", label: "> 80 ms (ცუდი)" }
      ];
    } else {
      items = [
        { color: "#10b981", label: "< 20 ms (იდეალური)" },
        { color: "#fbbf24", label: "20 - 40 ms (კარგი)" },
        { color: "#f97316", label: "40 - 80 ms (საშუალო)" },
        { color: "#ef4444", label: "> 80 ms (ცუდი)" }
      ];
    }
  }

  return (
    <div className="absolute top-[130px] right-2 md:top-auto md:bottom-4 md:right-4 z-[1000] rounded-xl bg-card/90 md:bg-card p-2 md:p-3 flex flex-col gap-1.5 border border-white/10 shadow-2xl backdrop-blur-xl text-white font-sans scale-80 md:scale-90 origin-top-right md:origin-bottom-right">
      <h3 className="text-[9px] md:text-[10px] font-semibold text-gray-300 uppercase tracking-wider mb-0.5">
        {title}
      </h3>
      <div className="flex flex-col gap-1 text-[10px] md:text-xs">
        {items.map((item, i) => (
          <LegendItem key={i} color={item.color} label={item.label} />
        ))}
      </div>
    </div>
  );
});

function LegendItem({ color, label }: { color: string; label: string; key?: React.Key }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-3 h-3 rounded shadow-sm" style={{ backgroundColor: color }}></div>
      <span className="text-gray-200">{label}</span>
    </div>
  );
}

