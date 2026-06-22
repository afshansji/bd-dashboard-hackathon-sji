/**
 * Validates if a string is a valid URL
 * @param url - The URL string to validate
 * @returns true if valid, false otherwise
 */
export function isValidUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  
  // Remove whitespace
  url = url.trim();
  
  // Check if it's empty or contains only placeholder text
  if (!url || url.length < 4) return false;
  
  // Reject common placeholder patterns
  const placeholderPatterns = [
    /^url\*\*$/i,
    /^\[url\]/i,
    /^<url>/i,
    /^website$/i,
    /^n\/?a$/i,
    /^none$/i,
    /^tbd$/i,
    /^pending$/i,
    /^\*+$/,
    /^-+$/,
    /^_+$/,
  ];
  
  if (placeholderPatterns.some(pattern => pattern.test(url))) {
    return false;
  }
  
  // Try to parse as URL
  try {
    // Add protocol if missing for validation
    const urlWithProtocol = url.startsWith('http://') || url.startsWith('https://') 
      ? url 
      : `https://${url}`;
    
    const parsed = new URL(urlWithProtocol);
    
    // Check if it has a valid domain structure
    const hostname = parsed.hostname;
    
    // Must have at least one dot and valid characters
    if (!hostname.includes('.') || hostname.length < 4) {
      return false;
    }
    
    // Reject localhost and invalid domains
    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return false;
    }
    
    // Check for valid TLD (at least 2 characters after the last dot)
    const parts = hostname.split('.');
    const tld = parts[parts.length - 1];
    if (tld.length < 2 || !/^[a-z]{2,}$/i.test(tld)) {
      return false;
    }
    
    return true;
  } catch {
    return false;
  }
}

/**
 * Ensures a URL has a proper protocol
 * @param url - The URL to format
 * @returns Formatted URL with protocol
 */
export function ensureUrlProtocol(url: string): string {
  if (!url) return '';
  
  url = url.trim();
  
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }
  
  return `https://${url}`;
}

/**
 * Gets a valid URL or null
 * @param url - The URL to validate and format
 * @returns Valid URL with protocol or null
 */
export function getValidUrl(url: string | null | undefined): string | null {
  if (!isValidUrl(url)) return null;
  return ensureUrlProtocol(url!);
}
