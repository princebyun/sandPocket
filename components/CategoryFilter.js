"use client";

export default function CategoryFilter({ current, onChange }) {
  const categories = [
    { key: "all", label: "전체 작품 보기" },
    { key: "game", label: "🎮 인터랙티브 게임" },
    { key: "website", label: "⚡ 웹 & 알고리즘" },
  ];

  return (
    <div className="category-filter" id="category-filter" role="tablist">
      {categories.map((cat) => (
        <button
          key={cat.key}
          className={`filter-btn ${current === cat.key ? "active" : ""}`}
          onClick={() => onChange(cat.key)}
          id={`filter-${cat.key}`}
          role="tab"
          aria-selected={current === cat.key}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}
