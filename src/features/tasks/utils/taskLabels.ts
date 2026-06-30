export function taskStatusLabel(status: string) {
  switch (status) {
    case "todo":
      return "Bekliyor";
    case "in_progress":
      return "Devam Ediyor";
    case "done":
      return "Tamamlandı";
    default:
      return status;
  }
}

export function taskPriorityLabel(priority: string) {
  switch (priority) {
    case "low":
      return "Düşük";
    case "normal":
      return "Normal";
    case "high":
      return "Yüksek";
    default:
      return priority;
  }
}
