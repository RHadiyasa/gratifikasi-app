"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Table, TableHeader, TableColumn, TableBody, TableRow, TableCell,
  Button, Input, Chip, Tooltip,
  Modal, ModalContent, ModalHeader, ModalBody, ModalFooter,
  Select, SelectItem,
  useDisclosure,
} from "@heroui/react";
import { toast } from "react-toastify";
import axios from "axios";
import {
  Users, Search, Pencil, Trash2, ShieldBan, ShieldCheck,
  Loader2, Lock, Eye, EyeOff, ArrowLeft,
} from "lucide-react";
import NextLink from "next/link";
import { ROLE_LABELS } from "@/lib/permissions";

const ROLE_COLOR_MAP = {
  developer: "warning",
  admin: "primary",
  zi: "secondary",
  upg: "success",
};

const EDITABLE_ROLES = [
  { key: "admin", label: "Master Admin" },
  { key: "zi", label: "Tim Zona Integritas" },
  { key: "upg", label: "Tim UPG" },
];

export default function AccountsPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Edit modal
  const editModal = useDisclosure();
  const [editUser, setEditUser] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [editLoading, setEditLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  // Delete modal
  const deleteModal = useDisclosure();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      const { data } = await axios.get("/api/auth/users");
      if (data.success) setUsers(data.users);
    } catch (err) {
      toast.error("Gagal memuat data pengguna");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const filtered = users.filter((u) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      u.name?.toLowerCase().includes(q) ||
      u.nip?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.role?.toLowerCase().includes(q)
    );
  });

  // ── Edit ──────────────────────────────────────────────
  const openEdit = (user) => {
    setEditUser(user);
    setEditForm({
      name: user.name,
      nip: user.nip,
      jabatan: user.jabatan,
      unitKerja: user.unitKerja,
      email: user.email,
      noTelp: user.noTelp,
      role: user.role,
      password: "",
    });
    setShowPass(false);
    editModal.onOpen();
  };

  const handleEdit = async () => {
    if (!editUser) return;
    try {
      setEditLoading(true);
      const payload = { ...editForm };
      if (!payload.password) delete payload.password;

      const { data } = await axios.patch(`/api/auth/users/${editUser._id}`, payload);
      if (data.success) {
        toast.success(`Akun ${data.user.name} berhasil diperbarui`);
        editModal.onClose();
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Gagal memperbarui akun");
    } finally {
      setEditLoading(false);
    }
  };

  // ── Delete ────────────────────────────────────────────
  const openDelete = (user) => {
    setDeleteTarget(user);
    deleteModal.onOpen();
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleteLoading(true);
      const { data } = await axios.delete(`/api/auth/users/${deleteTarget._id}`);
      if (data.success) {
        toast.success(`Akun ${deleteTarget.name} berhasil dihapus`);
        deleteModal.onClose();
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Gagal menghapus akun");
    } finally {
      setDeleteLoading(false);
    }
  };

  // ── Block/Unblock ─────────────────────────────────────
  const toggleBlock = async (user) => {
    const newState = !user.isBlocked;
    try {
      const { data } = await axios.patch(`/api/auth/users/${user._id}`, {
        isBlocked: newState,
      });
      if (data.success) {
        toast.success(`Akun ${user.name} ${newState ? "diblokir" : "dibuka blokirnya"}`);
        fetchUsers();
      }
    } catch (err) {
      toast.error(err.response?.data?.error || "Gagal mengubah status blokir");
    }
  };

  const isDeveloper = (user) => user.role === "developer";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <Button
          as={NextLink}
          href="/dashboard"
          variant="light"
          size="sm"
          className="mb-4 text-default-500"
          startContent={<ArrowLeft size={14} />}
        >
          Kembali
        </Button>

        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center">
            <Users size={18} className="text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-black">Kelola Akun</h1>
            <p className="text-xs text-default-400">
              Edit, hapus, dan blokir akun pengguna sistem
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <Input
          placeholder="Cari berdasarkan nama, NIP, email, atau role..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          startContent={<Search size={14} className="text-default-400" />}
          variant="bordered"
          classNames={{
            inputWrapper: "rounded-xl bg-default-50/50 dark:bg-default-100/5",
          }}
        />
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {["admin", "zi", "upg"].map((r) => {
          const count = users.filter((u) => u.role === r).length;
          return (
            <div
              key={r}
              className="rounded-xl border border-default-200/60 bg-background/70 backdrop-blur-md px-4 py-3"
            >
              <p className="text-xs text-default-400 mb-1">{ROLE_LABELS[r]}</p>
              <p className="text-lg font-bold">{count}</p>
            </div>
          );
        })}
        <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3">
          <p className="text-xs text-default-400 mb-1">Diblokir</p>
          <p className="text-lg font-bold text-red-500">
            {users.filter((u) => u.isBlocked).length}
          </p>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-2xl border border-default-200/60 bg-background/70 backdrop-blur-md overflow-hidden">
        <Table
          aria-label="Tabel pengguna"
          removeWrapper
          classNames={{
            th: "bg-default-100/50 text-default-500 text-xs uppercase tracking-wider",
            td: "py-3",
          }}
        >
          <TableHeader>
            <TableColumn>Nama</TableColumn>
            <TableColumn>NIP</TableColumn>
            <TableColumn>Unit Kerja</TableColumn>
            <TableColumn>Role</TableColumn>
            <TableColumn>Status</TableColumn>
            <TableColumn align="center">Aksi</TableColumn>
          </TableHeader>
          <TableBody
            emptyContent={loading ? "Memuat..." : "Tidak ada data pengguna"}
            isLoading={loading}
            items={filtered}
          >
            {(user) => (
              <TableRow key={user._id}>
                <TableCell>
                  <div>
                    <p className="text-sm font-medium">{user.name}</p>
                    <p className="text-xs text-default-400">{user.email}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm text-default-600">{user.nip}</span>
                </TableCell>
                <TableCell>
                  <div>
                    <p className="text-sm">{user.unitKerja}</p>
                    <p className="text-xs text-default-400">{user.jabatan}</p>
                  </div>
                </TableCell>
                <TableCell>
                  <Chip
                    size="sm"
                    variant="flat"
                    color={ROLE_COLOR_MAP[user.role] || "default"}
                  >
                    {ROLE_LABELS[user.role] || user.role}
                  </Chip>
                </TableCell>
                <TableCell>
                  {user.isBlocked ? (
                    <Chip size="sm" variant="flat" color="danger">Diblokir</Chip>
                  ) : (
                    <Chip size="sm" variant="flat" color="success">Aktif</Chip>
                  )}
                </TableCell>
                <TableCell>
                  {isDeveloper(user) ? (
                    <span className="text-xs text-default-300">—</span>
                  ) : (
                    <div className="flex items-center justify-center gap-1">
                      <Tooltip content="Edit">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          onPress={() => openEdit(user)}
                        >
                          <Pencil size={14} />
                        </Button>
                      </Tooltip>
                      <Tooltip content={user.isBlocked ? "Buka Blokir" : "Blokir"}>
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color={user.isBlocked ? "success" : "warning"}
                          onPress={() => toggleBlock(user)}
                        >
                          {user.isBlocked ? <ShieldCheck size={14} /> : <ShieldBan size={14} />}
                        </Button>
                      </Tooltip>
                      <Tooltip content="Hapus" color="danger">
                        <Button
                          isIconOnly
                          size="sm"
                          variant="light"
                          color="danger"
                          onPress={() => openDelete(user)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      </Tooltip>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* ── Edit Modal ─────────────────────────────────── */}
      <Modal isOpen={editModal.isOpen} onOpenChange={editModal.onOpenChange} size="2xl">
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Edit Akun — {editUser?.name}</ModalHeader>
              <ModalBody>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Nama"
                    variant="bordered"
                    value={editForm.name || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  />
                  <Input
                    label="NIP"
                    variant="bordered"
                    value={editForm.nip || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, nip: e.target.value }))}
                  />
                  <Input
                    label="Jabatan"
                    variant="bordered"
                    value={editForm.jabatan || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, jabatan: e.target.value }))}
                  />
                  <Input
                    label="Unit Kerja"
                    variant="bordered"
                    value={editForm.unitKerja || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, unitKerja: e.target.value }))}
                  />
                  <Input
                    label="Email"
                    type="email"
                    variant="bordered"
                    value={editForm.email || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  />
                  <Input
                    label="No. Telepon"
                    variant="bordered"
                    value={editForm.noTelp || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, noTelp: e.target.value }))}
                  />
                  <Select
                    label="Role"
                    variant="bordered"
                    selectedKeys={editForm.role ? [editForm.role] : []}
                    onSelectionChange={(keys) => {
                      const val = Array.from(keys)[0];
                      if (val) setEditForm((f) => ({ ...f, role: val }));
                    }}
                  >
                    {EDITABLE_ROLES.map((r) => (
                      <SelectItem key={r.key}>{r.label}</SelectItem>
                    ))}
                  </Select>
                  <Input
                    label="Password Baru (opsional)"
                    variant="bordered"
                    type={showPass ? "text" : "password"}
                    placeholder="Kosongkan jika tidak diubah"
                    value={editForm.password || ""}
                    onChange={(e) => setEditForm((f) => ({ ...f, password: e.target.value }))}
                    startContent={<Lock size={14} className="text-default-400" />}
                    endContent={
                      <button
                        type="button"
                        onClick={() => setShowPass((v) => !v)}
                        className="text-default-400 hover:text-foreground transition-colors"
                      >
                        {showPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    }
                  />
                </div>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  Batal
                </Button>
                <Button
                  color="primary"
                  onPress={handleEdit}
                  isDisabled={editLoading}
                  startContent={editLoading && <Loader2 size={14} className="animate-spin" />}
                >
                  Simpan
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>

      {/* ── Delete Confirmation Modal ────────────────── */}
      <Modal isOpen={deleteModal.isOpen} onOpenChange={deleteModal.onOpenChange}>
        <ModalContent>
          {(onClose) => (
            <>
              <ModalHeader>Hapus Akun</ModalHeader>
              <ModalBody>
                <p className="text-sm">
                  Apakah Anda yakin ingin menghapus akun{" "}
                  <strong>{deleteTarget?.name}</strong> ({deleteTarget?.role})?
                  Tindakan ini tidak dapat dibatalkan.
                </p>
              </ModalBody>
              <ModalFooter>
                <Button variant="flat" onPress={onClose}>
                  Batal
                </Button>
                <Button
                  color="danger"
                  onPress={handleDelete}
                  isDisabled={deleteLoading}
                  startContent={deleteLoading && <Loader2 size={14} className="animate-spin" />}
                >
                  Hapus
                </Button>
              </ModalFooter>
            </>
          )}
        </ModalContent>
      </Modal>
    </div>
  );
}
