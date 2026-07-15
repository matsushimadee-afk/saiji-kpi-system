interface Props {
  checked: boolean;
  onChange: (value: boolean) => void;
  'aria-label'?: string;
}

export function Toggle({ checked, onChange, ...rest }: Props) {
  return (
    <button
      type="button"
      className="toggle"
      data-on={checked}
      onClick={() => onChange(!checked)}
      role="switch"
      aria-checked={checked}
      {...rest}
    >
      <span className="toggle__dot" />
    </button>
  );
}
