"use client";

import { useEffect, useRef } from "react";

export type SectionAnchorItem = {
  id: string;
  label: string;
  count?: number;
};

type SectionAnchorNavProps = {
  items: SectionAnchorItem[];
  /** ?section= 锚点参数：服务端解析后传入，首次渲染即定位到目标区块 */
  initialSection?: string;
};

/** 渲染锚点导航；当前区块高亮（aria-current）由 IntersectionObserver 维护，落点由 ?section= 参数驱动。 */
export function SectionAnchorNav({ items, initialSection }: SectionAnchorNavProps) {
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!initialSection) return;
    const target = document.getElementById(initialSection);
    target?.scrollIntoView();
  }, [initialSection]);

  useEffect(() => {
    const nav = navRef.current;
    if (!nav || typeof IntersectionObserver === "undefined") return;
    const links = Array.from(nav.querySelectorAll<HTMLAnchorElement>("a[href^='#']"));
    const linkById = new Map<string, HTMLAnchorElement>();
    const targets: Element[] = [];
    for (const link of links) {
      const id = (link.getAttribute("href") ?? "").slice(1);
      const target = id ? document.getElementById(id) : null;
      if (target) {
        linkById.set(id, link);
        targets.push(target);
      }
    }
    const setCurrent = (id: string) => {
      for (const link of links) link.removeAttribute("aria-current");
      linkById.get(id)?.setAttribute("aria-current", "true");
    };
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setCurrent(entry.target.id);
        }
      },
      { rootMargin: "-25% 0px -65% 0px", threshold: 0 },
    );
    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  return (
    <nav ref={navRef} className="anchors" aria-label="页面内区块">
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          aria-current={initialSection === item.id ? "true" : undefined}
        >
          {item.label}
          {typeof item.count === "number" ? <span className="n">{item.count}</span> : null}
        </a>
      ))}
    </nav>
  );
}
