import { useState, useEffect, useRef, useCallback } from "react";

const W = 900;
const H = 560;
const DRONE_R = 18;

const INIT_DRONES = [
  {
    id: 1,
    x: 350,
    y: 120,
    trust: 100,
    status: "nominal",
    label: "D1",
    latency: 22,
  },
  {
    id: 2,
    x: 200,
    y: 240,
    trust: 100,
    status: "nominal",
    label: "D2",
    latency: 18,
  },
  {
    id: 3,
    x: 350,
    y: 300,
    trust: 100,
    status: "nominal",
    label: "D3",
    latency: 24,
  },
  {
    id: 4,
    x: 500,
    y: 240,
    trust: 100,
    status: "nominal",
    label: "D4",
    latency: 16,
  },
  {
    id: 5,
    x: 350,
    y: 420,
    trust: 100,
    status: "nominal",
    label: "D5",
    latency: 21,
  },
];

const PHASES = ["idle", "attack", "detect", "vote", "isolate", "heal"];

function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function phaseColor(p) {
  return (
    {
      idle: "#1D9E75",
      attack: "#D85A30",
      detect: "#BA7517",
      vote: "#378ADD",
      isolate: "#A32D2D",
      heal: "#185FA5",
    }[p] || "#888"
  );
}

function randomShift(value, range) {
  return value + (Math.random() - 0.5) * range;
}

export default function AeroAxenAdvanced() {
  const canvasRef = useRef(null);

  const [phase, setPhase] = useState("idle");
  const [tick, setTick] = useState(0);
  const [autoRun, setAutoRun] = useState(false);

  const [attackProbability, setAttackProbability] = useState(42);
  const [trustThreshold, setTrustThreshold] = useState(30);
  const [packetLatency, setPacketLatency] = useState(24);
  const [dynamicTopology, setDynamicTopology] = useState(true);

  const [packets, setPackets] = useState([]);
  const [packetLoss, setPacketLoss] = useState(0);
  const [nodeLoss, setNodeLoss] = useState(0);

  const [log, setLog] = useState(["[00:00] Swarm initialized."]);

  const [drones, setDrones] = useState(INIT_DRONES);

  const addLog = (msg) => {
    const ts = new Date().toISOString().substr(14, 5);
    setLog((prev) => [`[${ts}] ${msg}`, ...prev].slice(0, 10));
  };

  const getMeshEdges = useCallback(
    (nodes) => {
      const active = nodes.filter((d) => d.status !== "isolated");
      const edges = [];

      for (let i = 0; i < active.length; i++) {
        for (let j = i + 1; j < active.length; j++) {
          const range = dynamicTopology
            ? 180 + Math.sin(tick * 0.02 + i + j) * 80
            : 240;

          if (dist(active[i], active[j]) < range) {
            edges.push([active[i], active[j]]);
          }
        }
      }

      return edges;
    },
    [dynamicTopology, tick]
  );

  const runPhase = useCallback(
    (p) => {
      setPhase(p);

      if (p === "idle") {
        setDrones(INIT_DRONES);
        setPackets([]);
        setNodeLoss(0);
        addLog("Swarm returned to nominal state.");
      }

      if (p === "attack") {
        const success = Math.random() * 100 < attackProbability;

        setDrones((prev) =>
          prev.map((d) => {
            if (d.id === 3 && success) {
              return {
                ...d,
                status: "attacked",
                trust: randomShift(55, 10),
                latency: packetLatency + 40,
              };
            }
            return d;
          })
        );

        addLog(`GPS spoofing attempt probability: ${attackProbability}%`);
      }

      if (p === "detect") {
        setDrones((prev) =>
          prev.map((d) => {
            if (d.id === 3) {
              return {
                ...d,
                trust: randomShift(28, 6),
              };
            }
            return d;
          })
        );

        addLog("Anomaly detector triggered confidence escalation.");
      }

      if (p === "vote") {
        setDrones((prev) =>
          prev.map((d) => {
            if (d.id === 3) {
              return {
                ...d,
                trust: randomShift(10, 4),
              };
            }

            return {
              ...d,
              status: "voting",
            };
          })
        );

        addLog(`Consensus threshold active at ${trustThreshold}% trust.`);
      }

      if (p === "isolate") {
        setDrones((prev) =>
          prev.map((d) => {
            if (d.id === 3 && d.trust <= trustThreshold) {
              return {
                ...d,
                status: "isolated",
                trust: 0,
              };
            }

            return {
              ...d,
              status: "nominal",
            };
          })
        );

        setNodeLoss(20);

        addLog("Compromised node removed from active mesh.");
      }

      if (p === "heal") {
        setDrones((prev) =>
          prev
            .filter((d) => d.status !== "isolated")
            .map((d, i) => ({
              ...d,
              x: 220 + (i % 2) * 240,
              y: 180 + Math.floor(i / 2) * 120,
              latency: Math.max(10, d.latency - 15),
            }))
        );

        addLog("Topology healed and relay geometry optimized.");
      }
    },
    [attackProbability, packetLatency, trustThreshold]
  );

  useEffect(() => {
    let raf;

    const loop = () => {
      setTick((t) => t + 1);

      setPackets((prev) =>
        prev
          .map((p) => ({ ...p, progress: p.progress + 0.02 }))
          .filter((p) => p.progress < 1)
      );

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);

    return () => cancelAnimationFrame(raf);
  }, []);

  useEffect(() => {
    if (!autoRun) return;

    const sequence = ["attack", "detect", "vote", "isolate", "heal"];

    let i = 0;

    const next = () => {
      if (i < sequence.length) {
        runPhase(sequence[i]);
        i++;
        setTimeout(next, 2500);
      } else {
        setAutoRun(false);
      }
    };

    setTimeout(next, 700);
  }, [autoRun, runPhase]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, W, H);

    ctx.fillStyle = "#050E1F";
    ctx.fillRect(0, 0, W, H);

    const edges = getMeshEdges(drones);

    edges.forEach(([a, b]) => {
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.strokeStyle = "rgba(29,158,117,0.25)";
      ctx.setLineDash([6, 4]);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    drones.forEach((drone) => {
      const hover = Math.sin(tick * 0.04 + drone.id) * 3;
      const y = drone.y + hover;

      ctx.beginPath();
      ctx.arc(drone.x, y, DRONE_R, 0, Math.PI * 2);

      ctx.fillStyle =
        drone.status === "isolated"
          ? "#601515"
          : drone.status === "attacked"
          ? "#5E3900"
          : drone.status === "voting"
          ? "#113A63"
          : "#071829";

      ctx.fill();

      ctx.strokeStyle =
        drone.status === "isolated"
          ? "#E24B4A"
          : drone.status === "attacked"
          ? "#EF9F27"
          : drone.status === "voting"
          ? "#378ADD"
          : "#1D9E75";

      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = "#7EC8E3";
      ctx.font = "10px monospace";
      ctx.textAlign = "center";
      ctx.fillText(drone.label, drone.x, y + 4);

      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.fillText(`${Math.round(drone.latency)}ms`, drone.x, y + 36);

      ctx.fillStyle = "#111";
      ctx.fillRect(drone.x - 20, y + 18, 40, 5);

      ctx.fillStyle = drone.trust > trustThreshold ? "#1D9E75" : "#E24B4A";

      ctx.fillRect(drone.x - 20, y + 18, (drone.trust / 100) * 40, 5);
    });
  }, [drones, tick, getMeshEdges, trustThreshold]);

  const trustAvg = Math.round(
    drones.reduce((s, d) => s + d.trust, 0) / drones.length
  );

  const activeNodes = drones.filter((d) => d.status !== "isolated").length;

  const graphMetrics = {
    connectivity: Math.round((activeNodes / 5) * 100),
    avgLatency: Math.round(
      drones.reduce((s, d) => s + d.latency, 0) / drones.length
    ),
    trustAvg,
    packetLoss,
    nodeLoss,
  };

  return (
    <div
      style={{
        background: "#030B18",
        color: "#7EC8E3",
        minHeight: "100vh",
        fontFamily: "monospace",
        padding: 20,
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "280px 1fr",
          gap: 20,
        }}
      >
        <div
          style={{
            background: "#071829",
            border: "1px solid #103050",
            borderRadius: 12,
            padding: 18,
          }}
        >
          <h2 style={{ marginTop: 0 }}>AEROAXEN CONTROL</h2>

          <div style={{ marginBottom: 18 }}>
            <label>Attack Probability: {attackProbability}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={attackProbability}
              onChange={(e) => setAttackProbability(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label>Trust Threshold: {trustThreshold}%</label>
            <input
              type="range"
              min="0"
              max="100"
              value={trustThreshold}
              onChange={(e) => setTrustThreshold(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label>Packet Latency: {packetLatency}ms</label>
            <input
              type="range"
              min="5"
              max="150"
              value={packetLatency}
              onChange={(e) => setPacketLatency(Number(e.target.value))}
              style={{ width: "100%" }}
            />
          </div>

          <div style={{ marginBottom: 18 }}>
            <label>
              <input
                type="checkbox"
                checked={dynamicTopology}
                onChange={() => setDynamicTopology(!dynamicTopology)}
              />
              Dynamic Topology
            </label>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <button
              onClick={() => {
                runPhase("idle");
                setAutoRun(true);
              }}
              style={{
                padding: 10,
                background: "#0A3060",
                border: "1px solid #00C8F0",
                color: "#00C8F0",
                borderRadius: 8,
                cursor: "pointer",
              }}
            >
              ▶ Run Simulation
            </button>

            {PHASES.map((p) => (
              <button
                key={p}
                onClick={() => runPhase(p)}
                style={{
                  padding: 8,
                  background: phase === p ? phaseColor(p) : "#071829",
                  border: "1px solid #1A4878",
                  color: "white",
                  borderRadius: 8,
                  cursor: "pointer",
                }}
              >
                {p.toUpperCase()}
              </button>
            ))}
          </div>

          <div style={{ marginTop: 24 }}>
            <h3>Real-Time Metrics</h3>

            <div>Connectivity: {graphMetrics.connectivity}%</div>
            <div>Average Latency: {graphMetrics.avgLatency}ms</div>
            <div>Average Trust: {graphMetrics.trustAvg}%</div>
            <div>Packet Loss: {graphMetrics.packetLoss}%</div>
            <div>Node Loss: {graphMetrics.nodeLoss}%</div>
          </div>
        </div>

        <div
          style={{
            background: "#071829",
            border: "1px solid #103050",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              padding: 14,
              borderBottom: "1px solid #0D2040",
              color: phaseColor(phase),
              fontWeight: "bold",
            }}
          >
            SWARM STATUS · {phase.toUpperCase()}
          </div>

          <canvas
            ref={canvasRef}
            width={W}
            height={H}
            style={{ width: "100%", display: "block" }}
          />

          <div
            style={{
              borderTop: "1px solid #0D2040",
              padding: 14,
              fontSize: 12,
              lineHeight: 1.8,
              color: "#5A8FB5",
              maxHeight: 200,
              overflowY: "auto",
            }}
          >
            {log.map((l, i) => (
              <div key={i}>{l}</div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
