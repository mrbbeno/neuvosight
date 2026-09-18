import { createRoot } from "react-dom/client";
import { FunnelChart } from "./charts/funnel-chart";

const stages = [
  { label: "Idea Triage", value: 100, displayValue: "100%", color: "#7aabd4" },
  { label: "Problem & Value", value: 45, displayValue: "45%", color: "#1a5496" },
  { label: "MVP & Market", value: 22, displayValue: "22%", color: "#0d3562" },
  { label: "Incubation", value: 10, displayValue: "10%", color: "#d4860a" },
];

function HeroFunnel() {
  return (
    <FunnelChart
      data={stages}
      orientation="horizontal"
      layers={3}
      gap={1}
      edges="curved"
      showValues={false}
      showPercentage={true}
      showLabels={true}
      labelLayout="spread"
      grid={false}
      staggerDelay={0.14}
      enterTransition={{ type: "tween", duration: 1.0, ease: [0.22, 1, 0.36, 1] }}
      style={{ aspectRatio: "1.4 / 1" }}
    />
  );
}

export function mountHeroFunnel() {
  const el = document.querySelector("[data-hero-funnel]");
  if (!el) return;
  createRoot(el).render(<HeroFunnel />);
}
