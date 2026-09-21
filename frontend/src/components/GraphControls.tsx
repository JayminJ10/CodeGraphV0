import {
  FitIcon,
  IconButton,
  InspectorIcon,
  RelayoutIcon,
  SidebarIcon,
  ZoomInIcon,
  ZoomOutIcon,
} from './icons'

interface GraphControlsProps {
  onFitView: () => void
  onRelayout: () => void
  onZoomIn: () => void
  onZoomOut: () => void
  onToggleSidebar: () => void
  onToggleInspector: () => void
  sidebarCollapsed: boolean
  inspectorOpen: boolean
  hasGraph: boolean
}

const GraphControls = ({
  onFitView,
  onRelayout,
  onZoomIn,
  onZoomOut,
  onToggleSidebar,
  onToggleInspector,
  sidebarCollapsed,
  inspectorOpen,
  hasGraph,
}: GraphControlsProps) => (
  <div className="flex items-center gap-1">
    <IconButton label={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'} onClick={onToggleSidebar} active={!sidebarCollapsed}>
      <SidebarIcon className="h-4 w-4" />
    </IconButton>
    <span className="mx-0.5 h-5 w-px bg-border" />
    <IconButton label="Fit view" onClick={onFitView} disabled={!hasGraph}>
      <FitIcon className="h-4 w-4" />
    </IconButton>
    <IconButton label="Re-layout" onClick={onRelayout} disabled={!hasGraph}>
      <RelayoutIcon className="h-4 w-4" />
    </IconButton>
    <IconButton label="Zoom in" onClick={onZoomIn} disabled={!hasGraph}>
      <ZoomInIcon className="h-4 w-4" />
    </IconButton>
    <IconButton label="Zoom out" onClick={onZoomOut} disabled={!hasGraph}>
      <ZoomOutIcon className="h-4 w-4" />
    </IconButton>
    <span className="mx-0.5 h-5 w-px bg-border" />
    <IconButton label={inspectorOpen ? 'Hide inspector' : 'Show inspector'} onClick={onToggleInspector} active={inspectorOpen}>
      <InspectorIcon className="h-4 w-4" />
    </IconButton>
  </div>
)

export default GraphControls
