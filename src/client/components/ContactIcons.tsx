import { Mail, MessageCircle, Send } from "lucide-react";
import { siQq, siWechat, siX, siXiaohongshu, type SimpleIcon } from "simple-icons";
import { useState } from "react";

import { copyText } from "../lib/clipboard";

export interface ContactSettings {
  contact_email: string | null; contact_telegram: string | null; contact_whatsapp: string | null;
  contact_x: string | null; contact_xiaohongshu: string | null; contact_wechat: string | null;
  contact_qq: string | null; wechat_qr_url: string | null;
}

function BrandIcon({ icon }: { icon: SimpleIcon }) { return <svg className="brand-contact-icon" viewBox="0 0 24 24" aria-hidden="true"><path d={icon.path} /></svg>; }
const handleUrl = (value: string, base: string) => /^https?:\/\//i.test(value) ? value : `${base}${value.replace(/^@/, "")}`;

export function ContactIcons({ settings, notify }: { settings: ContactSettings; notify: (text: string, tone?: "success" | "error") => void }) {
  const [wechatOpen, setWechatOpen] = useState(false);
  const contacts = [
    settings.contact_email && <a key="email" href={`mailto:${settings.contact_email}`} aria-label="Email"><Mail /></a>,
    settings.contact_telegram && <a key="telegram" href={handleUrl(settings.contact_telegram, "https://t.me/")} target="_blank" rel="noopener noreferrer" aria-label="Telegram"><Send /></a>,
    settings.contact_whatsapp && <a key="whatsapp" href={`https://wa.me/${settings.contact_whatsapp.replace(/\D/g, "")}`} target="_blank" rel="noopener noreferrer" aria-label="WhatsApp"><MessageCircle /></a>,
    settings.contact_x && <a key="x" href={handleUrl(settings.contact_x, "https://x.com/")} target="_blank" rel="noopener noreferrer" aria-label="X"><BrandIcon icon={siX} /></a>,
    settings.contact_xiaohongshu && <a key="xiaohongshu" href={settings.contact_xiaohongshu} target="_blank" rel="noopener noreferrer" aria-label="小红书"><BrandIcon icon={siXiaohongshu} /></a>,
    settings.contact_wechat && <button key="wechat" onClick={() => setWechatOpen((value) => !value)} aria-label="微信"><BrandIcon icon={siWechat} /></button>,
    settings.contact_qq && <a key="qq" href={`https://wpa.qq.com/msgrd?v=3&uin=${encodeURIComponent(settings.contact_qq)}&site=qq&menu=yes`} target="_blank" rel="noopener noreferrer" aria-label="QQ"><BrandIcon icon={siQq} /></a>,
  ].filter(Boolean);
  return <div className="contact-icons-wrap"><div className="contact-icons">{contacts}</div>{wechatOpen && settings.contact_wechat && <div className="wechat-popover"><strong>微信：{settings.contact_wechat}</strong><button onClick={() => void copyText(settings.contact_wechat!).then((ok) => notify(ok ? "微信号已复制" : "复制失败", ok ? "success" : "error"))}>复制微信号</button>{settings.wechat_qr_url && <img src={settings.wechat_qr_url} alt="微信二维码" />}</div>}</div>;
}
