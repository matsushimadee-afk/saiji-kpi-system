import { Button } from '@/components/ui';
import { useThemeStore } from '@/store/themeStore';

export function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const toggle = useThemeStore((s) => s.toggle);
  return (
    <Button icon variant="subtle" onClick={toggle} aria-label="テーマ切替" title="ライト/ダーク切替">
      {theme === 'dark' ? '☀️' : '🌙'}
    </Button>
  );
}
