import { TreeSelect, type TreeSelectProps } from 'antd';

// TODO: 추후에 테넌트 조회 후 처리
const treeData = [
  {
    value: '1',
    label: '연구소테넌트',
    children: [
      {
        value: '1-1',
        label: '연구1본부',
        children: [
          { value: '1-1-1', label: '연구1팀' },
          { value: '1-1-2', label: '연구2팀' },
        ],
      },
      {
        value: '1-2',
        label: '연구2본부',
        children: [
          { value: '1-2-1', label: '연구3팀' },
          { value: '1-2-2', label: '연구4팀' },
        ],
      },
      {
        value: '1-3',
        label: '연구3본부',
        children: [
          { value: '1-3-1', label: '연구5팀' },
          { value: '1-3-2', label: '연구6팀' },
          { value: '1-3-3', label: '디자인팀' },
          { value: '1-3-4', label: '클라우드 운영팀' },
        ],
      },
    ],
  },
];

type TreeSelectTenantProps = Partial<TreeSelectProps>;

export default function TreeSelectTenant(props: TreeSelectTenantProps) {
  const defaultProps: Partial<TreeSelectProps> = {
    treeData: treeData,
    placeholder: '테넌트 선택',
    treeDefaultExpandAll: true,
    treeLine: true,
    allowClear: true,
    showSearch: true,
    treeNodeFilterProp: 'label',
    listHeight: 400,
    popupMatchSelectWidth: false,
  };
  return <TreeSelect {...defaultProps} {...props} />;
}
