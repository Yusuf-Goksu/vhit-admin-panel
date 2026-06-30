"use client";

import { useMemo } from "react";

import Card from "@/components/ui/Card";
import { formatDateTime, toDate } from "@/lib/format";
import { Appointment } from "@/types/domain";

type AppointmentCalendarProps = {
  appointments: Appointment[];
  month: string;
  onMonthChange: (month: string) => void;
};

function statusClass(status: string) {
  if (status === "scheduled") return "bg-blue-100 text-blue-700";
  if (status === "completed") return "bg-green-100 text-green-700";
  return "bg-red-100 text-red-700";
}

export default function AppointmentCalendar({
  appointments,
  month,
  onMonthChange,
}: AppointmentCalendarProps) {
  const [year, monthIndex] = month.split("-").map(Number);

  const weeks = useMemo(() => {
    const firstDay = new Date(year, monthIndex - 1, 1);
    const lastDay = new Date(year, monthIndex, 0);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const days: Array<{ date: Date | null; items: Appointment[] }> = [];

    for (let i = 0; i < startOffset; i += 1) {
      days.push({ date: null, items: [] });
    }

    for (let day = 1; day <= lastDay.getDate(); day += 1) {
      const date = new Date(year, monthIndex - 1, day);
      const items = appointments.filter((appointment) => {
        const appointmentDate = toDate(appointment.appointmentAt);
        if (!appointmentDate) return false;
        return (
          appointmentDate.getFullYear() === date.getFullYear() &&
          appointmentDate.getMonth() === date.getMonth() &&
          appointmentDate.getDate() === date.getDate()
        );
      });

      days.push({ date, items });
    }

    while (days.length % 7 !== 0) {
      days.push({ date: null, items: [] });
    }

    const rows: typeof days[] = [];
    for (let i = 0; i < days.length; i += 7) {
      rows.push(days.slice(i, i + 7));
    }

    return rows;
  }, [appointments, monthIndex, year]);

  function shiftMonth(offset: number) {
    const date = new Date(year, monthIndex - 1 + offset, 1);
    onMonthChange(`${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`);
  }

  const monthLabel = new Date(year, monthIndex - 1, 1).toLocaleDateString("tr-TR", {
    month: "long",
    year: "numeric",
  });

  return (
    <Card>
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">Takvim Görünümü</h2>
        <div className="flex items-center gap-2">
          <button type="button" className="rounded-lg border px-3 py-1 text-sm" onClick={() => shiftMonth(-1)}>
            Önceki
          </button>
          <span className="min-w-36 text-center text-sm font-semibold capitalize">{monthLabel}</span>
          <button type="button" className="rounded-lg border px-3 py-1 text-sm" onClick={() => shiftMonth(1)}>
            Sonraki
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold uppercase text-slate-500">
        {["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"].map((label) => (
          <div key={label}>{label}</div>
        ))}
      </div>

      <div className="mt-2 space-y-2">
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="grid grid-cols-7 gap-2">
            {week.map((cell, cellIndex) => (
              <div
                key={cellIndex}
                className="min-h-28 rounded-xl border border-slate-100 bg-slate-50/60 p-2"
              >
                {cell.date && (
                  <>
                    <p className="text-xs font-semibold text-slate-700">{cell.date.getDate()}</p>
                    <div className="mt-2 space-y-1">
                      {cell.items.slice(0, 3).map((appointment) => (
                        <div
                          key={appointment.id}
                          className={`rounded-md px-2 py-1 text-[10px] font-medium ${statusClass(appointment.status)}`}
                          title={appointment.title}
                        >
                          {formatDateTime(appointment.appointmentAt).split(" ")[1]} · {appointment.title}
                        </div>
                      ))}
                      {cell.items.length > 3 && (
                        <p className="text-[10px] text-slate-500">+{cell.items.length - 3} daha</p>
                      )}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ))}
      </div>
    </Card>
  );
}
