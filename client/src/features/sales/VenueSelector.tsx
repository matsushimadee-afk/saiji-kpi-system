import type { Venue } from '@saiji/shared';
import { Select } from '@/components/ui';

interface Props {
  venues: Venue[];
  value: number | null;
  onChange: (id: number | null) => void;
}

export function VenueSelector({ venues, value, onChange }: Props) {
  return (
    <div className="row row-2">
      <span className="muted" style={{ fontSize: '0.85rem', fontWeight: 600 }}>
        会場
      </span>
      <Select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value ? Number(e.target.value) : null)}
        style={{ width: 'auto', minWidth: 150, height: 38 }}
      >
        <option value="">未選択</option>
        {venues.map((v) => (
          <option key={v.id} value={v.id}>
            {v.name}
          </option>
        ))}
      </Select>
    </div>
  );
}
