import { FormEvent, useState } from "react";

import { Modal } from "./ui";

/**
 * 取代 window.prompt 的输入弹窗——原生弹窗在黑金界面里样式无法统一，
 * 且在移动端体验差。删除类确认仍使用 window.confirm（更安全、更难误触）。
 */
export function PromptModal({
  title,
  label,
  hint,
  initialValue = "",
  placeholder,
  multiline,
  maxLength,
  confirmText = "保存",
  onCancel,
  onSubmit,
}: {
  title: string;
  label: string;
  hint?: string;
  initialValue?: string;
  placeholder?: string;
  multiline?: boolean;
  maxLength?: number;
  confirmText?: string;
  onCancel: () => void;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);

  function submit(event: FormEvent) {
    event.preventDefault();
    onSubmit(value.trim());
  }

  return (
    <Modal title={title} onClose={onCancel}>
      <form className="form-stack" onSubmit={submit}>
        <label className="field">
          <span>{label}</span>
          {multiline ? (
            <textarea
              value={value}
              onChange={(event) => setValue(event.target.value)}
              maxLength={maxLength}
              placeholder={placeholder}
              autoFocus
            />
          ) : (
            <input
              value={value}
              onChange={(event) => setValue(event.target.value)}
              maxLength={maxLength}
              placeholder={placeholder}
              autoFocus
            />
          )}
          {maxLength && (
            <small style={{ color: "var(--text-tertiary)", fontSize: 12 }}>
              {value.length} / {maxLength}
            </small>
          )}
        </label>
        {hint && <p style={{ color: "var(--text-tertiary)", fontSize: 13 }}>{hint}</p>}
        <div className="modal-foot">
          <button type="button" className="btn btn-secondary" onClick={onCancel}>
            取消
          </button>
          <button type="submit" className="btn btn-primary">
            {confirmText}
          </button>
        </div>
      </form>
    </Modal>
  );
}
