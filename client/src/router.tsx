import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RequireAuth } from '@/components/auth/RequireAuth';
import { RoleGate } from '@/components/auth/RoleGate';
import { AppShell } from '@/components/layout/AppShell';
import { LoginPage } from '@/features/auth/LoginPage';
import { SalesPage } from '@/features/sales/SalesPage';
import { DashboardPage } from '@/features/dashboard/DashboardPage';
import { MastersLayout } from '@/features/masters/MastersLayout';
import { UserMaster } from '@/features/masters/UserMaster';
import { KpiMaster } from '@/features/masters/KpiMaster';
import { RateMaster } from '@/features/masters/RateMaster';
import { VenueMaster } from '@/features/masters/VenueMaster';
import { OrgMaster } from '@/features/masters/OrgMaster';
import { TargetMaster } from '@/features/masters/TargetMaster';
import { DataManagement } from '@/features/masters/DataManagement';

export const router = createBrowserRouter([
  { path: '/login', element: <LoginPage /> },
  {
    element: <RequireAuth />,
    children: [
      {
        element: <AppShell />,
        children: [
          // 入力: 全ロール
          { path: '/sales', element: <SalesPage /> },

          // ダッシュボード: 責任者・管理者
          {
            element: <RoleGate allow={['manager', 'admin']} />,
            children: [{ path: '/dashboard', element: <DashboardPage /> }],
          },

          // マスタ管理: 管理者のみ
          {
            element: <RoleGate allow={['admin']} />,
            children: [
              {
                path: '/masters',
                element: <MastersLayout />,
                children: [
                  { index: true, element: <Navigate to="users" replace /> },
                  { path: 'users', element: <UserMaster /> },
                  { path: 'kpis', element: <KpiMaster /> },
                  { path: 'rates', element: <RateMaster /> },
                  { path: 'venues', element: <VenueMaster /> },
                  { path: 'org', element: <OrgMaster /> },
                  { path: 'targets', element: <TargetMaster /> },
                  { path: 'data', element: <DataManagement /> },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  { path: '/', element: <Navigate to="/sales" replace /> },
  { path: '*', element: <Navigate to="/sales" replace /> },
]);
