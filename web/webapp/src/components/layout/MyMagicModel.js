import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Container,
  Slider,
  Typography,
  Paper,
  CircularProgress,
  Alert,
} from "@mui/material";

/**
 * Minimal React/MUI heatmap client for:
 *   POST {apiBase}/mymagic  body: {"x": number}
 * Response expected:
 *   {"x": number, "y": number[][]}
 */
export function MyMagicModel() {
  const [x, setX] = useState(5);
  const [y, setY] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const apiBase = "/api";

  // simple debounce so we don't spam the API when sliding
  useEffect(() => {
    let cancelled = false;
    setErr("");

    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`${apiBase.replace(/\/$/, "")}/mymagic`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ x }),
        });

        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch {
          throw new Error(`Non-JSON response: ${text.slice(0, 300)}`);
        }

        if (!res.ok) {
          throw new Error(typeof data?.detail === "string" ? data.detail : JSON.stringify(data?.detail ?? data));
        }

        if (!cancelled) setY(data.y);
      } catch (e) {
        if (!cancelled) {
          setY(null);
          setErr(e?.message || String(e));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [x, apiBase]);

  const stats = useMemo(() => {
    if (!y || !y.length) return { min: 0, max: 1 };
    let min = Infinity;
    let max = -Infinity;
    for (const row of y) {
      for (const v of row) {
        if (typeof v === "number" && !Number.isNaN(v)) {
          if (v < min) min = v;
          if (v > max) max = v;
        }
      }
    }
    if (!Number.isFinite(min) || !Number.isFinite(max) || min === max) return { min: 0, max: 1 };
    return { min, max };
  }, [y]);

  const n = y?.length ?? x;

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
          <Box sx={{ minWidth: 260, flex: 1 }}>
            <Typography variant="body1" fontWeight={600}>
              x: {x}
            </Typography>
            <Slider
              value={x}
              min={1}
              max={50}
              step={1}
              valueLabelDisplay="auto"
              onChange={(_, v) => setX(v)}
            />
          </Box>

          {loading && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <CircularProgress size={20} />
              <Typography variant="body2">Fetching…</Typography>
            </Box>
          )}
        </Box>

        {err && (
          <Alert severity="error" sx={{ mt: 2, whiteSpace: "pre-wrap" }}>
            {err}
          </Alert>
        )}
      </Paper>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
          Heatmap ({n} × {n})
        </Typography>

        {!y && !loading && !err && (
          <Typography variant="body2" color="text.secondary">
            Move the slider to load data.
          </Typography>
        )}

        {y && (
          <HeatmapGrid matrix={y} min={stats.min} max={stats.max} />
        )}
      </Paper>
    </Container>
  );
}

function HeatmapGrid({ matrix, min, max }) {
  const n = matrix.length;

  // Keep cells square, but don’t make them microscopic for large n.
  // You can tweak these values.
  const cellPx = Math.max(18, Math.min(44, Math.floor(900 / n)));

  return (
    <Box
      sx={{
        overflow: "auto",
        borderRadius: 2,
        border: "1px solid",
        borderColor: "divider",
        p: 1,
      }}
    >
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(${n}, ${cellPx}px)`,
          gap: 0.5,
          width: "fit-content",
        }}
      >
        {matrix.map((row, i) =>
          row.map((v, j) => (
            <HeatCell
              key={`${i}-${j}`}
              value={v}
              min={min}
              max={max}
              size={cellPx}
            />
          ))
        )}
      </Box>
    </Box>
  );
}

function HeatCell({ value, min, max, size }) {
  const t = normalize(value, min, max); // 0..1
  // Simple grayscale: light (low) -> dark (high)
  const shade = Math.round(245 - t * 180); // 245..65
  const bg = `rgb(${shade}, ${shade}, ${shade})`;

  const textColor = t > 0.55 ? "white" : "black";

  return (
    <Box
      sx={{
        width: size,
        height: size,
        backgroundColor: bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.max(9, Math.min(14, Math.floor(size * 0.33))),
        lineHeight: 1,
        borderRadius: 1,
        color: textColor,
        userSelect: "none",
        fontVariantNumeric: "tabular-nums",
      }}
      title={String(value)}
    >
      {value}
    </Box>
  );
}

function normalize(v, min, max) {
  if (max <= min) return 0;
  const t = (v - min) / (max - min);
  return Math.max(0, Math.min(1, t));
}
