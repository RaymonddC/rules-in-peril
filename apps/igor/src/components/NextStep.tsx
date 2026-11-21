import type { ReactNode } from "react";
import { IconArrow } from "./Icons";

/**
 * The bar that tells you what to do next. Sticks to the bottom of the
 * window so the next action is always one click away.
 */
export function NextStep({
  label,
  children,
  action,
}: {
  label: string;
  children: ReactNode;
  action: { text: string; href?: string; onClick?: () => void; disabled?: boolean };
}) {
  return (
    <aside className="nextbar" aria-label="Next step">
      <div className="nextbar-inner">
        <div className="nextbar-text">
          <span className="nextbar-label">{label}</span>
          <span>{children}</span>
        </div>
        {action.href ? (
          <a className="btn btn-ember press" href={action.href}>
            {action.text}
            <IconArrow />
          </a>
        ) : (
          <button type="button" className="btn btn-ember press" onClick={action.onClick} disabled={action.disabled}>
            {action.text}
            <IconArrow />
          </button>
        )}
      </div>
    </aside>
  );
}
