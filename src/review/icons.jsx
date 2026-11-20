// Simple, consistent SVG icons for the review controls (inherit currentColor).
const S = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'currentColor', 'aria-hidden': true }

export const IconFirst = () => <svg {...S}><rect x="5" y="5" width="2.6" height="14" rx="1" /><path d="M19 6.2v11.6c0 .9-1 1.4-1.7.9L9.6 12.9a1.1 1.1 0 0 1 0-1.8l7.7-5.8c.7-.5 1.7 0 1.7.9z" /></svg>
export const IconPrev = () => <svg {...S}><path d="M15.4 5.3a1.2 1.2 0 0 1 0 1.7L10.4 12l5 5a1.2 1.2 0 1 1-1.7 1.7l-5.9-5.85a1.2 1.2 0 0 1 0-1.7l5.9-5.85a1.2 1.2 0 0 1 1.7 0z" /></svg>
export const IconNext = () => <svg {...S}><path d="M8.6 5.3a1.2 1.2 0 0 0 0 1.7l5 5-5 5a1.2 1.2 0 1 0 1.7 1.7l5.9-5.85a1.2 1.2 0 0 0 0-1.7l-5.9-5.85a1.2 1.2 0 0 0-1.7 0z" /></svg>
export const IconLast = () => <svg {...S}><rect x="16.4" y="5" width="2.6" height="14" rx="1" /><path d="M5 6.2v11.6c0 .9 1 1.4 1.7.9l7.7-5.8a1.1 1.1 0 0 0 0-1.8L6.7 5.3C6 4.8 5 5.3 5 6.2z" /></svg>
export const IconPlay = () => <svg {...S}><path d="M8 5.6v12.8c0 .9 1 1.4 1.7.9l9-6.4a1.1 1.1 0 0 0 0-1.8l-9-6.4C9 4.2 8 4.7 8 5.6z" /></svg>
export const IconPause = () => <svg {...S}><rect x="6.5" y="5" width="4" height="14" rx="1.2" /><rect x="13.5" y="5" width="4" height="14" rx="1.2" /></svg>
export const IconFlip = () => <svg {...S} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M7 4v14M3.5 14.5 7 18l3.5-3.5M17 20V6M13.5 9.5 17 6l3.5 3.5" /></svg>
export const IconStar = ({ size = 22 }) => <svg {...S} width={size} height={size}><path d="M12 2.8l2.75 5.6 6.15.9-4.45 4.33 1.05 6.12L12 16.87l-5.5 2.88 1.05-6.12L3.1 9.3l6.15-.9L12 2.8z" /></svg>
export const IconRetry = () => <svg {...S} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12a8 8 0 1 0 2.6-5.9" /><path d="M4 4v4.5h4.5" /></svg>
export const IconBulb = () => <svg {...S}><path d="M12 2.5a7 7 0 0 0-4.2 12.6c.7.5 1.2 1.3 1.2 2.2v.7h6v-.7c0-.9.5-1.7 1.2-2.2A7 7 0 0 0 12 2.5zM9 19.5h6v.5a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2v-.5z" /></svg>
export const IconArrowRight = () => <svg {...S}><path d="M13.3 5.3a1.2 1.2 0 0 1 1.7 0l5.85 5.85a1.2 1.2 0 0 1 0 1.7L15 18.7a1.2 1.2 0 1 1-1.7-1.7l3.8-3.8H4.2a1.2 1.2 0 0 1 0-2.4h12.9l-3.8-3.8a1.2 1.2 0 0 1 0-1.7z" /></svg>
export const IconClose = () => <svg {...S} fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
