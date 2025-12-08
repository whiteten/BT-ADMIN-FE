/**
 * 역할 상세/수정 페이지
 * - 기본정보 탭: 역할 기본 정보 수정
 * - 권한 할당 탭: 앱/도메인별 권한 체크박스 트리
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Checkbox, Form, Input, Radio, Typography, message } from 'antd';
import { ArrowLeft, Info, Shield } from 'lucide-react';

import { appDummyData, groupPermissionsByApp, permissionDummyData, roleDummyData, rolePermissionMap } from '../../features/iam/data/iam-dummy';
import type { Permission, Role, RoleUpsertRequest } from '../../features/iam/types/iam.types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/libs/shared-ui/src/lib/utils';

const { Title, Text } = Typography;

// 스타일 상수
const styles = {
  tabTrigger: 'flex items-center gap-1 px-3 py-2 hover:cursor-pointer border-2 border-transparent data-[state=active]:border-blue-600 whitespace-nowrap',
  cardContentContainer: 'grid grid-cols-1 lg:grid-cols-2 gap-x-6',
  cardTitle: 'flex items-center gap-2 text-xl',
};

export default function RoleDetail() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [form] = Form.useForm();
  const isCreateMode = id === 'create';

  // 상태 관리
  const [role, setRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);

  // 권한 그룹화 데이터
  const permissionGroups = groupPermissionsByApp(permissionDummyData);

  // 초기 데이터 로드
  useEffect(() => {
    if (!isCreateMode && id) {
      const foundRole = roleDummyData.find((r) => r.roleId === Number(id));
      if (foundRole) {
        setRole(foundRole);
        form.setFieldsValue(foundRole);

        // 역할에 할당된 권한 로드
        const assignedPermIds = rolePermissionMap[foundRole.roleId] || [];
        setSelectedPermissions(new Set(assignedPermIds));
      }
    }
  }, [id, isCreateMode, form]);

  // 권한 선택 토글
  const handlePermissionToggle = (authId: number) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(authId)) {
        next.delete(authId);
      } else {
        next.add(authId);
      }
      return next;
    });
  };

  // 도메인 전체 선택/해제
  const handleDomainToggle = (permissions: Permission[], checked: boolean) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      permissions.forEach((p) => {
        if (checked) {
          next.add(p.authId);
        } else {
          next.delete(p.authId);
        }
      });
      return next;
    });
  };

  // 앱 전체 선택/해제
  const handleAppToggle = (appId: string, checked: boolean) => {
    const appPerms = permissionDummyData.filter((p) => p.appId === appId);
    handleDomainToggle(appPerms, checked);
  };

  // 저장
  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const request: RoleUpsertRequest = {
        ...values,
        permissionIds: Array.from(selectedPermissions),
      };

      // API 호출 시뮬레이션
      setTimeout(() => {
        console.log('Save role:', request);
        message.success(isCreateMode ? '역할이 생성되었습니다.' : '역할이 수정되었습니다.');
        setLoading(false);
        navigate('../roles');
      }, 500);
    } catch (error) {
      console.error('Validation failed:', error);
    }
  };

  // 삭제
  const handleDelete = () => {
    if (window.confirm('정말 삭제하시겠습니까?')) {
      setLoading(true);
      setTimeout(() => {
        message.success('역할이 삭제되었습니다.');
        setLoading(false);
        navigate('../roles');
      }, 500);
    }
  };

  // 도메인별 선택 상태 계산
  const getDomainCheckState = (permissions: Permission[]) => {
    const selectedCount = permissions.filter((p) => selectedPermissions.has(p.authId)).length;
    return {
      checked: selectedCount === permissions.length,
      indeterminate: selectedCount > 0 && selectedCount < permissions.length,
    };
  };

  // 앱별 선택 상태 계산
  const getAppCheckState = (appId: string) => {
    const appPerms = permissionDummyData.filter((p) => p.appId === appId);
    const selectedCount = appPerms.filter((p) => selectedPermissions.has(p.authId)).length;
    return {
      checked: selectedCount === appPerms.length,
      indeterminate: selectedCount > 0 && selectedCount < appPerms.length,
    };
  };

  return (
    <div className="max-w-6xl h-full mx-auto px-6 py-3 overflow-y-auto">
      {/* 헤더 */}
      <div className="flex justify-between items-end mb-4">
        <div className="flex items-center gap-3">
          <Button icon={<ArrowLeft className="size-4" />} onClick={() => navigate('../roles')} />
          <div>
            <Title level={3} className="!mb-0">
              {isCreateMode ? '역할 생성' : '역할 수정'}
            </Title>
            <Text type="secondary">{isCreateMode ? '새로운 역할을 생성합니다.' : '역할 정보와 권한을 수정합니다.'}</Text>
          </div>
        </div>
        <div className="flex gap-2">
          <Button type="primary" onClick={handleSubmit} loading={loading} size="large">
            저장
          </Button>
          {!isCreateMode && (
            <Button danger onClick={handleDelete} loading={loading} size="large">
              삭제
            </Button>
          )}
        </div>
      </div>

      {/* 탭 콘텐츠 */}
      <Form form={form} layout="vertical">
        <Tabs defaultValue="basic" className="w-full gap-4">
          <TabsList className="flex flex-wrap w-full h-full bg-white">
            <TabsTrigger value="basic" className={cn(styles.tabTrigger)}>
              <Info className="h-4 w-4 text-blue-600" />
              <span className="text-sm">기본정보</span>
            </TabsTrigger>
            <TabsTrigger value="permissions" className={cn(styles.tabTrigger)}>
              <Shield className="h-4 w-4 text-green-600" />
              <span className="text-sm">권한 할당</span>
              <span className="ml-1 px-1.5 py-0.5 text-xs bg-blue-100 text-blue-600 rounded-full">{selectedPermissions.size}</span>
            </TabsTrigger>
          </TabsList>

          {/* 기본정보 탭 */}
          <TabsContent value="basic">
            <Card className="gap-3 mb-2">
              <CardHeader className="gap-3">
                <CardTitle className={cn(styles.cardTitle)}>
                  <Info className="h-6 w-6 text-blue-600" />
                  <span>기본 정보</span>
                </CardTitle>
                <Text type="secondary">역할의 기본 정보를 입력해주세요.</Text>
              </CardHeader>
              <CardContent>
                <div className={cn(styles.cardContentContainer)}>
                  <Form.Item label="역할 코드" name="roleCode" required rules={[{ required: true, message: '역할 코드를 입력해주세요' }]}>
                    <Input size="large" placeholder="예: ADMIN, MANAGER" disabled={!isCreateMode} />
                  </Form.Item>

                  <Form.Item label="역할명" name="roleName" required rules={[{ required: true, message: '역할명을 입력해주세요' }]}>
                    <Input size="large" placeholder="역할명 입력" />
                  </Form.Item>

                  <Form.Item label="설명" name="description" className="lg:col-span-2">
                    <Input.TextArea size="large" rows={3} placeholder="역할에 대한 설명을 입력해주세요" />
                  </Form.Item>

                  <Form.Item label="정렬순서" name="sortOrder">
                    <Input size="large" type="number" placeholder="0" />
                  </Form.Item>

                  <Form.Item label="사용여부" name="useYn" initialValue="Y">
                    <Radio.Group>
                      <Radio value="Y">사용</Radio>
                      <Radio value="N">미사용</Radio>
                    </Radio.Group>
                  </Form.Item>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* 권한 할당 탭 */}
          <TabsContent value="permissions">
            <Card className="gap-3 mb-2">
              <CardHeader className="gap-3">
                <CardTitle className={cn(styles.cardTitle)}>
                  <Shield className="h-6 w-6 text-green-600" />
                  <span>권한 할당</span>
                </CardTitle>
                <Text type="secondary">역할에 부여할 권한을 선택해주세요. 총 {selectedPermissions.size}개 선택됨</Text>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {permissionGroups.map((group) => {
                    const appState = getAppCheckState(group.appId);
                    return (
                      <div key={group.appId} className="border rounded-lg p-4">
                        {/* 앱 헤더 */}
                        <div className="flex items-center gap-2 mb-4 pb-2 border-b">
                          <Checkbox checked={appState.checked} indeterminate={appState.indeterminate} onChange={(e) => handleAppToggle(group.appId, e.target.checked)}>
                            <span className="font-semibold text-lg">{group.appName}</span>
                            <span className="ml-2 text-gray-400 text-sm">({group.appId})</span>
                          </Checkbox>
                        </div>

                        {/* 도메인별 권한 */}
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {group.domains.map(({ domain, permissions }) => {
                            const domainState = getDomainCheckState(permissions);
                            return (
                              <div key={`${group.appId}-${domain}`} className="bg-gray-50 rounded-lg p-3">
                                {/* 도메인 헤더 */}
                                <div className="mb-2 pb-2 border-b border-gray-200">
                                  <Checkbox
                                    checked={domainState.checked}
                                    indeterminate={domainState.indeterminate}
                                    onChange={(e) => handleDomainToggle(permissions, e.target.checked)}
                                  >
                                    <span className="font-medium capitalize">{domain}</span>
                                  </Checkbox>
                                </div>

                                {/* 권한 목록 */}
                                <div className="space-y-1">
                                  {permissions.map((perm) => (
                                    <div key={perm.authId} className="flex items-center">
                                      <Checkbox checked={selectedPermissions.has(perm.authId)} onChange={() => handlePermissionToggle(perm.authId)}>
                                        <span className="text-sm">{perm.description}</span>
                                        <span className="ml-1 text-xs text-gray-400">({perm.action})</span>
                                      </Checkbox>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Form>
    </div>
  );
}
