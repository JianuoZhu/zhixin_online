import { Button, Modal, ModalBody, ModalFooter, ModalHeader } from "flowbite-react";
import { HiExclamationCircle } from "react-icons/hi";

type ConfirmModalProps = {
  show: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  danger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export default function ConfirmModal({
  show,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  danger = false,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <Modal show={show} onClose={onCancel} size="md" popup>
      <ModalHeader />
      <ModalBody>
        <div className="text-center">
          <HiExclamationCircle className={`mx-auto mb-4 h-14 w-14 ${danger ? "text-red-400" : "text-gray-400 dark:text-gray-200"}`} />
          <h3 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
          <p className="mb-5 text-sm text-gray-500 dark:text-gray-400">{message}</p>
          <div className="flex justify-center gap-4">
            <Button color={danger ? "failure" : "primary"} onClick={onConfirm}>
              {confirmText}
            </Button>
            <Button color="gray" onClick={onCancel}>
              {cancelText}
            </Button>
          </div>
        </div>
      </ModalBody>
      <ModalFooter />
    </Modal>
  );
}
