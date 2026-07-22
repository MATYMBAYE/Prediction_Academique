import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";

/**
 * "La Courbe de Trajectoire" - signature visuelle de l'application
 * (cahier des charges §2.4). Ligne fine en Indigo Trajectoire, montee =
 * amelioration, descente = risque croissant.
 */
export default function TrajectoryCurve({ data, dataKey = "note", height = 120, showAxis = false }) {
  const tendance = describeTendance(data, dataKey);

  if (!data || data.length < 2) {
    return (
      <div className="flex h-[120px] items-center justify-center text-sm text-gray-400" role="img" aria-label="Pas assez de donnees pour afficher une tendance">
        Pas encore assez de donnees pour tracer une trajectoire.
      </div>
    );
  }

  return (
    <div>
      <div style={{ width: "100%", height }} role="img" aria-label={tendance}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
            {showAxis && <YAxis domain={[0, 20]} hide />}
            <Tooltip
              contentStyle={{ borderRadius: 8, borderColor: "#3D5A99", fontFamily: "Inter, sans-serif", fontSize: 12 }}
              formatter={(value) => [value, "Valeur"]}
            />
            <Line
              type="monotone"
              dataKey={dataKey}
              stroke="#3D5A99"
              strokeWidth={2.5}
              dot={{ r: 3, fill: "#3D5A99" }}
              activeDot={{ r: 5 }}
              isAnimationActive
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <p className="sr-only">{tendance}</p>
    </div>
  );
}

function describeTendance(data, dataKey) {
  if (!data || data.length < 2) return "Tendance non disponible.";
  const first = data[0][dataKey];
  const last = data[data.length - 1][dataKey];
  if (last > first) return `Tendance a la hausse sur les ${data.length} dernieres evaluations.`;
  if (last < first) return `Tendance a la baisse sur les ${data.length} dernieres evaluations.`;
  return `Tendance stable sur les ${data.length} dernieres evaluations.`;
}
