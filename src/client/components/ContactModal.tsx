import { copyText } from "../lib/clipboard";
import type { SiteSettings } from "../lib/site";
import { Modal } from "./ui";

export function ContactModal({
  settings,
  onClose,
  onNotify,
}: {
  settings: SiteSettings;
  onClose: () => void;
  onNotify: (text: string, tone?: "success" | "error") => void;
}) {
  const wechat = settings.contact_wechat;
  return (
    <Modal title="联系玩米" onClose={onClose}>
      <p style={{ color: "var(--text-tertiary)", fontSize: 14, marginBottom: 18 }}>请附上你感兴趣的完整域名。</p>
      <div className="contact-list">
        {settings.contact_email && (
          <a href={`mailto:${settings.contact_email}`}>
            邮箱 <b>{settings.contact_email}</b>
          </a>
        )}
        {settings.contact_telegram && (
          <a
            href={`https://t.me/${settings.contact_telegram.replace(/^@/, "")}`}
            target="_blank"
            rel="noreferrer"
          >
            Telegram <b>{settings.contact_telegram}</b>
          </a>
        )}
        {wechat && (
          <button
            onClick={() =>
              void copyText(wechat).then((ok) =>
                onNotify(ok ? "微信号已复制" : "复制失败", ok ? "success" : "error"),
              )
            }
          >
            微信 <b>{wechat}</b>
          </button>
        )}
        {settings.wechat_qr_url && <img className="qr-code" src={settings.wechat_qr_url} alt="玩米微信二维码" />}
      </div>
    </Modal>
  );
}
