"use client";

import Link from "next/link";

export default function ProjectCard({ project }) {
  const isPython = project.language === "python";
  const emoji = project.category === "game" ? (isPython ? "🐍" : "🕹️") : (isPython ? "⚡" : "☕");

  return (
    <Link
      href={`/project/${project.id}`}
      className={`project-card ${isPython ? "python-card" : "java-card"}`}
      id={`project-card-${project.id}`}
    >
      <div className="project-card-thumb">
        <span className="thumb-emoji">{emoji}</span>
        {/* Robotori Circle Icon Reveal on Hover */}
        <div className="circle-icon">
          <span>➔</span>
        </div>
      </div>

      <div className="project-card-body">
        <div>
          <h3 className="project-card-title">{project.title}</h3>
          <p className="project-card-desc">
            {project.description || "등록된 상세 소개가 없는 프로젝트입니다. 바로 실행해 보세요!"}
          </p>
        </div>

        <div className="project-card-footer">
          <div className="card-badges">
            <span className={`badge badge-${project.language}`}>
              {project.language.toUpperCase()}
            </span>
            <span className={`badge badge-${project.category}`}>
              {project.category === "game" ? "GAME" : "WEB APP"}
            </span>
          </div>

          <div className="card-stats">
            <span>실행 {project.play_count || 0}회</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
