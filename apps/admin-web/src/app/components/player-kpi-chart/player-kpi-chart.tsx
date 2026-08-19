import { formatCurrency } from '@vfair/app-common';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { AdminPlayerKpiDaily } from '../../services/admin-api.service';
import './player-kpi-chart.scss';

type PlayerKpiChartProps = {
  daily: AdminPlayerKpiDaily[];
  currency: { code: string; decimals: number };
};

export const PlayerKpiChart = ({ daily, currency }: PlayerKpiChartProps) => {
  const formatAmount = (value: number) =>
    formatCurrency(value, {
      currency: currency.code,
      decimals: currency.decimals,
    });

  return (
    <div className="player-kpi-chart">
      <ResponsiveContainer width="100%" height={280}>
        <LineChart
          data={daily}
          margin={{ top: 8, right: 16, left: 8, bottom: 0 }}
        >
          <CartesianGrid stroke="var(--gray-6)" strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tick={{ fill: 'var(--gray-11)', fontSize: 12 }}
            stroke="var(--gray-8)"
          />
          <YAxis
            tick={{ fill: 'var(--gray-11)', fontSize: 12 }}
            stroke="var(--gray-8)"
            tickFormatter={(value: number) => formatAmount(value)}
            width={88}
          />
          <Tooltip
            formatter={(value) =>
              formatAmount(typeof value === 'number' ? value : Number(value))
            }
            contentStyle={{
              background: 'var(--color-panel-solid)',
              border: '1px solid var(--gray-6)',
              borderRadius: 'var(--radius-2)',
              color: 'var(--gray-12)',
            }}
          />
          <Legend />
          <Line
            type="monotone"
            dataKey="totalWagered"
            name="Wagered"
            stroke="var(--accent-9)"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="ggr"
            name="GGR"
            stroke="var(--gray-11)"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};
