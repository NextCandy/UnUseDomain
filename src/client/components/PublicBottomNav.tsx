interface PublicBottomNavProps {
  onAdvanced: () => void;
}

export function PublicBottomNav({ onAdvanced }: PublicBottomNavProps) {
  return (
    <nav className="public-bottom-nav" aria-label="移动端快捷导航">
      <button type="button" onClick={() => document.getElementById("domains")?.scrollIntoView({ behavior: "smooth" })}><span aria-hidden="true">⌂</span><b>首页</b></button>
      <button type="button" onClick={onAdvanced}><span aria-hidden="true">≡</span><b>筛选</b></button>
    </nav>
  );
}
