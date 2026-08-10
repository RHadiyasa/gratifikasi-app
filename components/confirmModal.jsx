"use client";
import {
  Modal,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  Button,
} from "@heroui/react";

export default function ConfirmModal({
  isOpen,
  onClose,
  title,
  message,
  confirmText = "Ya",
  cancelText = "Batal",
  // Aksi tidak selalu merusak (mis. ubah status) — biarkan pemanggil memilih.
  confirmColor = "danger",
  isLoading = false,
  onConfirm,
}) {
  return (
    <Modal
      hideCloseButton
      isDismissable={!isLoading}
      isOpen={isOpen}
      onOpenChange={(terbuka) => {
        if (!terbuka && !isLoading) onClose();
      }}
    >
      <ModalContent>
        <ModalHeader className="font-semibold">{title}</ModalHeader>
        <ModalBody className="text-sm text-default-600">{message}</ModalBody>
        <ModalFooter>
          <Button isDisabled={isLoading} variant="light" onPress={onClose}>
            {cancelText}
          </Button>
          <Button color={confirmColor} isLoading={isLoading} onPress={onConfirm}>
            {confirmText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
