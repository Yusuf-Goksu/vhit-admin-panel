"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

import Button from "@/components/ui/Button";
import Card from "@/components/ui/Card";
import EmptyState from "@/components/ui/EmptyState";
import Input from "@/components/ui/Input";
import LoadingState from "@/components/ui/LoadingState";
import Modal from "@/components/ui/Modal";
import PageHeader from "@/components/ui/PageHeader";
import PaginationControls from "@/components/ui/PaginationControls";
import Select from "@/components/ui/Select";
import Textarea from "@/components/ui/Textarea";
import { useAuth } from "@/contexts/AuthContext";
import { useConfirm } from "@/contexts/ConfirmContext";
import { useToast } from "@/contexts/ToastContext";
import {
  createTask,
  deleteTask,
  fetchTeamMembers,
  updateTask,
} from "@/features/tasks/services/taskService";
import { AdminTask, TaskPriority, TaskStatus, TeamMember } from "@/features/tasks/types/task";
import { taskPriorityLabel, taskStatusLabel } from "@/features/tasks/utils/taskLabels";
import { useAdminListQuery } from "@/hooks/useAdminListQuery";
import { AdminApiError } from "@/lib/admin-api";
import { formatDateTime } from "@/lib/format";

const emptyForm = {
  title: "",
  description: "",
  status: "todo" as TaskStatus,
  priority: "normal" as TaskPriority,
  assigneeIds: [] as string[],
};

function StatusBadge({ status }: { status: TaskStatus }) {
  const className =
    status === "done"
      ? "bg-green-100 text-green-700"
      : status === "in_progress"
        ? "bg-amber-100 text-amber-700"
        : "bg-slate-100 text-slate-700";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{taskStatusLabel(status)}</span>;
}

function PriorityBadge({ priority }: { priority: TaskPriority }) {
  const className =
    priority === "high"
      ? "bg-red-100 text-red-700"
      : priority === "normal"
        ? "bg-indigo-100 text-indigo-700"
        : "bg-slate-100 text-slate-600";

  return <span className={`rounded-full px-3 py-1 text-xs font-semibold ${className}`}>{taskPriorityLabel(priority)}</span>;
}

export default function TasksPage() {
  const { user } = useAuth();
  const { confirm } = useConfirm();
  const { showSuccess, showError } = useToast();
  const listQuery = useAdminListQuery<AdminTask>("/api/admin/tasks/list");

  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<AdminTask | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [statusFilter, setStatusFilter] = useState("");
  const [assigneeFilter, setAssigneeFilter] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  function buildFilters() {
    return {
      status: statusFilter || undefined,
      assigneeId: assigneeFilter || undefined,
    };
  }

  async function reloadAll() {
    await listQuery.reload(buildFilters());
  }

  useEffect(() => {
    setInitialLoading(true);

    Promise.all([listQuery.reload(buildFilters()), fetchTeamMembers()])
      .then(([, teamResponse]) => setTeamMembers(teamResponse.items))
      .catch(() => showError("Görevler yüklenemedi."))
      .finally(() => setInitialLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    listQuery.reload(buildFilters()).catch(() => showError("Liste güncellenemedi."));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, assigneeFilter]);

  const isLoading = initialLoading || listQuery.isLoading;
  const teamMap = useMemo(
    () => Object.fromEntries(teamMembers.map((member) => [member.id, member])),
    [teamMembers]
  );

  function openCreateModal() {
    setEditing(null);
    setForm(emptyForm);
    setFormOpen(true);
  }

  function openEditModal(task: AdminTask) {
    setEditing(task);
    setForm({
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      assigneeIds: task.assigneeIds,
    });
    setFormOpen(true);
  }

  function toggleAssignee(memberId: string) {
    setForm((current) => ({
      ...current,
      assigneeIds: current.assigneeIds.includes(memberId)
        ? current.assigneeIds.filter((id) => id !== memberId)
        : [...current.assigneeIds, memberId],
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const title = form.title.trim();

    if (!title) {
      showError("Görev başlığı zorunludur.");
      return;
    }

    setIsSaving(true);

    try {
      if (editing) {
        await updateTask({
          taskId: editing.id,
          title,
          description: form.description.trim(),
          status: form.status,
          priority: form.priority,
          assigneeIds: form.assigneeIds,
        });
        showSuccess("Görev güncellendi.");
      } else {
        await createTask({
          title,
          description: form.description.trim(),
          priority: form.priority,
          assigneeIds: form.assigneeIds,
        });
        showSuccess("Görev oluşturuldu.");
      }

      setFormOpen(false);
      setEditing(null);
      setForm(emptyForm);
      await reloadAll();
    } catch (error) {
      showError(error instanceof AdminApiError ? error.message : "Kayıt başarısız.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(task: AdminTask) {
    const approved = await confirm({
      title: "Görevi sil",
      description: `"${task.title}" görevi kalıcı olarak silinecek.`,
      confirmLabel: "Sil",
      variant: "danger",
    });

    if (!approved) return;

    try {
      await deleteTask(task.id);
      showSuccess("Görev silindi.");
      await reloadAll();
    } catch (error) {
      showError(error instanceof AdminApiError ? error.message : "Silme başarısız.");
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Görevler"
        description="Ekip içi görevlerinizi tek yerden yönetin."
        actions={
          <>
            <Button type="button" variant="outline" onClick={reloadAll}>
              Yenile
            </Button>
            <Button type="button" onClick={openCreateModal}>
              Yeni Görev
            </Button>
          </>
        }
      />

      <Card>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <Select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="">Tüm durumlar</option>
            <option value="todo">Bekliyor</option>
            <option value="in_progress">Devam Ediyor</option>
            <option value="done">Tamamlandı</option>
          </Select>

          <Select value={assigneeFilter} onChange={(event) => setAssigneeFilter(event.target.value)}>
            <option value="">Tüm atananlar</option>
            {teamMembers.map((member) => (
              <option key={member.id} value={member.id}>
                {member.fullName}
                {member.isCurrentUser ? " (Ben)" : ""}
              </option>
            ))}
          </Select>

          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Aktif admin: <span className="font-semibold text-slate-900">{user?.fullName}</span>
          </div>
        </div>
      </Card>

      {isLoading ? (
        <LoadingState label="Görevler yükleniyor..." />
      ) : listQuery.items.length === 0 ? (
        <EmptyState title="Görev bulunamadı" description="İlk görevi ekleyerek başlayın." />
      ) : (
        <Card padding="sm" className="overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="p-4 font-medium">Görev</th>
                  <th className="p-4 font-medium">Durum</th>
                  <th className="p-4 font-medium">Öncelik</th>
                  <th className="p-4 font-medium">Atananlar</th>
                  <th className="p-4 font-medium">Oluşturan</th>
                  <th className="p-4 font-medium">Tarih</th>
                  <th className="p-4 font-medium">İşlem</th>
                </tr>
              </thead>
              <tbody>
                {listQuery.items.map((task) => (
                  <tr key={task.id} className="border-t border-slate-100">
                    <td className="p-4">
                      <p className="font-semibold text-slate-900">{task.title}</p>
                      {task.description && <p className="mt-1 text-slate-500">{task.description}</p>}
                    </td>
                    <td className="p-4"><StatusBadge status={task.status} /></td>
                    <td className="p-4"><PriorityBadge priority={task.priority} /></td>
                    <td className="p-4 text-slate-600">
                      {task.assigneeIds.length
                        ? task.assigneeIds.map((id) => teamMap[id]?.fullName ?? id).join(", ")
                        : "Atanmadı"}
                    </td>
                    <td className="p-4 text-slate-600">{task.createdByName || "-"}</td>
                    <td className="p-4 text-slate-600">{formatDateTime(task.createdAt)}</td>
                    <td className="p-4">
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => openEditModal(task)}>
                          Düzenle
                        </Button>
                        <Button type="button" size="sm" variant="danger" onClick={() => handleDelete(task)}>
                          Sil
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <PaginationControls
        page={listQuery.page}
        itemCount={listQuery.items.length}
        pageSize={listQuery.pageSize}
        hasNext={listQuery.hasNext}
        hasPrevious={listQuery.hasPrevious}
        isLoading={listQuery.isLoading}
        onPrevious={() => listQuery.previousPage()}
        onNext={() => listQuery.nextPage()}
      />

      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Görevi Düzenle" : "Yeni Görev"}
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
              İptal
            </Button>
            <Button type="submit" form="task-form" disabled={isSaving}>
              {isSaving ? "Kaydediliyor..." : editing ? "Güncelle" : "Oluştur"}
            </Button>
          </>
        }
      >
        <form id="task-form" onSubmit={handleSubmit} className="space-y-4">
          <Input
            label="Başlık"
            value={form.title}
            onChange={(event) => setForm({ ...form, title: event.target.value })}
            required
          />

          <Textarea
            label="Açıklama"
            value={form.description}
            onChange={(event) => setForm({ ...form, description: event.target.value })}
            rows={4}
          />

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {editing && (
              <Select
                label="Durum"
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value as TaskStatus })}
              >
                <option value="todo">Bekliyor</option>
                <option value="in_progress">Devam Ediyor</option>
                <option value="done">Tamamlandı</option>
              </Select>
            )}

            <Select
              label="Öncelik"
              value={form.priority}
              onChange={(event) => setForm({ ...form, priority: event.target.value as TaskPriority })}
            >
              <option value="low">Düşük</option>
              <option value="normal">Normal</option>
              <option value="high">Yüksek</option>
            </Select>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-slate-700">Atanan kişiler</p>
            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
              {teamMembers.map((member) => (
                <label key={member.id} className="flex items-center gap-3 rounded-lg bg-white px-3 py-2">
                  <input
                    type="checkbox"
                    checked={form.assigneeIds.includes(member.id)}
                    onChange={() => toggleAssignee(member.id)}
                  />
                  <span className="text-sm">
                    <span className="font-semibold text-slate-900">{member.fullName}</span>
                    <span className="ml-2 text-slate-500">{member.email}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}
