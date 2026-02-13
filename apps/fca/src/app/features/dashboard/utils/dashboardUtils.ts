export const getGradientColor = (params: { dataIndex: number }, rgb: [number, number, number] = [59, 130, 246]) => {
  const opacity = 1 - params.dataIndex * 0.07;
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${opacity})`;
};
