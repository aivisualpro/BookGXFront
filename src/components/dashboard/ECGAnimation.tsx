// import React from 'react';

// interface ECGAnimationProps {
//   color?: string;
//   size?: number;
//   isHealthy?: boolean;
// }

// export function ECGAnimation({ color = "currentColor", size = 20, isHealthy = true }: ECGAnimationProps) {
//   const baseColor = isHealthy ? "#10b981" : "#ef4444"; // green for healthy, red for unhealthy
  
//   return (
//     <svg 
//       width={size} 
//       height={size * 1.5} 
//       viewBox="0 0 100 36" 
//       fill="none" 
//       stroke={baseColor}
//       strokeWidth="2.5"
//       className="ecg-animation"
//     >
//       {/* Baseline */}
//       <path 
//         d="M0 18 L100 18" 
//         stroke={baseColor}
//         strokeWidth="1"
//         opacity="0.3"
//       />
      
//       {/* Main ECG Line with Irregular Pattern */}
//       <path 
//         d="M0 18 L5 18 L8 16 L12 20 L15 14 L18 26 L22 8 L25 30 L28 6 L32 32 L35 4 L38 34 L42 2 L45 36 L48 0 L52 36 L55 2 L58 34 L62 6 L65 30 L68 8 L72 28 L75 12 L78 24 L82 16 L85 20 L88 18 L92 18 L95 18 L100 18" 
//         strokeLinecap="round" 
//         strokeLinejoin="round"
//         className="ecg-line"
//       />
      
//       {/* Secondary Irregular Spikes */}
//       <path 
//         d="M10 18 L12 22 L14 18 L16 18 L18 18 L20 18 L22 18 L24 18 L26 18 L28 18 L30 18 L32 18 L34 18 L36 18 L38 18 L40 18 L42 18 L44 18 L46 18 L48 18 L50 18 L52 18 L54 18 L56 18 L58 18 L60 18 L62 18 L64 18 L66 18 L68 18 L70 18 L72 18 L74 18 L76 18 L78 18 L80 18 L82 18 L84 18 L86 18 L88 18 L90 18 L92 18 L94 18 L96 18 L98 18 L100 18" 
//         strokeLinecap="round" 
//         strokeLinejoin="round"
//         className="ecg-line-secondary"
//         opacity="0.7"
//       />
      
//       {/* Chaotic Variations */}
//       <path 
//         d="M15 18 L17 24 L19 18 L21 18 L23 18 L25 18 L27 18 L29 18 L31 18 L33 18 L35 18 L37 18 L39 18 L41 18 L43 18 L45 18 L47 18 L49 18 L51 18 L53 18 L55 18 L57 18 L59 18 L61 18 L63 18 L65 18 L67 18 L69 18 L71 18 L73 18 L75 18 L77 18 L79 18 L81 18 L83 18 L85 18 L87 18 L89 18 L91 18 L93 18 L95 18 L97 18 L99 18" 
//         strokeLinecap="round" 
//         strokeLinejoin="round"
//         className="ecg-line-chaotic"
//         opacity="0.5"
//       />
//     </svg>
//   );
// } 