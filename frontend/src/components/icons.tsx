import type { ButtonHTMLAttributes, ReactNode, SVGProps } from 'react'

type IconProps = SVGProps<SVGSVGElement>

const base = (props: IconProps) => ({
  viewBox: '0 0 16 16',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round' as const,
  strokeLinejoin: 'round' as const,
  'aria-hidden': true,
  ...props,
})

export const FitIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M2 5.5V3a1 1 0 0 1 1-1h2.5M14 5.5V3a1 1 0 0 0-1-1h-2.5M2 10.5V13a1 1 0 0 0 1 1h2.5M14 10.5V13a1 1 0 0 1-1 1h-2.5" />
    <rect x="5.5" y="5.5" width="5" height="5" rx="1" />
  </svg>
)

export const RelayoutIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M13.5 6a5.5 5.5 0 1 0 .4 4" />
    <path d="M13.7 2.5V6h-3.5" />
  </svg>
)

export const ZoomInIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5 14 14M7 5v4M5 7h4" />
  </svg>
)

export const ZoomOutIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5 14 14M5 7h4" />
  </svg>
)

export const SidebarIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
    <path d="M6 2.5v11" />
  </svg>
)

export const InspectorIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="2" y="2.5" width="12" height="11" rx="1.5" />
    <path d="M10 2.5v11" />
  </svg>
)

export const ChatIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M2.5 4.5A1.5 1.5 0 0 1 4 3h8a1.5 1.5 0 0 1 1.5 1.5v5A1.5 1.5 0 0 1 12 11H6l-3 2.5V4.5Z" />
  </svg>
)

export const SearchIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="7" cy="7" r="4.5" />
    <path d="M10.5 10.5 14 14" />
  </svg>
)

export const CloseIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M4 4l8 8M12 4l-8 8" />
  </svg>
)

export const TargetIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="8" cy="8" r="5" />
    <circle cx="8" cy="8" r="1.5" />
    <path d="M8 1v2M8 13v2M1 8h2M13 8h2" />
  </svg>
)

export const LinkIcon = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M6.5 9.5 9.5 6.5" />
    <path d="M7 4.5 8.2 3.3a2.5 2.5 0 0 1 3.5 3.5L10.5 8M9 11.5 7.8 12.7a2.5 2.5 0 0 1-3.5-3.5L5.5 8" />
  </svg>
)

export const ChevronIcon = ({
  direction,
  ...props
}: IconProps & { direction: 'up' | 'down' | 'left' | 'right' }) => {
  const rotation = { right: 0, down: 90, left: 180, up: 270 }[direction]
  return (
    <svg {...base(props)}>
      <path d="M6 3.5 10.5 8 6 12.5" transform={`rotate(${rotation} 8 8)`} />
    </svg>
  )
}

export const LogoIcon = (props: IconProps) => (
  <svg viewBox="0 0 20 20" fill="none" aria-hidden {...props}>
    <circle cx="5" cy="6" r="2.2" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="15" cy="5" r="2" stroke="currentColor" strokeWidth="1.5" />
    <circle cx="13" cy="15" r="2.2" stroke="currentColor" strokeWidth="1.5" />
    <path d="M6.9 7.2 11.2 13M6.8 5.4 13 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
)

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  label: string
  children: ReactNode
  active?: boolean
}

export const IconButton = ({ label, children, active = false, className = '', ...props }: IconButtonProps) => (
  <button
    type="button"
    title={label}
    aria-label={label}
    aria-pressed={active}
    className={[
      'inline-flex h-8 w-8 items-center justify-center rounded-md border text-content-secondary transition',
      active
        ? 'border-accent/60 bg-accent-soft text-content-primary'
        : 'border-border bg-raised hover:border-border-strong hover:text-content-primary',
      className,
    ].join(' ')}
    {...props}
  >
    {children}
  </button>
)
