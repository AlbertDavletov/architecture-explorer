const paths = {
  brand: 'm3 8 9-5 9 5-9 5z M3 12l9 5 9-5 M3 16l9 5 9-5',
  devices: 'M3 4h14v10H3z M2 17h10 M15 10h7v11h-7z M18 18h1',
  cloud: 'M6 18a4.5 4.5 0 0 1-1-9 7 7 0 0 1 13-1 5 5 0 0 1 0 10z',
  browser: 'M3 4h18v16H3z M3 9h18 M6 6.5h.1 M9 6.5h.1',
  phone:
    'M8 2.5h8q2 0 2 2v15q0 2-2 2H8q-2 0-2-2v-15q0-2 2-2z M10 5h4 M11 18.5h2',
  server: 'M3 4h18v6H3z M3 14h18v6H3z M6 7h2 M6 17h2',
  storage:
    'M4 6c0-5 16-5 16 0s-16 5-16 0z M4 6v12c0 5 16 5 16 0V6 M4 12c0 5 16 5 16 0',
  inbox: 'm3 14 3-9h12l3 9v5H3z M3 14h5l2 3h4l2-3h5',
  nested: 'm4 9 8-4 8 4-8 4z M4 13l8 4 8-4 M4 17l8 4 8-4',
  zoomIn: 'M17 10a7 7 0 1 1-14 0 7 7 0 0 1 14 0z M15 15l6 6 M7 10h6 M10 7v6',
  chevron: 'm9 6 6 6-6 6',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z M12 11v6 M12 7h.01',
}
export function Icon({
  name,
  size = 16,
}: {
  name: keyof typeof paths
  size?: number
}) {
  return (
    <svg
      aria-hidden="true"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.65"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d={paths[name]} />
    </svg>
  )
}
