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
  onConfirm,
}) {
  return (
    <Modal isOpen={isOpen} onOpenChange={onClose} hideCloseButton>
      <ModalContent>
        <ModalHeader className="font-semibold">{title}</ModalHeader>
        <ModalBody>{message}</ModalBody>
        <ModalFooter>
          <Button variant="light" onPress={onClose}>
            {cancelText}
          </Button>
          <Button color="danger" onPress={onConfirm}>
            {confirmText}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}
