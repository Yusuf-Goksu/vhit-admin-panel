const actionLabels: Record<string, string> = {
  "doctors.create": "Doktor oluşturuldu",
  "doctors.update": "Doktor güncellendi",
  "doctors.delete": "Doktor silindi",
  "doctors.toggle-status": "Doktor durumu değiştirildi",
  "doctors.reset-password": "Doktor şifresi sıfırlandı",
  "clinics.create": "Klinik oluşturuldu",
  "clinics.update": "Klinik güncellendi",
  "clinics.delete": "Klinik silindi",
  "clinics.toggle-status": "Klinik durumu değiştirildi",
  "patients.create": "Hasta oluşturuldu",
  "patients.update": "Hasta güncellendi",
  "patients.delete": "Hasta silindi",
  "patients.toggle-archive": "Hasta arşiv durumu değiştirildi",
  "appointments.create": "Randevu oluşturuldu",
  "appointments.update": "Randevu güncellendi",
  "appointments.delete": "Randevu silindi",
  "appointments.update-status": "Randevu durumu değiştirildi",
  "tests.delete": "Test kaydı silindi",
  "feedbacks.send-message": "Geri bildirim mesajı gönderildi",
  "feedbacks.update-status": "Geri bildirim durumu değiştirildi",
  "feedbacks.update-note": "Geri bildirim notu güncellendi",
  "feedbacks.mark-read": "Geri bildirim okundu",
  "feedbacks.delete-message": "Geri bildirim mesajı silindi",
  "feedbacks.delete": "Geri bildirim silindi",
  "tasks.create": "Görev oluşturuldu",
  "tasks.update": "Görev güncellendi",
  "tasks.delete": "Görev silindi",
};

export function getAuditActionLabel(action: string) {
  return actionLabels[action] ?? action;
}
