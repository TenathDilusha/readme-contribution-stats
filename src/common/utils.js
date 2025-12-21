export function makeErrorSvg(message) {
  return `
  <svg width="400" height="60" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#f8d7da" rx="5"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="Arial" font-size="14" fill="#721c24">${message}</text>
  </svg>`;
}

export function kFormatter(num) {
  return Math.abs(num) > 999 
    ? Math.sign(num)*((Math.abs(num)/1000).toFixed(1)) + 'k' 
    : Math.sign(num)*Math.abs(num);
}