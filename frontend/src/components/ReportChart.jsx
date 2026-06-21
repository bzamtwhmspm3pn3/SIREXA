import { useRef, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from "chart.js";
import { Bar, Pie, Line, Doughnut } from "react-chartjs-2";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  ArcElement,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

const cores = [
  "rgba(59, 130, 246, 0.8)", "rgba(16, 185, 129, 0.8)", "rgba(239, 68, 68, 0.8)",
  "rgba(245, 158, 11, 0.8)", "rgba(139, 92, 246, 0.8)", "rgba(236, 72, 153, 0.8)",
  "rgba(6, 182, 212, 0.8)", "rgba(34, 197, 94, 0.8)", "rgba(249, 115, 22, 0.8)",
  "rgba(99, 102, 241, 0.8)", "rgba(168, 85, 247, 0.8)", "rgba(244, 63, 94, 0.8)"
];

const coresBorda = cores.map(c => c.replace("0.8", "1"));

const optionsPadrao = {
  responsive: true,
  maintainAspectRatio: true,
  plugins: {
    legend: {
      position: "bottom",
      labels: { color: "#d1d5db", padding: 12, usePointStyle: true, boxWidth: 8, font: { size: 11 } }
    }
  },
  scales: {
    x: { ticks: { color: "#9ca3af", maxRotation: 45 }, grid: { color: "rgba(75, 85, 99, 0.3)" } },
    y: { ticks: { color: "#9ca3af" }, grid: { color: "rgba(75, 85, 99, 0.3)" } }
  }
};

export default function ReportChart({ tipo = "bar", dados, rotulos, titulo, altura = 250, onClick }) {
  const chartRef = useRef(null);

  const data = {
    labels: rotulos || [],
    datasets: [{
      label: titulo || "",
      data: dados || [],
      backgroundColor: tipo === "pie" || tipo === "doughnut" ? cores.slice(0, (dados || []).length) : cores[0],
      borderColor: tipo === "pie" || tipo === "doughnut" ? coresBorda.slice(0, (dados || []).length) : coresBorda[0],
      borderWidth: tipo === "pie" || tipo === "doughnut" ? 2 : 1,
      tension: 0.3,
      fill: tipo === "line" ? true : false
    }]
  };

  const renderChart = () => {
    switch (tipo) {
      case "pie":
        return <Pie ref={chartRef} data={data} options={{ ...optionsPadrao, scales: undefined }} />;
      case "doughnut":
        return <Doughnut ref={chartRef} data={data} options={{ ...optionsPadrao, scales: undefined }} />;
      case "line":
        return <Line ref={chartRef} data={data} options={optionsPadrao} />;
      default:
        return <Bar ref={chartRef} data={data} options={optionsPadrao} />;
    }
  };

  return (
    <div
      className="report-chart bg-gray-800/60 rounded-lg p-3"
      style={{ height: altura, position: "relative" }}
      onClick={onClick}
    >
      {renderChart()}
    </div>
  );
}
