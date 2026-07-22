import type { FriendLink } from "../../shared/types/api";

/**
 * 页脚左侧友情链接。LOGO 多为站外地址，加载失败时退回纯文字，
 * 不让页脚出现破图；仅 LOGO 模式缺图时同样退回文字，否则整条不可见。
 */
export function FriendLinks({ links }: { links: FriendLink[] | null | undefined }) {
  if (!links || links.length === 0) return null;
  return (
    <div className="footer-friend-links" aria-label="友情链接">
      {links.map((link) => {
        const logo = link.display_mode === "text_only" ? null : link.logo_url;
        const showName = link.display_mode !== "logo_only" || !logo;
        return (
          <a className="footer-friend-link" key={link.id} href={link.url} target="_blank" rel="noopener noreferrer nofollow" title={link.name}>
            {logo ? <img className="friend-link-logo" src={logo} alt={showName ? "" : link.name} loading="lazy" decoding="async" referrerPolicy="no-referrer" /> : null}
            {showName ? <span>{link.name}</span> : null}
          </a>
        );
      })}
    </div>
  );
}
