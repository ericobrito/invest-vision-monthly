import { LineChart, Line, ResponsiveContainer } from "recharts";

interface MiniSparklineProps {
  data: number[];
}

const MiniSparkline = ({ data }: MiniSparklineProps) => {
  if (!data || data.length < 2) return null;

  const chartData = data.map((value, index) => ({ value, index }));
  const first = data[0];
  const last = data[data.length - 1];
  const color = last >= first ? "hsl(var(--primary))" : "hsl(var(--destructive))";

  return (
    <div className="w-24 h-8">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={chartData}>
          <Line
            type="monotone"
            dataKey="value"
            stroke={color}
            dot={false}
            strokeWidth={1.5}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default MiniSparkline;
