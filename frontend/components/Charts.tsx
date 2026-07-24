import React from 'react';
import { View, Text, StyleSheet, Dimensions } from 'react-native';
import Svg, { Path, Circle, Line, Text as SvgText, G } from 'react-native-svg';
import { useTheme } from './Theme';

interface ChartDataPoint {
  date: string;
  value: number;
}

interface ChartProps {
  data: ChartDataPoint[];
  colorType?: 'primary' | 'secondary' | 'warning';
  title: string;
  suffix?: string;
}

export const LineChart: React.FC<ChartProps> = ({
  data,
  colorType = 'primary',
  title,
  suffix = '',
}) => {
  const { colors } = useTheme();

  if (!data || data.length === 0) {
    return (
      <View style={[styles.emptyContainer, { backgroundColor: colors.surface }]}>
        <Text style={{ color: colors.textMuted }}>No performance history available yet.</Text>
      </View>
    );
  }

  const screenWidth = Dimensions.get('window').width - 48; // Padding offset
  const chartHeight = 180;
  const paddingLeft = 35;
  const paddingRight = 15;
  const paddingTop = 20;
  const paddingBottom = 30;

  const chartWidth = screenWidth - paddingLeft - paddingRight;
  const chartEffHeight = chartHeight - paddingTop - paddingBottom;

  // Extract values
  const values = data.map(d => d.value);
  const minVal = 0;
  const maxVal = Math.max(...values, 5); // Fallback to 5 to avoid flat rendering

  // Calculate coordinates
  const points = data.map((dp, idx) => {
    const x = paddingLeft + (idx / Math.max(data.length - 1, 1)) * chartWidth;
    const y = paddingTop + chartEffHeight - ((dp.value - minVal) / (maxVal - minVal)) * chartEffHeight;
    return { x, y, val: dp.value, label: new Date(dp.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) };
  });

  // Construct SVG Path
  let pathD = '';
  if (points.length > 0) {
    pathD = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      pathD += ` L ${points[i].x} ${points[i].y}`;
    }
  }

  // Determine line color
  const strokeColor = colorType === 'primary' 
    ? colors.primary 
    : colorType === 'secondary' 
      ? colors.secondary 
      : colors.warning;

  // Grid lines counts
  const gridLines = 4;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface, borderColor: colors.border }]}>
      <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
      
      <Svg width={screenWidth} height={chartHeight}>
        <G>
          {/* Render horizontal grid lines */}
          {Array.from({ length: gridLines }).map((_, idx) => {
            const yVal = paddingTop + (idx / (gridLines - 1)) * chartEffHeight;
            const labelVal = Math.round(maxVal - (idx / (gridLines - 1)) * (maxVal - minVal));
            return (
              <G key={idx}>
                <Line
                  x1={paddingLeft}
                  y1={yVal}
                  x2={screenWidth - paddingRight}
                  y2={yVal}
                  stroke={colors.border}
                  strokeWidth="1"
                  strokeDasharray="4, 4"
                />
                <SvgText
                  x={paddingLeft - 8}
                  y={yVal + 4}
                  fill={colors.textMuted}
                  fontSize="10"
                  textAnchor="end"
                >
                  {labelVal}
                  {suffix}
                </SvgText>
              </G>
            );
          })}

          {/* Render Path line */}
          {points.length > 1 && (
            <Path
              d={pathD}
              fill="none"
              stroke={strokeColor}
              strokeWidth="3"
            />
          )}

          {/* Render data points */}
          {points.map((p, idx) => (
            <G key={idx}>
              <Circle
                cx={p.x}
                cy={p.y}
                r="4"
                fill={colors.background}
                stroke={strokeColor}
                strokeWidth="2"
              />
              {/* Show date label at start, middle, and end for clean layout */}
              {(idx === 0 || idx === points.length - 1 || (points.length > 2 && idx === Math.floor(points.length / 2))) && (
                <SvgText
                  x={p.x}
                  y={chartHeight - 8}
                  fill={colors.textMuted}
                  fontSize="10"
                  textAnchor="middle"
                >
                  {p.label}
                </SvgText>
              )}
            </G>
          ))}
        </G>
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
    width: '100%',
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
    letterSpacing: 0.5,
  },
  emptyContainer: {
    height: 180,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
});
export default LineChart;
